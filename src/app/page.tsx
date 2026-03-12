"use client";

import { useState } from "react";
import { GameScreen } from "@/components/GameScreen";
import { ScoreSubmitModal } from "@/components/ScoreSubmitModal";
import type { GameStats } from "@/components/TetrisOverlay";

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  const handlePlay = () => {
    document.body.style.overflow = "hidden";
    setIsPlaying(true);
  };

  const handleExit = () => {
    document.body.style.overflow = "";
    setIsPlaying(false);
  };

  const handleGameOver = (stats: GameStats) => {
    setGameStats(stats);
    setShowScoreModal(true);
  };

  const handleScoreSubmitted = () => {
    setShowScoreModal(false);
    setGameStats(null);
  };

  const handleScoreModalClose = () => {
    setShowScoreModal(false);
    setGameStats(null);
  };

  return (
    <>
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="pixel-font mb-6 text-2xl leading-relaxed text-[var(--blue)] md:text-3xl">
            EYEBROW TETRIS
          </h1>

          <p className="mb-8 text-lg text-zinc-400">
            Play Tetris using your face! Raise your eyebrows to move pieces left
            and right, raise both to rotate, and open your mouth to hard drop.
          </p>

          <div className="mb-12 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handlePlay}
              className="animate-pulse-glow rounded-xl bg-accent px-12 py-5 text-xl font-bold text-accent-foreground transition hover:bg-accent-hover"
            >
              Play Now
            </button>

            <p className="text-sm text-zinc-500">
              Requires camera access for face detection
            </p>
          </div>

          <div className="grid gap-6 text-left md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="mb-3 text-lg font-semibold text-[var(--accent)]">
                Controls
              </h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-accent">←</span> Left eyebrow up = Move
                  left
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">→</span> Right eyebrow up = Move
                  right
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">↻</span> Both eyebrows up =
                  Rotate
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">↓</span> Open mouth = Hard drop
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="mb-3 text-lg font-semibold text-[var(--accent)]">
                Tips
              </h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>• Good lighting helps detection</li>
                <li>• Face the camera directly</li>
                <li>• Exaggerate your expressions</li>
                <li>• Use keyboard as backup (WASD/Arrows)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {isPlaying && (
        <GameScreen onGameOver={handleGameOver} onExit={handleExit} />
      )}

      {showScoreModal && gameStats && (
        <ScoreSubmitModal
          stats={gameStats}
          onSubmit={handleScoreSubmitted}
          onClose={handleScoreModalClose}
        />
      )}
    </>
  );
}
