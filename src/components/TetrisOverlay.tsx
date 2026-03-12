"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 16;
const PREVIEW_CELL = 10;
const HIGH_SCORE_KEY = "eyebrow-tetris-high-score";

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

export const TETRIS_COLORS = [
  "#06b6d4", // I - cyan
  "#eab308", // O - yellow (accent)
  "#a855f7", // T - purple
  "#22c55e", // S - green
  "#ef4444", // Z - red
  "#3b82f6", // J - blue
  "#f97316", // L - orange
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
  getCurrentPiece: () => TetrisPiece | null;
}

export interface GameStats {
  score: number;
  level: number;
  lines: number;
}

interface TetrisOverlayProps {
  tetrisRef: React.RefObject<TetrisOverlayRef | null>;
  visible: boolean;
  onGameOver?: (stats: GameStats) => void;
  onLineClear?: (linesCleared: number) => void;
}

function getNextPieceIndex(): number {
  return Math.floor(Math.random() * PIECES.length);
}

export function TetrisOverlay({
  tetrisRef,
  visible,
  onGameOver,
  onLineClear,
}: TetrisOverlayProps) {
  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null))
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
    if (gameOver && !gameOverCalledRef.current && onGameOver) {
      gameOverCalledRef.current = true;
      onGameOver({ score, level, lines });
    }
  }, [gameOver, score, level, lines, onGameOver]);

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
      py: number
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
    []
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
      p: { shape: number[][]; color: number; x: number; y: number }
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
    []
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
    []
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
    [createPiece, collides]
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
      onLineClear?.(cleared);
    }

    setGrid(nextGrid);
    const nextIdx = getNextPieceIndex();
    setNextPieceIndex(nextIdx);
    const newPiece = spawn(nextIdx);
    setPiece(newPiece);
  }, [mergePiece, clearLines, spawn, level, lines]);

  const move = useCallback(
    (dx: number) => {
      const p = pieceRef.current;
      if (!p || gameOver || paused) return;
      const g = gridRef.current;
      if (!collides(g, p.shape, p.x + dx, p.y)) {
        setPiece({ ...p, x: p.x + dx });
      }
    },
    [collides, gameOver, paused]
  );

  const rotate = useCallback(() => {
    const p = pieceRef.current;
    if (!p || gameOver || paused) return;
    const rotated = rotateShape(p.shape);
    const g = gridRef.current;
    if (!collides(g, rotated, p.x, p.y)) {
      setPiece({ ...p, shape: rotated });
    }
  }, [collides, gameOver, paused]);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || gameOver || paused) return;
    const g = gridRef.current;
    let y = p.y;
    while (!collides(g, p.shape, p.x, y + 1)) y++;
    const dropped = { ...p, y };
    pieceRef.current = dropped;
    lockPiece();
  }, [collides, lockPiece, gameOver, paused]);

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
        .map(() => Array(COLS).fill(null))
    );
    setGameOver(false);
    gameOverCalledRef.current = false;
    setScore(0);
    setLevel(1);
    setLines(0);
    setPaused(false);
    const nextIdx = getNextPieceIndex();
    setNextPieceIndex(nextIdx);
    const p = createPiece(nextIdx);
    setPiece(p);
  }, [createPiece]);

  useImperativeHandle(tetrisRef, () => ({
    moveLeft: () => move(-1),
    moveRight: () => move(1),
    rotate,
    hardDrop,
    getCurrentPiece: () => pieceRef.current,
  }));

  useEffect(() => {
    if (!visible) return;
    setGrid(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null))
    );
    setGameOver(false);
    gameOverCalledRef.current = false;
    setScore(0);
    setLevel(1);
    setLines(0);
    setPaused(false);
    const nextIdx = getNextPieceIndex();
    setNextPieceIndex(nextIdx);
    const p = createPiece(nextIdx);
    setPiece(p);
  }, [visible, createPiece]);

  useEffect(() => {
    if (!visible || gameOver || paused) return;
    const speed = Math.max(100, 800 - (level - 1) * 80);
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [visible, gameOver, paused, tick, level]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (gameOver) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          restart();
        }
        return;
      }
      if (e.key === " " || e.key === "p" || e.key === "P") {
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
          hardDrop();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, gameOver, paused, move, rotate, hardDrop, restart]);

  if (!visible) return null;

  const isPieceAt = (
    shape: number[][],
    x: number,
    y: number,
    row: number,
    col: number
  ) => {
    const dy = row - y;
    const dx = col - x;
    if (dy < 0 || dy >= shape.length || dx < 0 || dx >= shape[0].length)
      return false;
    return shape[dy][dx] === 1;
  };

  const CONTROL_MAPPING = [
    { cmd: "← Move Left", gesture: "Left Brow Up", icon: "←" },
    { cmd: "Move Right →", gesture: "Right Brow Up", icon: "→" },
    { cmd: "Rotate", gesture: "Both Brows Up", icon: "↻" },
    { cmd: "↓ Hard Drop", gesture: "Mouth Open", icon: "↓" },
  ] as const;

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border border-zinc-600 bg-black/80 p-3 backdrop-blur-sm ${lineClearFlash ? "animate-screen-shake" : ""}`}
    >
      <div className="flex w-full items-center justify-between">
        <div className="pixel-font text-sm text-accent">EYEBROW TETRIS</div>
        {!gameOver && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded border border-zinc-500 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
      </div>
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="score-glow text-xs text-zinc-400">
            Score: {score} · L{level}
          </div>
          {highScore > 0 && (
            <div className="text-[10px] text-zinc-500">Best: {highScore}</div>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-[10px] text-zinc-500">Next</div>
          <div
            className="grid gap-px bg-zinc-800/80 p-0.5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(4, PIECES[nextPieceIndex][0].length)}, ${PREVIEW_CELL}px)`,
              gridTemplateRows: `repeat(${PIECES[nextPieceIndex].length}, ${PREVIEW_CELL}px)`,
            }}
          >
            {PIECES[nextPieceIndex].flat().map((c, i) => (
              <div
                key={i}
                className="border border-zinc-700/50"
                style={{
                  width: PREVIEW_CELL,
                  height: PREVIEW_CELL,
                  backgroundColor: c ? COLORS[nextPieceIndex] : "transparent",
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        className="relative grid gap-px bg-zinc-800 p-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
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
              className="border border-zinc-700/50"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: color ?? "transparent",
                opacity: isGhost ? 0.35 : 1,
              }}
            />
          );
        })}
      </div>
      {gameOver && (
        <div className="mt-2 flex flex-col items-center gap-2">
          <div className="pixel-font text-sm text-red-400">GAME OVER</div>
          <button
            type="button"
            onClick={restart}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          >
            Play Again
          </button>
        </div>
      )}
      <div className="mt-1 w-full">
        <div className="mb-1 text-[10px] font-medium text-zinc-400">
          CONTROLS
        </div>
        <table className="w-full text-[10px] text-zinc-500">
          <thead>
            <tr className="border-b border-zinc-600">
              <th className="py-0.5 text-left font-medium">Command</th>
              <th className="py-0.5 text-left font-medium">Gesture</th>
              <th className="w-6 py-0.5 text-center font-medium">Icon</th>
            </tr>
          </thead>
          <tbody>
            {CONTROL_MAPPING.map(({ cmd, gesture, icon }) => (
              <tr key={cmd} className="border-b border-zinc-700/50">
                <td className="py-0.5">{cmd}</td>
                <td className="py-0.5">{gesture}</td>
                <td className="py-0.5 text-center text-accent">{icon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
