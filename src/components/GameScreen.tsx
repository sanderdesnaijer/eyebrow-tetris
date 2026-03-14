"use client";

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TetrisOverlay,
  type TetrisOverlayRef,
  type GameStats,
  type InputMode,
  TETRIS_COLORS,
} from "./TetrisOverlay";
import { TutorialOverlay, hasSeenTutorial } from "./TutorialOverlay";

const MEDIAPIPE_NOISE_RE = /^\s*(INFO: |[IW]\d{4} |Graph successfully started)/;

let mediaPipeLogFilterInstalled = false;

function installMediaPipeLogFilter() {
  if (mediaPipeLogFilterInstalled) return;
  mediaPipeLogFilterInstalled = true;

  const origError = console.error;
  const origWarn = console.warn;

  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && MEDIAPIPE_NOISE_RE.test(args[0])) return;
    origError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && MEDIAPIPE_NOISE_RE.test(args[0])) return;
    origWarn.apply(console, args);
  };
}

const FACE_DETECTION_INTERVAL_MS = 50;
const MOUTH_OPEN_THRESHOLD = 0.42;
const EYEBROW_RAISED_THRESHOLD = 0.3;

// Landmark-based brow detection threshold (ratio of brow lift to face height)
// Higher value = less sensitive (requires more obvious brow raise)
const BROW_LIFT_THRESHOLD = 0.025;
// Hysteresis: once raised, brow must drop below this to count as "neutral" again
const BROW_LOWER_THRESHOLD = 0.018;

function getBlendshapeScore(
  classifications:
    | { categories: { categoryName: string; score: number }[] }
    | undefined,
  name: string,
): number {
  if (!classifications?.categories) return 0;
  const b = classifications.categories.find((x) => x.categoryName === name);
  return b?.score ?? 0;
}

interface GameScreenProps {
  onGameOver?: (stats: GameStats) => void;
  onExit?: () => void;
}

type FaceLandmark = { x: number; y: number; z: number };

// Lip contour landmarks that closely follow the actual lip edges
// Upper outer lip: left corner -> top -> right corner
const UPPER_OUTER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
// Lower outer lip: right corner -> bottom -> left corner (to complete the loop)
const LOWER_OUTER_LIP = [291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];
// Full mouth outline (closed loop)
const MOUTH_OUTER_INDICES = [...UPPER_OUTER_LIP, ...LOWER_OUTER_LIP.slice(1)];
const LEFT_BROW_INDICES = [70, 63, 105, 66, 107];
const RIGHT_BROW_INDICES = [300, 293, 334, 296, 336];

// Outer brow landmarks (near the temples/ears) - these move the most when raising a single brow
const LEFT_OUTER_BROW_IDX = 70; // Leftmost point of left eyebrow
const RIGHT_OUTER_BROW_IDX = 300; // Rightmost point of right eyebrow

// Reference landmarks for measuring brow lift (outer eye corners)
const LEFT_EYE_OUTER_IDX = 33; // Outer corner of left eye
const RIGHT_EYE_OUTER_IDX = 263; // Outer corner of right eye

// For face height normalization
const NOSE_TIP_IDX = 4;
const FOREHEAD_IDX = 10;

// Eye landmarks for googly eyes
const LEFT_EYE_TOP_IDX = 159;
const LEFT_EYE_BOTTOM_IDX = 145;
const LEFT_EYE_INNER_IDX = 133;
const LEFT_EYE_OUTER_IDX_ALT = 33;
const RIGHT_EYE_TOP_IDX = 386;
const RIGHT_EYE_BOTTOM_IDX = 374;
const RIGHT_EYE_INNER_IDX = 362;
const RIGHT_EYE_OUTER_IDX_ALT = 263;

