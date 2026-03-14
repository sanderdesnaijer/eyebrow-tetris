"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useGameAudio } from "../hooks/useGameAudio";

const COLS = 10;
const ROWS = 20;
const HIGH_SCORE_KEY = "eyebrow-tetris-high-score";

function usePreviewCell(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [previewCell, setPreviewCell] = useState(10);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const containerWidth = el.clientWidth || 160;
      const cellApprox = containerWidth / COLS;
      setPreviewCell(Math.max(6, Math.floor(cellApprox * 0.625)));
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return previewCell;
}

const PIECES: number[][][] = [
  [[1, 1, 1, 1]], // I
  [
    [1, 1],
    [1, 1],
  ], // O
  [
    [0, 1, 0],
    [1, 1, 1],
  ], // T
  [
    [0, 1, 1],
    [1, 1, 0],
  ], // S
  [
    [1, 1, 0],
    [0, 1, 1],
  ], // Z
  [
    [1, 0, 0],
    [1, 1, 1],
  ], // J
  [
    [0, 0, 1],
    [1, 1, 1],
  ], // L
];

// Neon arcade palette
export const TETRIS_COLORS = [
  "#00F0FF", // I - cyan
  "#FFE600", // O - laser yellow
  "#B000FF", // T - purple neon
  "#00FF85", // S - neon green
  "#FF2E63", // Z - hot pink red
  "#3B6BFF", // J - electric blue
  "#FF7A00", // L - neon orange
];

const COLORS = TETRIS_COLORS;

export interface TetrisPiece {
  shape: number[][];
  color: number;
  x: number;
  y: number;
}

export interface TetrisOverlayRef {
  moveLeft: () => void;
  moveRight: () => void;
  rotate: () => void;
  hardDrop: () => void;
  softDrop: () => void;
  getCurrentPiece: () => TetrisPiece | null;
  getDangerLevel: () => { isInDanger: boolean; dangerLevel: number };
}

export type InputMode = "eyebrow" | "keyboard";

export interface GameStats {
  score: number;
  level: number;
  lines: number;
  inputMode: InputMode;
}

interface TetrisOverlayProps {
  tetrisRef: React.RefObject<TetrisOverlayRef | null>;
  visible: boolean;
  inputMode: InputMode;
  muted: boolean;
  onToggleMute: () => void;
  onGameOver?: (stats: GameStats) => void;
  onLineClear?: (linesCleared: number) => void;
  onExitFullScreen?: () => void;
  onPieceLock?: () => void;
}

function getNextPieceIndex(): number {
  return Math.floor(Math.random() * PIECES.length);
}

