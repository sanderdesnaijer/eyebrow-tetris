"use client";

import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TetrisOverlay,
  type TetrisOverlayRef,
  type GameStats,
} from "./TetrisOverlay";

const MEDIAPIPE_NOISE_RE =
  /^\s*(INFO: |[IW]\d{4} |Graph successfully started)/;

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

function getBlendshapeScore(
  classifications:
    | { categories: { categoryName: string; score: number }[] }
    | undefined,
  name: string
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

const MOUTH_OUTER_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
const LEFT_BROW_INDICES = [70, 63, 105, 66, 107];
const RIGHT_BROW_INDICES = [300, 293, 334, 296, 336];

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

  const [status, setStatus] = useState<
    "idle" | "requesting" | "loading" | "ready" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [mouthOpen, setMouthOpen] = useState(false);
  const [leftBrowRaised, setLeftBrowRaised] = useState(false);
  const [rightBrowRaised, setRightBrowRaised] = useState(false);
  const [faceLost, setFaceLost] = useState(false);
  const [faceLandmarks, setFaceLandmarks] = useState<FaceLandmark[] | null>(null);
  const isStartingRef = useRef(false);

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

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!faceLandmarks) return;

    const drawLandmarkGroup = (indices: number[], isActive: boolean) => {
      const color = isActive ? "#22c55e" : "#ffffff";
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

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
      ctx.stroke();

      indices.forEach((i) => {
        const point = faceLandmarks[i];
        if (point) {
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    };

    drawLandmarkGroup(LEFT_BROW_INDICES, leftBrowRaised);
    drawLandmarkGroup(RIGHT_BROW_INDICES, rightBrowRaised);
    drawLandmarkGroup(MOUTH_OUTER_INDICES, mouthOpen);
  }, [faceLandmarks, mouthOpen, leftBrowRaised, rightBrowRaised]);

  useEffect(() => {
    drawFaceOverlay();
  }, [drawFaceOverlay]);

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
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
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

          if (now - lastFaceDetectionAtRef.current >= FACE_DETECTION_INTERVAL_MS) {
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
                    upperLip.y - lowerLip.y
                  );
                  const mouthWidth = Math.hypot(
                    leftCorner.x - rightCorner.x,
                    leftCorner.y - rightCorner.y
                  );
                  ratio = openDist / Math.max(mouthWidth, 0.001);
                  setMouthOpen(ratio > MOUTH_OPEN_THRESHOLD);
                }

                const browOuterUpLeft = getBlendshapeScore(
                  faceBlendshapes,
                  "browOuterUpLeft"
                );
                const browOuterUpRight = getBlendshapeScore(
                  faceBlendshapes,
                  "browOuterUpRight"
                );
                const browInnerUp = getBlendshapeScore(
                  faceBlendshapes,
                  "browInnerUp"
                );

                // Swap left/right because video is mirrored (scaleX(-1))
                // MediaPipe's "right" is the user's left in the mirrored view
                const leftBrow =
                  browOuterUpRight > EYEBROW_RAISED_THRESHOLD ||
                  browInnerUp > EYEBROW_RAISED_THRESHOLD;
                const rightBrow =
                  browOuterUpLeft > EYEBROW_RAISED_THRESHOLD ||
                  browInnerUp > EYEBROW_RAISED_THRESHOLD;

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
                  if (leftBrow && rightBrow && (!prevLeft || !prevRight)) {
                    tetris.rotate();
                  } else if (leftBrow && !prevLeft && !rightBrow) {
                    tetris.moveLeft();
                  } else if (rightBrow && !prevRight && !leftBrow) {
                    tetris.moveRight();
                  }
                  if (mouthOpenNow && !prevMouth) {
                    tetris.hardDrop();
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
          console.error("GameScreen: Failed to initialize - refs not available");
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
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[var(--background)] md:flex-row"
    >
      <div className="relative flex min-h-[40vh] min-w-0 flex-1 md:min-h-0">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-lg border border-zinc-600 bg-black/70 px-4 py-3 backdrop-blur-sm">
          <div className="mb-1 text-[10px] font-medium text-zinc-500">
            CONTROL FEEDBACK
          </div>
          <div
            className={`flex items-center gap-2 font-medium ${leftBrowRaised ? "text-accent" : "text-zinc-400"}`}
          >
            <span className={leftBrowRaised ? "text-accent" : "text-zinc-600"}>
              ←
            </span>
            Left brow: {leftBrowRaised ? "raised" : "neutral"}
          </div>
          <div
            className={`flex items-center gap-2 font-medium ${rightBrowRaised ? "text-accent" : "text-zinc-400"}`}
          >
            <span className={rightBrowRaised ? "text-accent" : "text-zinc-600"}>
              →
            </span>
            Right brow: {rightBrowRaised ? "raised" : "neutral"}
          </div>
          <div
            className={`flex items-center gap-2 font-medium ${mouthOpen ? "text-accent" : "text-zinc-400"}`}
          >
            <span className={mouthOpen ? "text-accent" : "text-zinc-600"}>
              ↓
            </span>
            Mouth: {mouthOpen ? "open" : "closed"}
          </div>
        </div>

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

        <button
          type="button"
          onClick={handleExit}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-zinc-500 bg-black/70 px-6 py-3 text-zinc-200 backdrop-blur-sm transition hover:bg-black/90 hover:text-white"
        >
          Exit
        </button>
      </div>

      <div className="flex shrink-0 items-center justify-center overflow-auto p-4">
        <TetrisOverlay
          tetrisRef={tetrisRef}
          visible={status === "ready"}
          onGameOver={onGameOver}
        />
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
    </div>
  );
}