export function GameScreen({ onGameOver, onExit }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastFaceDetectionAtRef = useRef<number>(0);
  const tetrisRef = useRef<TetrisOverlayRef | null>(null);
  const lastFaceSeenAtRef = useRef<number>(0);
  const prevLeftBrowRef = useRef(false);
  const prevRightBrowRef = useRef(false);
  const prevMouthOpenRef = useRef(false);

  // Soft drop timing refs for mouth-based control
  const mouthOpenStartRef = useRef<number | null>(null);
  const lastSoftDropRef = useRef<number>(0);
  const hardDropTriggeredRef = useRef(false);

  // Baseline brow positions (established when face is neutral)
  const leftBrowBaselineRef = useRef<number | null>(null);
  const rightBrowBaselineRef = useRef<number | null>(null);
  const baselineFrameCountRef = useRef(0);

  const [status, setStatus] = useState<
    "idle" | "requesting" | "loading" | "ready" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [mouthOpen, setMouthOpen] = useState(false);
  const [leftBrowRaised, setLeftBrowRaised] = useState(false);
  const [rightBrowRaised, setRightBrowRaised] = useState(false);
  const [faceLost, setFaceLost] = useState(false);
  const [faceLandmarks, setFaceLandmarks] = useState<FaceLandmark[] | null>(
    null,
  );
  const [showCalibration, setShowCalibration] = useState(false);
  const [blendshapeScores, setBlendshapeScores] = useState({
    browOuterUpLeft: 0,
    browOuterUpRight: 0,
    browInnerUp: 0,
    mouthRatio: 0,
  });
  const [landmarkScores, setLandmarkScores] = useState({
    leftBrowLift: 0,
    rightBrowLift: 0,
    leftBrowBaseline: null as number | null,
    rightBrowBaseline: null as number | null,
  });
  const [lineClearFlash, setLineClearFlash] = useState<{
    active: boolean;
    intensity: number;
    linesCleared: number;
  }>({ active: false, intensity: 1, linesCleared: 0 });
  const [showGooglyEyes, setShowGooglyEyes] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [keyboardLeftBrow, setKeyboardLeftBrow] = useState(false);
  const [keyboardRightBrow, setKeyboardRightBrow] = useState(false);
  const [keyboardMouthOpen, setKeyboardMouthOpen] = useState(false);
  const [stackDanger, setStackDanger] = useState({
    isInDanger: false,
    dangerLevel: 0,
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("eyebrow");
  const inputModeRef = useRef<InputMode>("eyebrow");
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("eyebrow-tetris-muted") === "true";
  });
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem("eyebrow-tetris-muted", String(next));
      return next;
    });
  }, []);
  const googlyPupilRef = useRef({
    leftX: 0,
    leftY: 0,
    leftVelX: 0,
    leftVelY: 0,
    rightX: 0,
    rightY: 0,
    rightVelX: 0,
    rightVelY: 0,
    lastTime: Date.now(),
  });
  const faceRotationRef = useRef({ pitch: 0, yaw: 0 });
  const facePosRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });
  const isStartingRef = useRef(false);

  // Eyebrow physics state for the "Next Piece" block balancing on brows
  const browPhysicsRef = useRef({
    // Position and velocity
    rotation: 0, // Current rotation angle
    rotationVel: 0, // Angular velocity
    yOffset: 0, // Vertical bounce offset
    yVel: 0, // Vertical velocity
    wobble: 0, // Extra wobble amount
    // Previous brow positions for velocity calculation
    prevLeftY: 0,
    prevRightY: 0,
    leftLiftVel: 0, // How fast left brow is moving
    rightLiftVel: 0, // How fast right brow is moving
    lastTime: Date.now(),
    // Spin state for wild spinning
    spinAccumulator: 0,
    isSpinning: false,
    frameCount: 0,
  });

  // Hard drop reaction bubble state
  const [hardDropReaction, setHardDropReaction] = useState<{
    active: boolean;
    word: string;
    startTime: number;
  } | null>(null);

  const HARD_DROP_WORDS = [
    "THUMP!",
    "BOOM!",
    "WHAM!",
    "BAM!",
    "SLAM!",
    "POW!",
    "CRASH!",
    "BONK!",
    "SPLAT!",
  ];

  const triggerHardDropReaction = useCallback(() => {
    const word =
      HARD_DROP_WORDS[Math.floor(Math.random() * HARD_DROP_WORDS.length)];
    setHardDropReaction({
      active: true,
      word,
      startTime: Date.now(),
    });
    setTimeout(() => setHardDropReaction(null), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLineClearText = (lines: number): string => {
    if (lines === 4) return "TETRIS!";
    if (lines === 3) return "TRIPLE!";
    if (lines === 2) return "DOUBLE!";
    return "LINE!";
  };

  const handleLineClear = useCallback((linesCleared: number) => {
    const intensity = Math.min(linesCleared, 4);
    setLineClearFlash({ active: true, intensity, linesCleared });
    setTimeout(
      () => setLineClearFlash({ active: false, intensity: 1, linesCleared: 0 }),
      800,
    );
  }, []);

  const stopEverything = useCallback(() => {
    isStartingRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
    setMouthOpen(false);
    setLeftBrowRaised(false);
    setRightBrowRaised(false);
    setFaceLost(false);
    setFaceLandmarks(null);
  }, []);

  const drawFaceOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!faceLandmarks) return;

    const drawLandmarkGroup = (
      indices: number[],
      isActive: boolean,
      closePath = false,
      isMouth = false,
    ) => {
      const color = isMouth
        ? isActive
          ? "#22c55e"
          : "rgba(255,61,127,0.4)"
        : isActive
          ? "#22c55e"
          : "rgba(0,229,255,0.35)";
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;

      ctx.beginPath();
      indices.forEach((i, idx) => {
        const point = faceLandmarks[i];
        if (point) {
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          if (idx === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      if (closePath) {
        ctx.closePath();
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      indices.forEach((i) => {
        const point = faceLandmarks[i];
        if (point) {
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    };

    // Note: Video is mirrored, so MediaPipe's LEFT_BROW_INDICES appear on the right
    // side of the screen (user's right brow), and vice versa
    if (showLandmarks) {
      drawLandmarkGroup(LEFT_BROW_INDICES, rightBrowRaised, false, false);
      drawLandmarkGroup(RIGHT_BROW_INDICES, leftBrowRaised, false, false);
      drawLandmarkGroup(MOUTH_OUTER_INDICES, mouthOpen, true, true);

      // Highlight the specific outer brow detection points with larger markers
      const highlightDetectionPoint = (idx: number, isActive: boolean) => {
        const point = faceLandmarks[idx];
        if (point) {
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = isActive ? "#22c55e" : "#FF9A00";
          ctx.strokeStyle = isActive ? "#22c55e" : "#FF9A00";
          ctx.lineWidth = 1;
          ctx.shadowColor = isActive ? "#22c55e" : "#FF9A00";
          ctx.shadowBlur = 3;
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      };

      // Left outer brow point (appears on right side of mirrored video)
      highlightDetectionPoint(LEFT_OUTER_BROW_IDX, rightBrowRaised);
      // Right outer brow point (appears on left side of mirrored video)
      highlightDetectionPoint(RIGHT_OUTER_BROW_IDX, leftBrowRaised);
    }

    // Next Piece balancing on eyebrows with physics!
    // The piece sits on your brows and reacts to how you raise them
    const nextPiece = tetrisRef.current?.getCurrentPiece?.();

    // Get both eyebrow positions
    const leftBrowOuter = faceLandmarks[LEFT_OUTER_BROW_IDX];
    const rightBrowOuter = faceLandmarks[RIGHT_OUTER_BROW_IDX];
    const leftBrowCenter = faceLandmarks[LEFT_BROW_INDICES[2]];
    const rightBrowCenter = faceLandmarks[RIGHT_BROW_INDICES[2]];

    if (
      leftBrowOuter &&
      rightBrowOuter &&
      leftBrowCenter &&
      rightBrowCenter &&
      nextPiece
    ) {
      const physics = browPhysicsRef.current;
      const now = Date.now();
      const dt = Math.min((now - physics.lastTime) / 1000, 0.05);
      physics.lastTime = now;

      // Get brow Y positions (normalized)
      // Note: Video is mirrored, so MediaPipe's left = screen right = user's right
      const leftBrowY = rightBrowOuter.y; // User's left brow (MediaPipe right)
      const rightBrowY = leftBrowOuter.y; // User's right brow (MediaPipe left)

      // Calculate brow lift velocities (how fast brows are moving)
      const leftLiftVel = (physics.prevLeftY - leftBrowY) / Math.max(dt, 0.001);
      const rightLiftVel =
        (physics.prevRightY - rightBrowY) / Math.max(dt, 0.001);

      // Smooth the velocities - favor raw velocity for snappier response
      physics.leftLiftVel = physics.leftLiftVel * 0.3 + leftLiftVel * 0.7;
      physics.rightLiftVel = physics.rightLiftVel * 0.3 + rightLiftVel * 0.7;

      physics.prevLeftY = leftBrowY;
      physics.prevRightY = rightBrowY;
      physics.frameCount++;

      // Impulse on sudden brow movement for extra "pop"
      const velChange =
        Math.abs(leftLiftVel - physics.leftLiftVel) +
        Math.abs(rightLiftVel - physics.rightLiftVel);
      if (velChange > 3) {
        physics.yVel -= velChange * 8; // Quick upward pop when brows jump
      }

      // Calculate the tilt based on height difference between brows
      const browHeightDiff = (rightBrowY - leftBrowY) * canvas.height;
      let targetTilt = browHeightDiff * 0.05; // Convert to rotation

      // Add keyboard-triggered tilt for accessibility
      if (keyboardLeftBrow && !keyboardRightBrow) {
        targetTilt += 0.3; // Tilt right when left key pressed (piece moves left)
      } else if (keyboardRightBrow && !keyboardLeftBrow) {
        targetTilt -= 0.3; // Tilt left when right key pressed (piece moves right)
      }

      // Calculate average brow height for vertical bounce
      const avgBrowLift = (physics.leftLiftVel + physics.rightLiftVel) / 2;

      // Detect fast movements for wild spinning
      // Skip the first few frames so initial face-detection jitter doesn't
      // immediately trigger a spin when the game starts.
      const combinedVelocity =
        Math.abs(physics.leftLiftVel) + Math.abs(physics.rightLiftVel);
      const velocityThreshold = 2;
      const stabilised = physics.frameCount > 10;

      if (stabilised && combinedVelocity > velocityThreshold) {
        physics.spinAccumulator += combinedVelocity * dt * 5;
        if (physics.spinAccumulator > 3) {
          physics.isSpinning = true;
        }
      } else {
        physics.spinAccumulator *= 0.9;
      }

      // Physics simulation
      if (physics.isSpinning) {
        // Wild spinning mode!
        const spinDirection =
          physics.leftLiftVel > physics.rightLiftVel ? 1 : -1;
        physics.rotationVel += spinDirection * combinedVelocity * dt * 15;
        physics.rotationVel *= 0.95; // Friction
        physics.rotation += physics.rotationVel * dt;

        // Extra wobble during spin
        physics.wobble = Math.sin(now * 0.02) * 0.3;

        // Stop spinning when rotation velocity dies down
        if (
          Math.abs(physics.rotationVel) < 0.5 &&
          combinedVelocity < velocityThreshold * 0.5
        ) {
          physics.isSpinning = false;
          physics.spinAccumulator = 0;
        }
      } else {
        // Normal balancing mode
        // Spring physics for rotation - snappier with more elastic overshoot
        const rotationSpring = 12;
        const rotationDamping = 0.75;

        physics.rotationVel +=
          (targetTilt - physics.rotation) * rotationSpring * dt;
        physics.rotationVel *= rotationDamping;
        physics.rotation += physics.rotationVel;

        // Add wobble from fast brow movements
        physics.wobble =
          Math.sin(now * 0.015) * Math.min(0.2, combinedVelocity * 0.05);
      }

      // Vertical bounce physics - elastic and jumpy!
      const bounceForce = avgBrowLift * 2000; // Strong bounce from brow velocity
      physics.yVel += bounceForce * dt;
      physics.yVel += -physics.yOffset * 70 * dt; // Strong spring for snappy return
      physics.yVel *= 0.72; // Less damping = more overshoot, bouncier feel
      physics.yOffset += physics.yVel * dt;
      physics.yOffset = Math.max(-60, Math.min(40, physics.yOffset)); // Clamp with more range

      // Calculate position between eyebrows
      // Use MediaPipe indices correctly for mirrored video
      const centerX =
        ((leftBrowCenter.x + rightBrowCenter.x) / 2) * canvas.width;
      const centerY =
        ((leftBrowCenter.y + rightBrowCenter.y) / 2) * canvas.height;

      // Calculate block size based on face
      const browDistance =
        Math.abs(rightBrowCenter.x - leftBrowCenter.x) * canvas.width;
      const cellSize = Math.max(12, Math.min(24, browDistance / 5));

      // Get the next piece shape and color
      const shape = nextPiece.shape;
      const color = TETRIS_COLORS[nextPiece.color];

      const blockWidth = shape[0].length * cellSize;
      const blockHeight = shape.length * cellSize;

      // Position above brows with physics offset
      const posY = centerY - blockHeight - cellSize * 1.5 + physics.yOffset;

      ctx.save();
      ctx.translate(centerX, posY);

      // Apply rotation with wobble
      const totalRotation = physics.rotation + physics.wobble;
      ctx.rotate(totalRotation);

      // Squash/stretch effect based on vertical velocity for bouncy feel
      const squashStretch = Math.min(Math.abs(physics.yVel) * 0.005, 0.35);
      const isGoingUp = physics.yVel < 0;
      const scaleX = isGoingUp
        ? 1 - squashStretch * 0.5
        : 1 + squashStretch * 0.6;
      const scaleY = isGoingUp
        ? 1 + squashStretch * 0.8
        : 1 - squashStretch * 0.5;

      // Scale effect when spinning fast
      const spinScale = physics.isSpinning
        ? 1 + Math.abs(physics.rotationVel) * 0.02
        : 1;
      ctx.scale(scaleX * spinScale, scaleY * spinScale);

      // Draw the Tetris piece
      ctx.globalAlpha = physics.isSpinning ? 0.85 : 0.95;

      shape.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell) {
            const bx = colIdx * cellSize - blockWidth / 2;
            const by = rowIdx * cellSize - blockHeight / 2;

            // Main block color
            ctx.fillStyle = color;
            ctx.fillRect(bx, by, cellSize - 2, cellSize - 2);

            // Highlight (top-left edges)
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.fillRect(bx, by, cellSize - 2, 3);
            ctx.fillRect(bx, by, 3, cellSize - 2);

            // Shadow (bottom-right edges)
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(bx, by + cellSize - 5, cellSize - 2, 3);
            ctx.fillRect(bx + cellSize - 5, by, 3, cellSize - 2);
          }
        });
      });

      // Draw spin effect lines when spinning wildly
      if (physics.isSpinning && Math.abs(physics.rotationVel) > 2) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const spinLines = 6;
        for (let i = 0; i < spinLines; i++) {
          const angle = (i / spinLines) * Math.PI * 2 + physics.rotation * 2;
          const innerR = Math.max(blockWidth, blockHeight) * 0.3;
          const outerR = Math.max(blockWidth, blockHeight) * 0.7;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
          ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Draw "WHOA!" text when spinning really fast
      if (physics.isSpinning && Math.abs(physics.rotationVel) > 5) {
        ctx.save();
        ctx.font = `bold ${cellSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffeb3b";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        const wobbleX = Math.sin(now * 0.03) * 10;
        ctx.strokeText("WHOA!", centerX + wobbleX, posY - cellSize);
        ctx.fillText("WHOA!", centerX + wobbleX, posY - cellSize);
        ctx.restore();
      }
    }

    // Draw anime sweat drops when stack is high
    if (stackDanger.isInDanger) {
      const dangerInfo = stackDanger;
      const drawSweatDrop = (
        x: number,
        y: number,
        size: number,
        animOffset: number,
      ) => {
        // Animate the drop falling
        const time = Date.now() / 1000;
        const cycle = ((time + animOffset) % 1.2) / 1.2; // 1.2 second cycle

        // Drop appears, falls, then fades
        let opacity = 1;
        let offsetY = 0;
        let scale = 1;

        if (cycle < 0.15) {
          // Appear phase
          opacity = cycle / 0.15;
          scale = 0.8 + 0.2 * (cycle / 0.15);
        } else if (cycle < 0.7) {
          // Fall phase
          offsetY = ((cycle - 0.15) / 0.55) * size * 1.5;
          opacity = 1;
          scale = 1;
        } else {
          // Fade phase
          const fadeProgress = (cycle - 0.7) / 0.3;
          offsetY = size * 1.5 + fadeProgress * size * 0.5;
          opacity = 1 - fadeProgress;
          scale = 1 - fadeProgress * 0.4;
        }

        ctx.save();
        ctx.translate(x, y + offsetY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity * (0.7 + dangerInfo.dangerLevel * 0.3);

        // Create gradient for the drop
        const gradient = ctx.createLinearGradient(
          -size / 2,
          -size,
          size / 2,
          size,
        );
        gradient.addColorStop(0, "#93c5fd");
        gradient.addColorStop(0.5, "#3b82f6");
        gradient.addColorStop(1, "#1d4ed8");

        // Draw teardrop shape
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.bezierCurveTo(
          size * 0.6,
          -size * 0.3,
          size * 0.6,
          size * 0.5,
          0,
          size,
        );
        ctx.bezierCurveTo(
          -size * 0.6,
          size * 0.5,
          -size * 0.6,
          -size * 0.3,
          0,
          -size,
        );
        ctx.fillStyle = gradient;
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.ellipse(
          -size * 0.15,
          -size * 0.2,
          size * 0.2,
          size * 0.15,
          -0.3,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fill();

        ctx.restore();
      };

      // Get face landmarks for sweat drop placement all over the face
      const forehead = faceLandmarks[FOREHEAD_IDX];
      const noseTip = faceLandmarks[NOSE_TIP_IDX];
      const leftTemple = faceLandmarks[234];
      const rightTemple = faceLandmarks[454];
      const leftCheek = faceLandmarks[116];
      const rightCheek = faceLandmarks[345];
      const leftJaw = faceLandmarks[132];
      const rightJaw = faceLandmarks[361];
      const chin = faceLandmarks[152];
      const leftBrowOuter = faceLandmarks[70];
      const rightBrowOuter = faceLandmarks[300];

      if (forehead && noseTip && leftTemple && rightTemple) {
        const faceHeight = Math.abs(noseTip.y - forehead.y) * canvas.height;
        const faceWidth = Math.abs(rightTemple.x - leftTemple.x) * canvas.width;
        const baseDropSize = faceHeight * 0.08;

        // Define sweat drop positions across the face
        // Each entry: [landmark, offsetX ratio, offsetY ratio, size multiplier, anim offset]
        type SweatConfig = [
          typeof forehead | undefined,
          number,
          number,
          number,
          number,
        ];

        const sweatPositions: SweatConfig[] = [
          // Forehead drops
          [forehead, -0.15, 0.05, 1.0, 0],
          [forehead, 0.15, 0.08, 0.85, 0.3],
          [forehead, 0, 0.12, 0.7, 0.6],

          // Temple/side of head drops (classic anime position)
          [leftTemple, -0.02, -0.05, 1.2, 0.1],
          [rightTemple, 0.02, -0.05, 1.2, 0.5],

          // Near eyebrows
          [leftBrowOuter, -0.03, -0.02, 0.8, 0.2],
          [rightBrowOuter, 0.03, -0.02, 0.8, 0.7],

          // Cheek drops
          [leftCheek, -0.02, 0.02, 0.9, 0.35],
          [rightCheek, 0.02, 0.02, 0.9, 0.85],
        ];

        // Add more drops based on danger level
        if (dangerInfo.dangerLevel > 0.2) {
          sweatPositions.push(
            [leftTemple, -0.04, 0.08, 0.7, 0.15],
            [rightTemple, 0.04, 0.08, 0.7, 0.65],
            [forehead, -0.25, 0.1, 0.6, 0.4],
            [forehead, 0.25, 0.1, 0.6, 0.9],
          );
        }

        if (dangerInfo.dangerLevel > 0.4) {
          sweatPositions.push(
            [leftJaw, -0.01, 0, 0.75, 0.25],
            [rightJaw, 0.01, 0, 0.75, 0.75],
            [leftCheek, -0.05, 0.06, 0.6, 0.45],
            [rightCheek, 0.05, 0.06, 0.6, 0.95],
            [forehead, -0.08, 0.02, 0.55, 0.55],
          );
        }

        if (dangerInfo.dangerLevel > 0.6) {
          sweatPositions.push(
            [chin, -0.05, -0.02, 0.65, 0.32],
            [chin, 0.05, -0.02, 0.65, 0.82],
            [leftJaw, -0.03, 0.05, 0.5, 0.42],
            [rightJaw, 0.03, 0.05, 0.5, 0.92],
            [leftBrowOuter, -0.06, 0.03, 0.55, 0.52],
            [rightBrowOuter, 0.06, 0.03, 0.55, 0.02],
            [forehead, 0.08, 0.02, 0.5, 0.62],
          );
        }

        if (dangerInfo.dangerLevel > 0.8) {
          sweatPositions.push(
            [leftTemple, -0.06, 0.15, 0.5, 0.12],
            [rightTemple, 0.06, 0.15, 0.5, 0.62],
            [leftCheek, -0.08, 0.1, 0.45, 0.22],
            [rightCheek, 0.08, 0.1, 0.45, 0.72],
            [chin, 0, 0.02, 0.5, 0.37],
            [forehead, -0.2, 0.15, 0.4, 0.47],
            [forehead, 0.2, 0.15, 0.4, 0.97],
          );
        }

        // Draw all sweat drops
        for (const [
          landmark,
          offsetXRatio,
          offsetYRatio,
          sizeMult,
          animOffset,
        ] of sweatPositions) {
          if (landmark) {
            const x = landmark.x * canvas.width + offsetXRatio * faceWidth;
            const y = landmark.y * canvas.height + offsetYRatio * faceHeight;
            const size = baseDropSize * sizeMult;
            drawSweatDrop(x, y, size, animOffset);
          }
        }
      }
    }

    // Draw hard drop reaction bubble from mouth
    if (hardDropReaction?.active && faceLandmarks) {
      const mouthCenter = faceLandmarks[13]; // Upper lip center
      const mouthLeft = faceLandmarks[61];
      const mouthRight = faceLandmarks[291];

      if (mouthCenter && mouthLeft && mouthRight) {
        const mouthX = mouthCenter.x * canvas.width;
        const mouthY = mouthCenter.y * canvas.height;
        const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x) * canvas.width;

        // Calculate animation progress (0 to 1)
        const elapsed = Date.now() - hardDropReaction.startTime;
        const progress = Math.min(elapsed / 600, 1);

        // Bubble grows quickly then shrinks
        const scaleProgress =
          progress < 0.3
            ? progress / 0.3 // Grow phase
            : 1 - ((progress - 0.3) / 0.7) * 0.3; // Slight shrink phase

        // Opacity fades out at the end
        const opacity = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;

        // Random offset direction (seeded by word)
        const wordSeed = hardDropReaction.word.charCodeAt(0);
        const offsetAngle = ((wordSeed % 6) - 3) * 0.2; // Smaller angle variation
        const bubbleDistance =
          mouthWidth * 1.2 + mouthWidth * scaleProgress * 0.5;

        // Position bubble coming out of mouth, going DOWN and slightly to the side
        const bubbleX = mouthX + Math.sin(offsetAngle) * bubbleDistance;
        const bubbleY =
          mouthY + Math.cos(offsetAngle) * bubbleDistance + mouthWidth * 0.5;

        // Size based on mouth width (smaller)
        const bubbleSize = mouthWidth * (0.9 + scaleProgress * 0.3);

        ctx.save();
        ctx.globalAlpha = opacity;

        // Flip horizontally to counter the canvas mirror transform
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        // Recalculate positions for flipped context
        const flippedMouthX = canvas.width - mouthX;
        const flippedBubbleX = canvas.width - bubbleX;

        // Draw speech bubble tail (triangle pointing up to mouth)
        ctx.beginPath();
        ctx.moveTo(flippedMouthX, mouthY + mouthWidth * 0.2);
        ctx.lineTo(
          flippedBubbleX - bubbleSize * 0.15,
          bubbleY - bubbleSize * 0.25,
        );
        ctx.lineTo(
          flippedBubbleX + bubbleSize * 0.08,
          bubbleY - bubbleSize * 0.28,
        );
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw spiky burst bubble
        const spikes = 10;
        const innerRadius = bubbleSize * 0.7;
        const outerRadius = bubbleSize;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = flippedBubbleX + Math.cos(angle) * radius;
          const y = bubbleY + Math.sin(angle) * radius;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Yellow fill with white inner
        ctx.fillStyle = "#ffeb3b";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner white burst
        ctx.beginPath();
        const innerBurstRadius = bubbleSize * 0.55;
        const innerBurstInner = bubbleSize * 0.4;
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const radius = i % 2 === 0 ? innerBurstRadius : innerBurstInner;
          const x = flippedBubbleX + Math.cos(angle) * radius;
          const y = bubbleY + Math.sin(angle) * radius;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Draw text (smaller)
        const fontSize = Math.max(10, bubbleSize * 0.32);
        ctx.font = `900 ${fontSize}px "Comic Sans MS", "Chalkboard SE", cursive`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Text shadow for comic effect
        ctx.fillStyle = "#ff0066";
        ctx.fillText(hardDropReaction.word, flippedBubbleX + 1, bubbleY + 1);
        ctx.fillStyle = "#00ffff";
        ctx.fillText(hardDropReaction.word, flippedBubbleX - 1, bubbleY - 1);
        ctx.fillStyle = "#000000";
        ctx.fillText(hardDropReaction.word, flippedBubbleX, bubbleY);

        ctx.restore();
      }
    }

    // Draw googly eyes if enabled
    if (showGooglyEyes) {
      const drawGooglyEye = (
        centerX: number,
        centerY: number,
        eyeWidth: number,
        eyeHeight: number,
        pupilOffsetX: number,
        pupilOffsetY: number,
      ) => {
        const radius = Math.max(eyeWidth, eyeHeight) * 0.75;

        // White of the eye (sclera)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Pupil - follows the iris position with some physics-like delay
        const pupilRadius = radius * 0.45;
        const maxPupilOffset = radius - pupilRadius - 4;

        // Clamp pupil position to stay inside the eye
        const offsetMagnitude = Math.sqrt(
          pupilOffsetX * pupilOffsetX + pupilOffsetY * pupilOffsetY,
        );
        let clampedOffsetX = pupilOffsetX;
        let clampedOffsetY = pupilOffsetY;
        if (offsetMagnitude > maxPupilOffset) {
          const scale = maxPupilOffset / offsetMagnitude;
          clampedOffsetX *= scale;
          clampedOffsetY *= scale;
        }

        const pupilX = centerX + clampedOffsetX;
        const pupilY = centerY + clampedOffsetY;

        // Black pupil
        ctx.beginPath();
        ctx.arc(pupilX, pupilY, pupilRadius, 0, 2 * Math.PI);
        ctx.fillStyle = "#000000";
        ctx.fill();

        // Highlight reflection
        ctx.beginPath();
        ctx.arc(
          pupilX - pupilRadius * 0.3,
          pupilY - pupilRadius * 0.3,
          pupilRadius * 0.25,
          0,
          2 * Math.PI,
        );
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      };

      // Get eye positions from landmarks
      const leftEyeTop = faceLandmarks[LEFT_EYE_TOP_IDX];
      const leftEyeBottom = faceLandmarks[LEFT_EYE_BOTTOM_IDX];
      const leftEyeInner = faceLandmarks[LEFT_EYE_INNER_IDX];
      const leftEyeOuter = faceLandmarks[LEFT_EYE_OUTER_IDX_ALT];

      const rightEyeTop = faceLandmarks[RIGHT_EYE_TOP_IDX];
      const rightEyeBottom = faceLandmarks[RIGHT_EYE_BOTTOM_IDX];
      const rightEyeInner = faceLandmarks[RIGHT_EYE_INNER_IDX];
      const rightEyeOuter = faceLandmarks[RIGHT_EYE_OUTER_IDX_ALT];

      if (
        leftEyeTop &&
        leftEyeBottom &&
        leftEyeInner &&
        leftEyeOuter &&
        rightEyeTop &&
        rightEyeBottom &&
        rightEyeInner &&
        rightEyeOuter
      ) {
        // Calculate eye centers
        const leftCenterX =
          ((leftEyeInner.x + leftEyeOuter.x) / 2) * canvas.width;
        const leftCenterY =
          ((leftEyeTop.y + leftEyeBottom.y) / 2) * canvas.height;
        const leftWidth =
          Math.abs(leftEyeOuter.x - leftEyeInner.x) * canvas.width;
        const leftHeight =
          Math.abs(leftEyeBottom.y - leftEyeTop.y) * canvas.height;

        const rightCenterX =
          ((rightEyeInner.x + rightEyeOuter.x) / 2) * canvas.width;
        const rightCenterY =
          ((rightEyeTop.y + rightEyeBottom.y) / 2) * canvas.height;
        const rightWidth =
          Math.abs(rightEyeOuter.x - rightEyeInner.x) * canvas.width;
        const rightHeight =
          Math.abs(rightEyeBottom.y - rightEyeTop.y) * canvas.height;

        // Track face position for movement-based physics
        // Use the center between the eyes as the face position
        const faceCenterX = (leftCenterX + rightCenterX) / 2;
        const faceCenterY = (leftCenterY + rightCenterY) / 2;

        // Calculate face velocity (how fast the face is moving)
        const faceVelX = faceCenterX - facePosRef.current.lastX;
        const faceVelY = faceCenterY - facePosRef.current.lastY;
        facePosRef.current.lastX = faceCenterX;
        facePosRef.current.lastY = faceCenterY;

        // Smooth face velocity to avoid jitter
        facePosRef.current.x += (faceVelX - facePosRef.current.x) * 0.5;
        facePosRef.current.y += (faceVelY - facePosRef.current.y) * 0.5;

        // Calculate face rotation from landmarks for gravity direction
        // Use nose and forehead to estimate pitch (up/down tilt)
        const noseTip = faceLandmarks[NOSE_TIP_IDX];
        const forehead = faceLandmarks[FOREHEAD_IDX];
        // Use left and right eye corners to estimate yaw (left/right turn)
        const leftEyeCorner = faceLandmarks[LEFT_EYE_OUTER_IDX];
        const rightEyeCorner = faceLandmarks[RIGHT_EYE_OUTER_IDX];

        if (noseTip && forehead && leftEyeCorner && rightEyeCorner) {
          // Pitch: positive = looking down, negative = looking up
          const pitch = (noseTip.z - forehead.z) * 5;

          // Yaw: positive = turned right, negative = turned left
          const yaw = (rightEyeCorner.z - leftEyeCorner.z) * 5;

          // Smooth the rotation values
          faceRotationRef.current.pitch +=
            (pitch - faceRotationRef.current.pitch) * 0.3;
          faceRotationRef.current.yaw +=
            (yaw - faceRotationRef.current.yaw) * 0.3;
        }

        // Physics constants
        const gravity = 400; // pixels per second squared (reduced for more movement effect)
        const friction = 0.94; // velocity damping
        const bounciness = 0.5; // energy retained on bounce
        const inertiaStrength = 15; // how much face movement affects pupils
        const eyeRadius = Math.max(leftWidth, leftHeight) * 0.75;
        const pupilRadius = eyeRadius * 0.45;
        const maxOffset = eyeRadius - pupilRadius - 2;

        // Calculate time delta
        const now = Date.now();
        const dt = Math.min(
          (now - googlyPupilRef.current.lastTime) / 1000,
          0.05,
        );
        googlyPupilRef.current.lastTime = now;

        // Gravity direction based on face tilt
        const gravityX = -faceRotationRef.current.yaw * gravity * 0.5;
        const gravityY = gravity * (1 + faceRotationRef.current.pitch * 0.5);

        // Inertia force: when face moves, pupils lag behind (opposite direction)
        // This creates the "sloshing" effect of real googly eyes
        const inertiaX = -facePosRef.current.x * inertiaStrength;
        const inertiaY = -facePosRef.current.y * inertiaStrength;

        // Combined forces: gravity + inertia from face movement
        const totalForceX = gravityX + inertiaX;
        const totalForceY = gravityY + inertiaY;

        // Update velocities with combined forces
        googlyPupilRef.current.leftVelX += totalForceX * dt;
        googlyPupilRef.current.leftVelY += totalForceY * dt;
        googlyPupilRef.current.rightVelX += totalForceX * dt;
        googlyPupilRef.current.rightVelY += totalForceY * dt;

        // Apply friction
        googlyPupilRef.current.leftVelX *= friction;
        googlyPupilRef.current.leftVelY *= friction;
        googlyPupilRef.current.rightVelX *= friction;
        googlyPupilRef.current.rightVelY *= friction;

        // Update positions
        googlyPupilRef.current.leftX += googlyPupilRef.current.leftVelX * dt;
        googlyPupilRef.current.leftY += googlyPupilRef.current.leftVelY * dt;
        googlyPupilRef.current.rightX += googlyPupilRef.current.rightVelX * dt;
        googlyPupilRef.current.rightY += googlyPupilRef.current.rightVelY * dt;

        // Bounce off the eye boundary (circular constraint)
        const constrainPupil = (
          x: number,
          y: number,
          velX: number,
          velY: number,
        ): { x: number; y: number; velX: number; velY: number } => {
          const dist = Math.sqrt(x * x + y * y);
          if (dist > maxOffset) {
            // Normalize and push back inside
            const nx = x / dist;
            const ny = y / dist;
            x = nx * maxOffset;
            y = ny * maxOffset;

            // Reflect velocity off the circular boundary
            const dotProduct = velX * nx + velY * ny;
            velX = (velX - 2 * dotProduct * nx) * bounciness;
            velY = (velY - 2 * dotProduct * ny) * bounciness;

            // Add some randomness for that chaotic googly feel
            velX += (Math.random() - 0.5) * 50;
            velY += (Math.random() - 0.5) * 50;
          }
          return { x, y, velX, velY };
        };

        const leftConstrained = constrainPupil(
          googlyPupilRef.current.leftX,
          googlyPupilRef.current.leftY,
          googlyPupilRef.current.leftVelX,
          googlyPupilRef.current.leftVelY,
        );
        googlyPupilRef.current.leftX = leftConstrained.x;
        googlyPupilRef.current.leftY = leftConstrained.y;
        googlyPupilRef.current.leftVelX = leftConstrained.velX;
        googlyPupilRef.current.leftVelY = leftConstrained.velY;

        const rightConstrained = constrainPupil(
          googlyPupilRef.current.rightX,
          googlyPupilRef.current.rightY,
          googlyPupilRef.current.rightVelX,
          googlyPupilRef.current.rightVelY,
        );
        googlyPupilRef.current.rightX = rightConstrained.x;
        googlyPupilRef.current.rightY = rightConstrained.y;
        googlyPupilRef.current.rightVelX = rightConstrained.velX;
        googlyPupilRef.current.rightVelY = rightConstrained.velY;

        // Draw the googly eyes
        drawGooglyEye(
          leftCenterX,
          leftCenterY,
          leftWidth,
          leftHeight,
          googlyPupilRef.current.leftX,
          googlyPupilRef.current.leftY,
        );

        drawGooglyEye(
          rightCenterX,
          rightCenterY,
          rightWidth,
          rightHeight,
          googlyPupilRef.current.rightX,
          googlyPupilRef.current.rightY,
        );
      }
    }
  }, [
    faceLandmarks,
    mouthOpen,
    leftBrowRaised,
    rightBrowRaised,
    showGooglyEyes,
    showLandmarks,
    stackDanger,
    hardDropReaction,
    keyboardLeftBrow,
    keyboardRightBrow,
  ]);

  useEffect(() => {
    drawFaceOverlay();
  }, [drawFaceOverlay]);

  // Keyboard controls for accessibility - triggers visual effects when arrow keys are pressed
  useEffect(() => {
    if (status !== "ready") return;

    // Track keyboard soft drop state
    let keyboardDownStartTime: number | null = null;
    let keyboardLastSoftDrop = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Track if keyboard is used for game controls (switches to keyboard mode)
      const gameControlKeys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "a",
        "A",
        "d",
        "D",
        "w",
        "W",
        "s",
        "S",
      ];
      if (
        gameControlKeys.includes(e.key) &&
        inputModeRef.current === "eyebrow"
      ) {
        inputModeRef.current = "keyboard";
        setInputMode("keyboard");
      }

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          setKeyboardLeftBrow(true);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          setKeyboardRightBrow(true);
          break;
        case "ArrowUp":
        case "w":
        case "W":
          setKeyboardLeftBrow(true);
          setKeyboardRightBrow(true);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (!e.repeat) {
            setKeyboardMouthOpen(true);
            keyboardDownStartTime = performance.now();
            tetrisRef.current?.softDrop();
            keyboardLastSoftDrop = performance.now();
          }
          break;
        case " ":
          tetrisRef.current?.hardDrop();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          setKeyboardLeftBrow(false);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          setKeyboardRightBrow(false);
          break;
        case "ArrowUp":
        case "w":
        case "W":
          setKeyboardLeftBrow(false);
          setKeyboardRightBrow(false);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          setKeyboardMouthOpen(false);
          keyboardDownStartTime = null;
          break;
      }
    };

    // Interval for continuous soft drops when holding down
    const softDropTick = () => {
      if (keyboardDownStartTime !== null) {
        const now = performance.now();
        const holdDuration = now - keyboardDownStartTime;
        // Start at 300ms interval, decrease to 50ms as hold duration increases
        const minInterval = 50;
        const maxInterval = 300;
        const accelerationTime = 1500; // Full speed after 1.5 seconds
        const progress = Math.min(holdDuration / accelerationTime, 1);
        const interval = maxInterval - (maxInterval - minInterval) * progress;

        if (now - keyboardLastSoftDrop >= interval) {
          tetrisRef.current?.softDrop();
          keyboardLastSoftDrop = now;
        }
      }
    };

    const intervalId = setInterval(softDropTick, 16); // ~60fps check

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      clearInterval(intervalId);
    };
  }, [status]);

  // Poll the danger level from the Tetris game
  useEffect(() => {
    if (status !== "ready") return;

    const checkDanger = () => {
      const danger = tetrisRef.current?.getDangerLevel?.();
      if (danger) {
        setStackDanger((prev) => {
          if (
            prev.isInDanger !== danger.isInDanger ||
            Math.abs(prev.dangerLevel - danger.dangerLevel) > 0.05
          ) {
            return danger;
          }
          return prev;
        });
      }
    };

    const intervalId = setInterval(checkDanger, 100);
    return () => clearInterval(intervalId);
  }, [status]);

  const handleExit = useCallback(() => {
    stopEverything();
    onExit?.();
  }, [stopEverything, onExit]);

  const handleStart = useCallback(async () => {
    if (!containerRef.current || !videoRef.current) {
      console.warn("GameScreen: refs not ready, retrying...");
      return;
    }

    // Prevent multiple simultaneous starts
    if (isStartingRef.current || streamRef.current) {
      return;
    }
    isStartingRef.current = true;

    setStatus("requesting");
    setErrorMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setStatus("loading");
      installMediaPipeLogFilter();

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );

      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
        runningMode: "VIDEO",
        numFaces: 1,
      });

      faceLandmarkerRef.current = faceLandmarker;
      lastVideoTimeRef.current = -1;
      lastFaceDetectionAtRef.current = 0;

      setStatus("ready");

      if (!hasSeenTutorial()) {
        setShowTutorial(true);
      }

      const runLoop = () => {
        const video = videoRef.current;
        const faceLandmarker = faceLandmarkerRef.current;

        if (!video || !faceLandmarker || streamRef.current === null) {
          return;
        }

        if (
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.currentTime !== lastVideoTimeRef.current
        ) {
          const now = performance.now();
          lastVideoTimeRef.current = video.currentTime;

          if (
            now - lastFaceDetectionAtRef.current >=
            FACE_DETECTION_INTERVAL_MS
          ) {
            lastFaceDetectionAtRef.current = now;

            try {
              const result = faceLandmarker.detectForVideo(video, now);
              const faceLandmarks = result.faceLandmarks?.[0];
              const faceBlendshapes = result.faceBlendshapes?.[0];

              if (faceLandmarks) {
                lastFaceSeenAtRef.current = now;
                setFaceLost(false);
                setFaceLandmarks(faceLandmarks);

                const upperLip = faceLandmarks[13];
                const lowerLip = faceLandmarks[14];
                const leftCorner = faceLandmarks[61];
                const rightCorner = faceLandmarks[291];

                let ratio = 0;
                if (upperLip && lowerLip && leftCorner && rightCorner) {
                  const openDist = Math.hypot(
                    upperLip.x - lowerLip.x,
                    upperLip.y - lowerLip.y,
                  );
                  const mouthWidth = Math.hypot(
                    leftCorner.x - rightCorner.x,
                    leftCorner.y - rightCorner.y,
                  );
                  ratio = openDist / Math.max(mouthWidth, 0.001);
                  setMouthOpen(ratio > MOUTH_OPEN_THRESHOLD);
                }

                const browOuterUpLeft = getBlendshapeScore(
                  faceBlendshapes,
                  "browOuterUpLeft",
                );
                const browOuterUpRight = getBlendshapeScore(
                  faceBlendshapes,
                  "browOuterUpRight",
                );
                const browInnerUp = getBlendshapeScore(
                  faceBlendshapes,
                  "browInnerUp",
                );

                setBlendshapeScores({
                  browOuterUpLeft,
                  browOuterUpRight,
                  browInnerUp,
                  mouthRatio: ratio,
                });

                // Landmark-based brow detection using outer brow points
                const leftOuterBrow = faceLandmarks[LEFT_OUTER_BROW_IDX];
                const rightOuterBrow = faceLandmarks[RIGHT_OUTER_BROW_IDX];
                const leftEyeOuter = faceLandmarks[LEFT_EYE_OUTER_IDX];
                const rightEyeOuter = faceLandmarks[RIGHT_EYE_OUTER_IDX];
                const noseTip = faceLandmarks[NOSE_TIP_IDX];
                const forehead = faceLandmarks[FOREHEAD_IDX];

                let leftBrow = false;
                let rightBrow = false;
                let leftBrowLift = 0;
                let rightBrowLift = 0;

                if (
                  leftOuterBrow &&
                  rightOuterBrow &&
                  leftEyeOuter &&
                  rightEyeOuter &&
                  noseTip &&
                  forehead
                ) {
                  // Calculate face height for normalization
                  const faceHeight = Math.abs(noseTip.y - forehead.y);

                  // Calculate brow-to-eye distance (lower Y = higher on screen = raised brow)
                  // Negative values mean brow is above eye corner
                  const leftBrowToEye = leftOuterBrow.y - leftEyeOuter.y;
                  const rightBrowToEye = rightOuterBrow.y - rightEyeOuter.y;

                  // Normalize by face height
                  const leftBrowRatio = leftBrowToEye / faceHeight;
                  const rightBrowRatio = rightBrowToEye / faceHeight;

                  // Establish baseline during first 30 frames (about 1.5 seconds)
                  if (baselineFrameCountRef.current < 30) {
                    baselineFrameCountRef.current++;
                    if (leftBrowBaselineRef.current === null) {
                      leftBrowBaselineRef.current = leftBrowRatio;
                      rightBrowBaselineRef.current = rightBrowRatio;
                    } else {
                      // Running average for baseline
                      leftBrowBaselineRef.current =
                        leftBrowBaselineRef.current * 0.9 + leftBrowRatio * 0.1;
                      rightBrowBaselineRef.current =
                        rightBrowBaselineRef.current! * 0.9 +
                        rightBrowRatio * 0.1;
                    }
                  }

                  // Calculate lift from baseline (negative = raised)
                  const leftBaseline =
                    leftBrowBaselineRef.current ?? leftBrowRatio;
                  const rightBaseline =
                    rightBrowBaselineRef.current ?? rightBrowRatio;

                  leftBrowLift = leftBaseline - leftBrowRatio; // Positive when raised
                  rightBrowLift = rightBaseline - rightBrowRatio; // Positive when raised

                  // Swap left/right because video is mirrored
                  // MediaPipe's "left" landmarks appear on the RIGHT side of the mirrored video (user's right)
                  // So leftBrowLift from MediaPipe = user's RIGHT brow
                  setLandmarkScores({
                    leftBrowLift: rightBrowLift, // User's left = MediaPipe's right
                    rightBrowLift: leftBrowLift, // User's right = MediaPipe's left
                    leftBrowBaseline: rightBrowBaselineRef.current,
                    rightBrowBaseline: leftBrowBaselineRef.current,
                  });

                  // Detect raised brows using landmark-based measurement with hysteresis (swapped for mirror)
                  // User's left = MediaPipe's right, User's right = MediaPipe's left
                  // Hysteresis: use higher threshold to trigger, lower threshold to release
                  const wasLeftRaised = prevLeftBrowRef.current;
                  const wasRightRaised = prevRightBrowRef.current;

                  leftBrow = wasLeftRaised
                    ? rightBrowLift > BROW_LOWER_THRESHOLD // Already raised: stay raised until below lower threshold
                    : rightBrowLift > BROW_LIFT_THRESHOLD; // Not raised: need to exceed higher threshold
                  rightBrow = wasRightRaised
                    ? leftBrowLift > BROW_LOWER_THRESHOLD // Already raised: stay raised until below lower threshold
                    : leftBrowLift > BROW_LIFT_THRESHOLD; // Not raised: need to exceed higher threshold
                }

                setLeftBrowRaised(leftBrow);
                setRightBrowRaised(rightBrow);

                const prevLeft = prevLeftBrowRef.current;
                const prevRight = prevRightBrowRef.current;
                const prevMouth = prevMouthOpenRef.current;
                const mouthOpenNow = ratio > MOUTH_OPEN_THRESHOLD;

                prevLeftBrowRef.current = leftBrow;
                prevRightBrowRef.current = rightBrow;
                prevMouthOpenRef.current = mouthOpenNow;

                const tetris = tetrisRef.current;
                if (tetris) {
                  // Both brows raised = rotate (only trigger once on transition)
                  const bothBrowsNow = leftBrow && rightBrow;
                  const bothBrowsPrev = prevLeft && prevRight;
                  const allThreeNow = bothBrowsNow && mouthOpenNow;
                  const allThreePrev = bothBrowsPrev && prevMouth;

                  // Hard drop: both brows raised + mouth open (trigger once when combo is first achieved)
                  if (
                    allThreeNow &&
                    !allThreePrev &&
                    !hardDropTriggeredRef.current
                  ) {
                    hardDropTriggeredRef.current = true;
                    tetris.hardDrop();
                  } else if (!allThreeNow) {
                    // Reset hard drop trigger when combo is broken
                    hardDropTriggeredRef.current = false;
                  }

                  // Rotate: both brows raised (without mouth open)
                  if (bothBrowsNow && !bothBrowsPrev && !mouthOpenNow) {
                    tetris.rotate();
                  } else if (leftBrow && !prevLeft && !rightBrow) {
                    // Only left brow raised (and right is not raised) - move left
                    tetris.moveLeft();
                  } else if (rightBrow && !prevRight && !leftBrow) {
                    // Only right brow raised (and left is not raised) - move right
                    tetris.moveRight();
                  }

                  // Soft drop with acceleration when mouth is held open (but not when doing hard drop)
                  if (mouthOpenNow && !bothBrowsNow) {
                    const currentTime = now;

                    if (!prevMouth) {
                      // Mouth just opened - do first soft drop immediately
                      mouthOpenStartRef.current = currentTime;
                      tetris.softDrop();
                      lastSoftDropRef.current = currentTime;
                    } else if (mouthOpenStartRef.current !== null) {
                      // Mouth is being held open - calculate drop interval based on duration
                      const holdDuration =
                        currentTime - mouthOpenStartRef.current;
                      // Start at 300ms interval, decrease to 50ms as hold duration increases
                      // Acceleration curve: faster drops the longer you hold
                      const minInterval = 50;
                      const maxInterval = 300;
                      const accelerationTime = 1500; // Full speed after 1.5 seconds
                      const progress = Math.min(
                        holdDuration / accelerationTime,
                        1,
                      );
                      const interval =
                        maxInterval - (maxInterval - minInterval) * progress;

                      if (currentTime - lastSoftDropRef.current >= interval) {
                        tetris.softDrop();
                        lastSoftDropRef.current = currentTime;
                      }
                    }
                  } else {
                    // Mouth closed or doing hard drop - reset timing
                    mouthOpenStartRef.current = null;
                  }
                }
              } else {
                setMouthOpen(false);
                setLeftBrowRaised(false);
                setRightBrowRaised(false);
                setFaceLandmarks(null);
                prevLeftBrowRef.current = false;
                prevRightBrowRef.current = false;
                prevMouthOpenRef.current = false;
                if (
                  lastFaceSeenAtRef.current > 0 &&
                  now - lastFaceSeenAtRef.current > 1500
                ) {
                  setFaceLost(true);
                }
              }
            } catch {
              // MediaPipe can throw on incomplete frames
            }
          }
        }

        rafRef.current = requestAnimationFrame(runLoop);
      };

      rafRef.current = requestAnimationFrame(runLoop);
    } catch (err) {
      isStartingRef.current = false;
      const e = err as DOMException;
      if (e.name === "NotAllowedError") {
        setErrorMessage("Camera permission denied.");
      } else if (e.name === "NotFoundError") {
        setErrorMessage("No camera found.");
      } else {
        setErrorMessage(e.message || "Failed to start.");
      }
      setStatus("error");
      stopEverything();
    }
  }, [stopEverything]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;

    const attemptStart = () => {
      if (!isActive) return;

      // Check if refs are ready
      if (!videoRef.current || !containerRef.current) {
        retryCount++;
        if (retryCount < maxRetries) {
          retryTimeout = setTimeout(attemptStart, 50);
        } else {
          console.error(
            "GameScreen: Failed to initialize - refs not available",
          );
          setErrorMessage("Failed to initialize game screen");
          setStatus("error");
        }
        return;
      }

      // Only start if we haven't already started (check if stream exists)
      if (!streamRef.current) {
        handleStart();
      }
    };

    attemptStart();

    return () => {
      isActive = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      // Only cleanup if we actually have a stream running
      // This prevents Strict Mode from killing the camera on first cleanup
      if (streamRef.current) {
        stopEverything();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      data-game-screen
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${
        lineClearFlash.active ? "animate-screen-shake-intense" : ""
      }`}
      style={{
        background:
          "radial-gradient(circle at 50% 30%, #ff7a00 0%, #2b1055 40%, #0a0a0a 100%)",
      }}
    >
      <div className="flex h-full w-full max-w-5xl flex-row">
        <div className="relative flex min-h-0 min-w-0 flex-1">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-100 ${
              lineClearFlash.active ? "line-clear-flash" : ""
            }`}
            style={{
              transform: "scaleX(-1)",
              filter: lineClearFlash.active
                ? `saturate(${2 + lineClearFlash.intensity}) contrast(${1.2 + lineClearFlash.intensity * 0.2}) hue-rotate(${lineClearFlash.intensity * 30}deg) brightness(${1.2 + lineClearFlash.intensity * 0.15})`
                : undefined,
              imageRendering: lineClearFlash.active ? "pixelated" : undefined,
            }}
          />
          {lineClearFlash.active && (
            <>
              <div
                className="pointer-events-none absolute inset-0 animate-pulse"
                style={{
                  background: `linear-gradient(45deg, 
                  rgba(0, 255, 255, ${0.15 * lineClearFlash.intensity}) 0%, 
                  rgba(255, 0, 255, ${0.15 * lineClearFlash.intensity}) 50%, 
                  rgba(255, 255, 0, ${0.15 * lineClearFlash.intensity}) 100%)`,
                  mixBlendMode: "screen",
                }}
              />
              <div className="pointer-events-none absolute right-[15%] top-[10%]">
                <div
                  className="comic-burst animate-comic-pop"
                  style={{
                    transform: `scale(${0.8 + lineClearFlash.intensity * 0.15})`,
                  }}
                >
                  <span className="comic-text">
                    {getLineClearText(lineClearFlash.linesCleared)}
                  </span>
                </div>
              </div>
            </>
          )}
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />

          {faceLost && status === "ready" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="rounded-lg border border-amber-500/60 bg-black/80 px-6 py-4 text-center">
                <p className="font-medium text-amber-400">Face not detected</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Position your face in the frame
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-start gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 md:gap-4 md:p-4">
          {/* Tetris - always visible, takes available space and shrinks to fit */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TetrisOverlay
              tetrisRef={tetrisRef}
              visible={status === "ready" && !showTutorial}
              inputMode={inputMode}
              muted={muted}
              onToggleMute={toggleMute}
              onGameOver={onGameOver}
              onLineClear={handleLineClear}
              onExitFullScreen={handleExit}
              onPieceLock={triggerHardDropReaction}
            />
          </div>

          {/* Control Feedback Panel - shrinks on small screens */}
          <div className="flex min-h-0 min-w-0 shrink flex-col gap-2 overflow-y-auto">
            <div className="flex w-full max-w-full flex-col gap-2 self-center rounded-lg border border-zinc-600 bg-black/70 px-4 py-3 text-base backdrop-blur-sm sm:w-[280px] sm:gap-2.5 sm:text-lg md:w-[320px] md:px-5 md:py-4">
            <div className="mb-0.5 flex flex-wrap items-center justify-between gap-3 sm:mb-1">
              <span className="text-sm font-medium text-zinc-500 sm:text-base">
                FEEDBACK
              </span>
              <div className="flex flex-wrap gap-2.5 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setShowGooglyEyes(!showGooglyEyes)}
                  className={`flex min-h-[60px] min-w-[60px] items-center justify-center rounded-xl border px-4 text-3xl transition-colors sm:min-h-[64px] sm:min-w-[64px] sm:text-4xl ${showGooglyEyes ? "border-accent/50 bg-accent/20 text-accent" : "border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-700 hover:text-white"}`}
                >
                  {showGooglyEyes ? "👀" : "👀"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLandmarks(!showLandmarks)}
                  className={`flex min-h-[60px] min-w-[60px] items-center justify-center rounded-xl border px-4 text-3xl transition-colors sm:min-h-[64px] sm:min-w-[64px] sm:text-4xl ${showLandmarks ? "border-accent/50 bg-accent/20 text-accent" : "border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-700 hover:text-white"}`}
                >
                  ●
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalibration(!showCalibration)}
                  className="flex min-h-[60px] min-w-[60px] items-center justify-center rounded-xl border border-zinc-600 bg-zinc-800/80 px-4 text-3xl text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-700 hover:text-white sm:min-h-[64px] sm:min-w-[64px] sm:text-4xl"
                >
                  {showCalibration ? "−" : "+"}
                </button>
              </div>
            </div>
            <div className="flex gap-x-3 gap-y-0.5">
              <div
                className={`flex w-[4.5rem] items-center gap-1 font-medium sm:w-auto ${leftBrowRaised || keyboardLeftBrow ? "text-accent" : "text-zinc-400"}`}
              >
                <span
                  className={
                    leftBrowRaised || keyboardLeftBrow
                      ? "text-accent"
                      : "text-zinc-600"
                  }
                >
                  ←
                </span>
                <span className="hidden sm:inline">Left:</span>
                <span className="inline-block w-3 text-center">
                  {leftBrowRaised || keyboardLeftBrow ? "↑" : "−"}
                </span>
              </div>
              <div
                className={`flex w-[4.5rem] items-center gap-1 font-medium sm:w-auto ${rightBrowRaised || keyboardRightBrow ? "text-accent" : "text-zinc-400"}`}
              >
                <span
                  className={
                    rightBrowRaised || keyboardRightBrow
                      ? "text-accent"
                      : "text-zinc-600"
                  }
                >
                  →
                </span>
                <span className="hidden sm:inline">Right:</span>
                <span className="inline-block w-3 text-center">
                  {rightBrowRaised || keyboardRightBrow ? "↑" : "−"}
                </span>
              </div>
              <div
                className={`flex w-[5rem] items-center gap-1 font-medium sm:w-auto ${mouthOpen || keyboardMouthOpen ? "text-accent" : "text-zinc-400"}`}
              >
                <span
                  className={
                    mouthOpen || keyboardMouthOpen
                      ? "text-accent"
                      : "text-zinc-600"
                  }
                >
                  ↓
                </span>
                <span className="hidden sm:inline">Mouth:</span>
                <span className="inline-block w-3 text-center">
                  {mouthOpen || keyboardMouthOpen ? "○" : "−"}
                </span>
              </div>
            </div>

            {showCalibration && (
              <div className="mt-3 border-t border-zinc-700 pt-3">
                <div className="mb-2 text-[10px] font-medium text-zinc-500">
                  LANDMARK-BASED DETECTION (outer brow points)
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Your Left Brow (← move left)</span>
                      <span
                        className={
                          landmarkScores.leftBrowLift > BROW_LIFT_THRESHOLD
                            ? "text-accent"
                            : ""
                        }
                      >
                        {(landmarkScores.leftBrowLift * 1000).toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-accent transition-all duration-75"
                        style={{
                          width: `${Math.min(Math.max((landmarkScores.leftBrowLift * 1000) / 30, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Your Right Brow (→ move right)</span>
                      <span
                        className={
                          landmarkScores.rightBrowLift > BROW_LIFT_THRESHOLD
                            ? "text-accent"
                            : ""
                        }
                      >
                        {(landmarkScores.rightBrowLift * 1000).toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-accent transition-all duration-75"
                        style={{
                          width: `${Math.min(Math.max((landmarkScores.rightBrowLift * 1000) / 30, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Inner brow (↻ rotate)</span>
                      <span
                        className={
                          blendshapeScores.browInnerUp >
                          EYEBROW_RAISED_THRESHOLD
                            ? "text-accent"
                            : ""
                        }
                      >
                        {blendshapeScores.browInnerUp.toFixed(3)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-blue-500 transition-all duration-75"
                        style={{
                          width: `${Math.min(blendshapeScores.browInnerUp * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Mouth ratio (↓ soft drop)</span>
                      <span
                        className={
                          blendshapeScores.mouthRatio > MOUTH_OPEN_THRESHOLD
                            ? "text-accent"
                            : ""
                        }
                      >
                        {blendshapeScores.mouthRatio.toFixed(3)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-orange-500 transition-all duration-75"
                        style={{
                          width: `${Math.min((blendshapeScores.mouthRatio * 100) / 0.6, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-[10px] text-zinc-500">
                  <div>
                    Brow threshold: {BROW_LIFT_THRESHOLD * 1000} (trigger) /{" "}
                    {BROW_LOWER_THRESHOLD * 1000} (release)
                  </div>
                  <div>Mouth threshold: {MOUTH_OPEN_THRESHOLD}</div>
                  <div>
                    Baseline: L=
                    {landmarkScores.leftBrowBaseline !== null
                      ? (landmarkScores.leftBrowBaseline * 1000).toFixed(1)
                      : "calibrating..."}{" "}
                    R=
                    {landmarkScores.rightBrowBaseline !== null
                      ? (landmarkScores.rightBrowBaseline * 1000).toFixed(1)
                      : "calibrating..."}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Mode Indicator */}
          <div className="w-full self-center rounded-lg border border-zinc-600 bg-black/70 px-2 py-1.5 text-center backdrop-blur-sm sm:w-[280px] md:w-[320px]">
            {inputMode === "eyebrow" ? (
              <span className="text-[10px] text-green-400 sm:text-xs">
                👁️ Eyebrow mode — competing for glory!
              </span>
            ) : (
              <span className="text-[10px] text-amber-400 sm:text-xs">
                ⌨️ Keyboard mode — separate leaderboard
              </span>
            )}
          </div>
        </div>
        </div>
      </div>

      {(status === "requesting" || status === "loading") && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <p className="text-lg text-white">
            {status === "requesting"
              ? "Requesting camera..."
              : "Loading face model..."}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80">
          <p className="text-lg text-red-400">{errorMessage}</p>
          <button
            type="button"
            onClick={handleExit}
            className="rounded-lg border border-zinc-500 bg-black/70 px-6 py-3 text-zinc-200 transition hover:bg-black/90 hover:text-white"
          >
            Go Back
          </button>
        </div>
      )}

      {showTutorial && (
        <TutorialOverlay
          forceShow
          onDismiss={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
}