export function TetrisOverlay({
  tetrisRef,
  visible,
  inputMode,
  muted,
  onToggleMute,
  onGameOver,
  onLineClear,
  onExitFullScreen,
  onPieceLock,
}: TetrisOverlayProps) {
  const audio = useGameAudio(muted);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const previewCell = usePreviewCell(gridContainerRef);
  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null)),
  );
  const [piece, setPiece] = useState<{
    shape: number[][];
    color: number;
    x: number;
    y: number;
  } | null>(null);
  const [nextPieceIndex, setNextPieceIndex] = useState(getNextPieceIndex);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lineClearFlash, setLineClearFlash] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const gridRef = useRef<(number | null)[][]>([]);
  const pieceRef = useRef<{
    shape: number[][];
    color: number;
    x: number;
    y: number;
  } | null>(null);
  const highScoreRef = useRef(0);
  const gameOverCalledRef = useRef(false);

  gridRef.current = grid;
  pieceRef.current = piece;
  highScoreRef.current = highScore;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  useEffect(() => {
    if (gameOver && !gameOverCalledRef.current) {
      gameOverCalledRef.current = true;
      audio.stopMusic();
      audio.play("gameOver");
      onGameOver?.({ score, level, lines, inputMode });
    }
  }, [gameOver, score, level, lines, inputMode, onGameOver, audio]);

  const createPiece = useCallback((idx?: number) => {
    const i = idx ?? getNextPieceIndex();
    const shape = PIECES[i].map((row) => [...row]);
    return {
      shape,
      color: i,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0,
    };
  }, []);

  const collides = useCallback(
    (
      g: (number | null)[][],
      p: number[][],
      px: number,
      py: number,
    ): boolean => {
      for (let dy = 0; dy < p.length; dy++) {
        for (let dx = 0; dx < p[0].length; dx++) {
          if (p[dy][dx]) {
            const ny = py + dy;
            const nx = px + dx;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && g[ny][nx] !== null) return true;
          }
        }
      }
      return false;
    },
    [],
  );

  const rotateShape = (s: number[][]): number[][] => {
    const rows = s.length;
    const cols = s[0].length;
    const out: number[][] = [];
    for (let c = 0; c < cols; c++) {
      const row: number[] = [];
      for (let r = rows - 1; r >= 0; r--) row.push(s[r][c]);
      out.push(row);
    }
    return out;
  };

  const mergePiece = useCallback(
    (
      g: (number | null)[][],
      p: { shape: number[][]; color: number; x: number; y: number },
    ) => {
      const next = g.map((row) => [...row]);
      for (let dy = 0; dy < p.shape.length; dy++) {
        for (let dx = 0; dx < p.shape[0].length; dx++) {
          if (p.shape[dy][dx]) {
            const ny = p.y + dy;
            const nx = p.x + dx;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
              next[ny][nx] = p.color;
            }
          }
        }
      }
      return next;
    },
    [],
  );

  const clearLines = useCallback(
    (g: (number | null)[][]): [(number | null)[][], number] => {
      let cleared = 0;
      const filtered = g.filter((row) => {
        const full = row.every((c) => c !== null);
        if (full) {
          cleared++;
          return false;
        }
        return true;
      });
      const result: (number | null)[][] = [];
      while (result.length + filtered.length < ROWS) {
        result.push(Array(COLS).fill(null));
      }
      result.push(...filtered);
      return [result, cleared];
    },
    [],
  );

  const spawn = useCallback(
    (nextIdx?: number) => {
      const p = createPiece(nextIdx);
      const g = gridRef.current;
      if (collides(g, p.shape, p.x, p.y)) {
        setGameOver(true);
        return null;
      }
      return p;
    },
    [createPiece, collides],
  );

  const lockPiece = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;

    const next = mergePiece(gridRef.current, p);
    const [nextGrid, cleared] = clearLines(next);

    if (cleared > 0) {
      setLineClearFlash(true);
      setTimeout(() => setLineClearFlash(false), 120);
      setLines((l) => l + cleared);
      setScore((s) => {
        const newScore = s + cleared * 100 * level;
        if (typeof window !== "undefined" && newScore > highScoreRef.current) {
          localStorage.setItem(HIGH_SCORE_KEY, String(newScore));
          setHighScore(newScore);
        }
        return newScore;
      });
      setLevel(() => Math.min(10, Math.floor((lines + cleared) / 10) + 1));
      audio.play("clearLine");
      onLineClear?.(cleared);
    }

    // Trigger piece lock callback (for sound/visual effects)
    onPieceLock?.();

    setGrid(nextGrid);
    // Spawn the piece that was shown in "Next" preview
    const newPiece = spawn(nextPieceIndex);
    setPiece(newPiece);
    // Generate a new "Next" piece for the preview
    setNextPieceIndex(getNextPieceIndex());
  }, [
    mergePiece,
    clearLines,
    spawn,
    level,
    lines,
    nextPieceIndex,
    audio,
    onLineClear,
    onPieceLock,
  ]);

  const move = useCallback(
    (dx: number) => {
      const p = pieceRef.current;
      if (!p || gameOver || paused) return;
      const g = gridRef.current;
      if (!collides(g, p.shape, p.x + dx, p.y)) {
        setPiece({ ...p, x: p.x + dx });
        audio.play("move");
      }
    },
    [collides, gameOver, paused, audio],
  );

  const rotate = useCallback(() => {
    const p = pieceRef.current;
    if (!p || gameOver || paused) return;
    const rotated = rotateShape(p.shape);
    const g = gridRef.current;
    if (!collides(g, rotated, p.x, p.y)) {
      setPiece({ ...p, shape: rotated });
      audio.play("rotate");
    }
  }, [collides, gameOver, paused, audio]);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || gameOver || paused) return;
    const g = gridRef.current;
    let y = p.y;
    while (!collides(g, p.shape, p.x, y + 1)) y++;
    const dropped = { ...p, y };
    pieceRef.current = dropped;
    audio.play("hardFall");
    lockPiece();
  }, [collides, lockPiece, gameOver, paused, audio]);

  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || gameOver || paused) return;
    const g = gridRef.current;
    if (collides(g, p.shape, p.x, p.y + 1)) {
      lockPiece();
    } else {
      setPiece({ ...p, y: p.y + 1 });
      audio.play("move");
    }
  }, [collides, lockPiece, gameOver, paused, audio]);

  const tick = useCallback(() => {
    const p = pieceRef.current;
    if (!p || gameOver || paused) return;
    const g = gridRef.current;
    if (collides(g, p.shape, p.x, p.y + 1)) {
      lockPiece();
    } else {
      setPiece({ ...p, y: p.y + 1 });
    }
  }, [collides, lockPiece, gameOver, paused]);

  const ghostY = piece
    ? (() => {
        const g = gridRef.current;
        let y = piece.y;
        while (!collides(g, piece.shape, piece.x, y + 1)) y++;
        return y;
      })()
    : 0;

  const restart = useCallback(() => {
    setGrid(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null)),
    );
    setGameOver(false);
    gameOverCalledRef.current = false;
    setScore(0);
    setLevel(1);
    setLines(0);
    setPaused(false);
    // Generate the first piece and set the next piece for preview
    const firstPieceIdx = getNextPieceIndex();
    const nextIdx = getNextPieceIndex();
    setNextPieceIndex(nextIdx);
    const p = createPiece(firstPieceIdx);
    setPiece(p);
  }, [createPiece]);

  useImperativeHandle(tetrisRef, () => ({
    moveLeft: () => move(-1),
    moveRight: () => move(1),
    rotate,
    hardDrop,
    softDrop,
    getCurrentPiece: () => pieceRef.current,
    getDangerLevel: () => {
      const g = gridRef.current;
      let stackHeight = 0;
      for (let row = 0; row < ROWS; row++) {
        if (g[row].some((cell) => cell !== null)) {
          stackHeight = ROWS - row;
          break;
        }
      }
      const dangerThreshold = ROWS * 0.6;
      return {
        isInDanger: stackHeight >= dangerThreshold,
        dangerLevel: Math.min(
          1,
          (stackHeight - dangerThreshold) / (ROWS * 0.3),
        ),
      };
    },
  }));

  useEffect(() => {
    if (!visible) return;
    setGrid(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null)),
    );
    setGameOver(false);
    gameOverCalledRef.current = false;
    setScore(0);
    setLevel(1);
    setLines(0);
    setPaused(false);
    // Generate the first piece and set the next piece for preview
    const firstPieceIdx = getNextPieceIndex();
    const nextIdx = getNextPieceIndex();
    setNextPieceIndex(nextIdx);
    const p = createPiece(firstPieceIdx);
    setPiece(p);
    audio.startMusic();
  }, [visible, createPiece, audio]);

  useEffect(() => {
    if (!visible || gameOver) return;
    if (paused) {
      audio.pauseMusic();
    } else {
      audio.resumeMusic();
    }
  }, [visible, gameOver, paused, audio]);

  useEffect(() => {
    if (!visible || gameOver || paused) return;
    const speed = Math.max(100, 800 - (level - 1) * 80);
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [visible, gameOver, paused, tick, level]);

  useEffect(() => {
    if (!visible) return;

    // Track keyboard soft drop state for acceleration
    let keyboardDownStartTime: number | null = null;
    let keyboardLastSoftDrop = 0;

    const handler = (e: KeyboardEvent) => {
      if (gameOver) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          restart();
        }
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        onToggleMute();
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          move(-1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          move(1);
          break;
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          rotate();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          if (!e.repeat) {
            keyboardDownStartTime = performance.now();
            softDrop();
            keyboardLastSoftDrop = performance.now();
          }
          break;
        case " ":
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        keyboardDownStartTime = null;
      }
    };

    // Interval for continuous soft drops when holding down
    const softDropTick = () => {
      if (keyboardDownStartTime !== null && !gameOver && !paused) {
        const now = performance.now();
        const holdDuration = now - keyboardDownStartTime;
        // Start at 300ms interval, decrease to 50ms as hold duration increases
        const minInterval = 50;
        const maxInterval = 300;
        const accelerationTime = 1500; // Full speed after 1.5 seconds
        const progress = Math.min(holdDuration / accelerationTime, 1);
        const interval = maxInterval - (maxInterval - minInterval) * progress;

        if (now - keyboardLastSoftDrop >= interval) {
          softDrop();
          keyboardLastSoftDrop = now;
        }
      }
    };

    const intervalId = setInterval(softDropTick, 16); // ~60fps check

    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", keyUpHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", keyUpHandler);
      clearInterval(intervalId);
    };
  }, [
    visible,
    gameOver,
    paused,
    move,
    rotate,
    softDrop,
    hardDrop,
    restart,
    onToggleMute,
  ]);

  if (!visible) return null;

  const isPieceAt = (
    shape: number[][],
    x: number,
    y: number,
    row: number,
    col: number,
  ) => {
    const dy = row - y;
    const dx = col - x;
    if (dy < 0 || dy >= shape.length || dx < 0 || dx >= shape[0].length)
      return false;
    return shape[dy][dx] === 1;
  };

  return (
    <div
      className={`flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col items-center gap-1 self-stretch rounded-lg border border-cyan-500/30 bg-black/80 p-2 backdrop-blur-sm sm:gap-2 sm:p-3 ${lineClearFlash ? "neon-line-clear" : ""}`}
      style={{
        boxShadow:
          "0 0 6px rgba(0,255,255,0.12), 0 0 16px rgba(0,255,255,0.06)",
      }}
    >
      {/* Pause, Mute and Exit buttons above the title */}
      {!gameOver && (
        <div className="flex w-full shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="flex min-h-[32px] flex-1 items-center justify-center rounded-lg border border-zinc-500 px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white sm:min-h-[36px] sm:text-sm"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="flex min-h-[32px] items-center justify-center rounded-lg border border-zinc-500 px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white sm:min-h-[36px] sm:text-sm"
            title={muted ? "Unmute (M)" : "Mute (M)"}
          >
            {muted ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 sm:h-5 sm:w-5"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 sm:h-5 sm:w-5"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          {onExitFullScreen && (
            <button
              type="button"
              onClick={() => {
                audio.stopMusic();
                onExitFullScreen?.();
              }}
              className="flex min-h-[32px] flex-1 items-center justify-center rounded-lg border border-zinc-500 px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white sm:min-h-[36px] sm:text-sm"
            >
              Exit
            </button>
          )}
        </div>
      )}
      <div className="flex w-full shrink-0 items-center justify-between">
        <div
          className="pixel-font text-[10px] sm:text-sm"
          style={{
            color: "#ffb84d",
            textShadow: "0 0 4px rgba(255,184,77,0.6)",
          }}
        >
          EYEBROW TETRIS
        </div>
      </div>
      <div className="flex w-full shrink-0 items-start justify-between gap-2 sm:gap-3">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <div className="score-glow text-[10px] text-zinc-400 sm:text-xs">
            Score: {score} · L{level}
          </div>
          {highScore > 0 && (
            <div className="text-[8px] text-zinc-500 sm:text-[10px]">
              Best: {highScore}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-[10px] text-zinc-500">Next</div>
          <div
            className="flex items-center justify-center rounded p-0.5"
            style={{
              width: 4 * previewCell + 4,
              height: 2 * previewCell + 2,
              backgroundColor: "#0f172a",
            }}
          >
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: `repeat(${PIECES[nextPieceIndex][0].length}, ${previewCell}px)`,
                gridTemplateRows: `repeat(${PIECES[nextPieceIndex].length}, ${previewCell}px)`,
              }}
            >
              {PIECES[nextPieceIndex].flat().map((c, i) => (
                <div
                  key={i}
                  className="tetromino-neon"
                  style={{
                    width: previewCell,
                    height: previewCell,
                    backgroundColor: c ? COLORS[nextPieceIndex] : "transparent",
                    boxShadow: c
                      ? `0 0 2px ${COLORS[nextPieceIndex]}, 0 0 6px ${COLORS[nextPieceIndex]}`
                      : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        ref={gridContainerRef}
        className="flex min-h-0 min-w-0 w-full flex-1 items-center justify-center overflow-hidden"
        style={{ containerType: "size" }}
      >
        <div
          className="relative grid gap-px p-1 neon-grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            width: "min(100cqw, 50cqh)",
            height: "min(100cqh, 200cqw)",
            backgroundColor: "#0f172a",
          }}
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const gridVal = grid[row]?.[col] ?? null;
            const isGhost =
              piece &&
              ghostY > piece.y &&
              isPieceAt(piece.shape, piece.x, ghostY, row, col) &&
              gridVal === null;
            const isPieceCell =
              piece &&
              isPieceAt(piece.shape, piece.x, piece.y, row, col) &&
              !isGhost;
            const color = isGhost
              ? COLORS[piece.color]
              : gridVal !== null
                ? COLORS[gridVal]
                : isPieceCell
                  ? COLORS[piece.color]
                  : null;
            return (
              <div
                key={i}
                className={isGhost ? "tetromino-ghost" : "tetromino-neon"}
                style={{
                  aspectRatio: "1",
                  backgroundColor: isGhost
                    ? "rgba(0,255,255,0.15)"
                    : (color ?? "transparent"),
                  opacity: isGhost ? 1 : 1,
                  border: isGhost ? `1px solid rgba(0,255,255,0.4)` : undefined,
                  boxShadow: isGhost
                    ? "0 0 4px rgba(0,255,255,0.4)"
                    : color
                      ? `0 0 2px ${color}, 0 0 6px ${color}`
                      : undefined,
                }}
              />
            );
          })}
        </div>
      </div>
      {gameOver && (
        <div className="mt-2 flex shrink-0 flex-col items-center gap-2">
          <div
            className="pixel-font text-sm"
            style={{
              color: "#ff2e63",
              textShadow: "0 0 4px rgba(255,46,99,0.5)",
            }}
          >
            GAME OVER
          </div>
          <button
            type="button"
            onClick={restart}
            className="rounded-lg px-6 py-2 text-sm font-semibold transition"
            style={{
              backgroundColor: "#FFE600",
              color: "#0a0a0a",
              boxShadow: "0 0 6px rgba(255,230,0,0.4)",
            }}
          >
            Play Again
          </button>
        </div>
      )}
      {/* Compact controls - hidden on small screens to save space */}
      <div className="mt-2 hidden w-full shrink-0 flex-wrap justify-center gap-2 text-xs text-zinc-500 sm:flex sm:gap-3 sm:text-sm">
        <span>
          <span style={{ color: "#00E5FF" }}>←</span> L.Brow
        </span>
        <span>
          <span style={{ color: "#00E5FF" }}>→</span> R.Brow
        </span>
        <span>
          <span style={{ color: "#00E5FF" }}>↻</span> Both
        </span>
        <span>
          <span style={{ color: "#FF3D7F" }}>↓</span> Mouth
        </span>
        <span>
          <span style={{ color: "#FFE600" }}>⬇</span> Both+Mouth / Space
        </span>
      </div>
    </div>
  );
}
