"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { GameScreen } from "@/components/GameScreen";
import { ScoreSubmitModal } from "@/components/ScoreSubmitModal";
import { GameOverModal } from "@/components/GameOverModal";
import { MeltScreen } from "@/components/MeltScreen";
import type { GameStats } from "@/components/TetrisOverlay";
import { checkScoreQualifies } from "@/lib/supabase";
import { LatestRelease } from "@/components/LatestRelease";

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showMeltScreen, setShowMeltScreen] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const pendingQualifiesRef = useRef<boolean | null>(null);

  const handlePlay = () => {
    document.body.style.overflow = "hidden";
    setIsPlaying(true);
  };

  const handleExit = () => {
    document.body.style.overflow = "";
    setIsPlaying(false);
    setShowMeltScreen(false);
  };

  const handleGameOver = async (stats: GameStats) => {
    setGameStats(stats);
    
    // If score is 0, skip qualification check and go straight to game over modal
    if (stats.score === 0) {
      pendingQualifiesRef.current = false;
    } else {
      // Check qualification in advance while showing melt effect
      const qualifies = await checkScoreQualifies(stats.score, stats.inputMode);
      pendingQualifiesRef.current = qualifies;
    }
    
    // Show the melt screen transition
    setShowMeltScreen(true);
  };

  const handleMeltComplete = () => {
    setShowMeltScreen(false);
    
    // Now show the appropriate modal
    if (pendingQualifiesRef.current) {
      setShowScoreModal(true);
    } else {
      setShowGameOverModal(true);
    }
    pendingQualifiesRef.current = null;
  };

  const handleScoreSubmitted = () => {
    setShowScoreModal(false);
    setGameStats(null);
  };

  const handleScoreModalClose = () => {
    setShowScoreModal(false);
    setGameStats(null);
  };

  const handleGameOverModalClose = () => {
    setShowGameOverModal(false);
    setGameStats(null);
  };

  const handlePlayAgain = () => {
    setShowGameOverModal(false);
    setGameStats(null);
    // Game is still playing, just restart by triggering exit and play
    setIsPlaying(false);
    setTimeout(() => {
      handlePlay();
    }, 100);
  };

  return (
    <>
      <h1 className="pixel-font mx-auto mt-8 mb-2 text-center text-2xl leading-relaxed text-[var(--blue)] md:text-3xl">
        EYEBROW TETRIS
      </h1>
      <p className="mx-auto mb-6 max-w-md text-center text-sm leading-relaxed text-zinc-400 italic md:text-base">
        &ldquo;Accessibility is important.
        <br />
        So I made the least accessible game possible.&rdquo;
      </p>
      <div className="relative mx-auto mb-12 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--blue)]/15"
        style={{ boxShadow: "0 0 30px rgba(0, 240, 255, 0.08), 0 0 60px rgba(176, 0, 255, 0.04)" }}
      >
        <Image
          src="/og-image.webp"
          alt="Eyebrow Tetris — play Tetris with your face"
          width={1200}
          height={630}
          className="block w-full"
          priority
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent">
          <button
            type="button"
            onClick={handlePlay}
            className="animate-pulse-glow rounded-xl bg-accent px-12 py-5 text-xl font-bold text-accent-foreground transition hover:bg-accent-hover"
            style={{ boxShadow: "0 0 15px rgba(255, 46, 99, 0.4), 0 0 40px rgba(255, 46, 99, 0.15)" }}
          >
            Play Now
          </button>
          <p className="mt-3 text-sm font-medium text-white drop-shadow-md">
            Requires camera access for face detection
          </p>
        </div>
      </div>

      <div className="px-4 pb-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-8 text-lg text-zinc-300">
            Play Tetris using your face! Raise your eyebrows to move pieces left
            and right, raise both to rotate, and open your mouth to drop faster.
          </p>

          <div className="grid gap-6 text-left md:grid-cols-2">
            <div className="neon-card rounded-lg p-6">
              <h2 className="mb-3 text-lg font-semibold text-[var(--accent)]">
                Controls
              </h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--neon-green)]">←</span> Left eyebrow up = Move
                  left
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--neon-green)]">→</span> Right eyebrow up = Move
                  right
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--neon-purple)]">↻</span> Both eyebrows up =
                  Rotate
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--neon-yellow)]">↓</span> Open mouth = Soft drop
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--neon-orange)]">⬇</span> Both brows + mouth = Hard drop
                </li>
              </ul>
            </div>

            <div className="neon-card rounded-lg p-6">
              <h2 className="mb-3 text-lg font-semibold text-[var(--accent)]">
                Tips
              </h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>• Good lighting helps detection</li>
                <li>• Face the camera directly</li>
                <li>• Exaggerate your expressions</li>
                <li>
                  •{" "}
                  <Link
                    href="/how-to-play"
                    className="text-[var(--blue)] hover:underline"
                  >
                    See all controls
                  </Link>{" "}
                  including keyboard backup
                </li>
              </ul>
            </div>
          </div>

          <section className="mt-12 text-left">
            <h2 className="mb-4 text-lg font-semibold text-[var(--accent)]">
              What is Eyebrow Tetris?
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Eyebrow Tetris is a free online Tetris game you control with your
              face. Using AI-powered webcam face detection (MediaPipe), the game
              reads your eyebrow movements and mouth expressions to move and
              drop Tetris pieces. No downloads, no installs — just open your
              browser and play. Works on Chrome, Firefox, Edge, and Safari.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              New to the game?{" "}
              <Link
                href="/how-to-play"
                className="text-[var(--blue)] hover:underline"
              >
                Learn how to play
              </Link>{" "}
              or check out the{" "}
              <Link
                href="/leaderboard"
                className="text-[var(--blue)] hover:underline"
              >
                leaderboard
              </Link>{" "}
              to see the top scores.
            </p>
          </section>

          <section className="mt-12 text-left">
            <h2 className="mb-4 text-lg font-semibold text-[var(--accent)]">
              Latest Update
            </h2>
            <LatestRelease />
          </section>

          <section className="mt-12 text-left">
            <h2 className="mb-4 text-lg font-semibold text-[var(--accent)]">
              More Webcam Games
            </h2>
            <a
              href="https://pugshunt.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="neon-card group block overflow-hidden rounded-lg transition-colors"
            >
              <Image
                src="/banner-pugshunt.webp"
                alt="Pug's Hunt — a retro Duck Hunt-style browser game controlled by webcam hand tracking"
                width={600}
                height={315}
                className="w-full"
                loading="lazy"
              />
              <div className="p-5">
                <h3 className="mb-2 text-base font-semibold text-[var(--blue)] transition-colors group-hover:text-[var(--blue-hover)]">
                  Pug&apos;s Hunt
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  If you enjoyed Eyebrow Tetris, try Pug&apos;s Hunt — a chaotic
                  Duck Hunt-style{" "}
                  <strong className="text-zinc-300">
                    webcam shooting game
                  </strong>{" "}
                  you control with your fingers and mouth. Point to aim, pinch to
                  shoot. No controller needed.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] transition-colors group-hover:text-[var(--accent-hover)]">
                  Play at pugshunt.com
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                </span>
              </div>
            </a>
          </section>
        </div>
      </div>

      {isPlaying && (
        <GameScreen onGameOver={handleGameOver} onExit={handleExit} />
      )}

      {showMeltScreen && (
        <MeltScreen onComplete={handleMeltComplete} duration={2500} />
      )}

      {showScoreModal && gameStats && (
        <ScoreSubmitModal
          stats={gameStats}
          onSubmit={handleScoreSubmitted}
          onClose={handleScoreModalClose}
        />
      )}

      {showGameOverModal && gameStats && (
        <GameOverModal 
          stats={gameStats} 
          onClose={handleGameOverModalClose} 
          onPlayAgain={handlePlayAgain}
        />
      )}
    </>
  );
}
