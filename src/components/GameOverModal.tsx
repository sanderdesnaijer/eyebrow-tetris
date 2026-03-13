"use client";

import type { GameStats } from "./TetrisOverlay";

interface GameOverModalProps {
  stats: GameStats;
  onClose: () => void;
  onPlayAgain?: () => void;
}

export function GameOverModal({ stats, onClose, onPlayAgain }: GameOverModalProps) {
  const isZeroScore = stats.score === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="pixel-font mb-4 text-center text-lg text-[var(--blue)]">
          GAME OVER
        </h2>

        <div className="mb-6 space-y-2 text-center">
          <p className="text-3xl font-bold text-[var(--accent)]">
            {stats.score.toLocaleString()}
          </p>
          <p className="text-sm text-zinc-400">
            Level {stats.level} · {stats.lines} lines
          </p>
          <p
            className={`text-sm ${stats.inputMode === "eyebrow" ? "text-green-400" : "text-amber-400"}`}
          >
            {stats.inputMode === "eyebrow" ? "👁️ Eyebrow" : "⌨️ Keyboard"} mode
          </p>
        </div>

        {!isZeroScore && (
          <p className="mb-6 text-center text-sm text-zinc-500">
            Score didn&apos;t make the top 100. Keep playing to improve!
          </p>
        )}

        {isZeroScore ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              Exit
            </button>
            {onPlayAgain && (
              <button
                type="button"
                onClick={onPlayAgain}
                className="flex-1 rounded-lg bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:bg-accent-hover"
              >
                Play Again
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:bg-accent-hover"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
