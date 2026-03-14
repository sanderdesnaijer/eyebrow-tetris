"use client";

import { useState, useEffect, useRef } from "react";
import type { GameStats } from "./TetrisOverlay";
import { GameStatsDisplay } from "./GameStatsDisplay";
import { submitScore } from "@/lib/supabase";

interface ScoreSubmitModalProps {
  stats: GameStats;
  onSubmit: () => void;
  onClose: () => void;
}

const NICKNAME_KEY = "eyebrow-tetris-nickname";
const LAST_SUBMIT_KEY = "eyebrow-tetris-last-submit";
const RATE_LIMIT_MS = 60000;

function sanitizeNickname(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
}

function getSavedNickname(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NICKNAME_KEY) || "";
}

function checkRateLimited(): boolean {
  if (typeof window === "undefined") return false;
  const lastSubmit = localStorage.getItem(LAST_SUBMIT_KEY);
  if (!lastSubmit) return false;
  const timeSince = Date.now() - parseInt(lastSubmit, 10);
  return timeSince < RATE_LIMIT_MS;
}

export function ScoreSubmitModal({
  stats,
  onSubmit,
  onClose,
}: ScoreSubmitModalProps) {
  const [nickname, setNickname] = useState(getSavedNickname);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [rateLimited, setRateLimited] = useState(checkRateLimited);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (rateLimited) {
      const lastSubmit = localStorage.getItem(LAST_SUBMIT_KEY);
      if (lastSubmit) {
        const timeSince = Date.now() - parseInt(lastSubmit, 10);
        const remaining = Math.max(0, RATE_LIMIT_MS - timeSince);
        timerRef.current = setTimeout(() => setRateLimited(false), remaining);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [rateLimited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitized = sanitizeNickname(nickname);
    if (!sanitized || sanitized.length < 2) {
      setError("Nickname must be 2-20 alphanumeric characters");
      return;
    }

    if (rateLimited) {
      setError("Please wait before submitting another score");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await submitScore(
      sanitized,
      stats.score,
      stats.level,
      stats.lines,
      stats.inputMode
    );

    if (result.success) {
      localStorage.setItem(NICKNAME_KEY, sanitized);
      localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
      setSubmitted(true);
      setTimeout(onSubmit, 1500);
    } else {
      setError(result.error || "Failed to submit score");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-[var(--neon-green)]/20 bg-[#0c0c1e] p-6"
        style={{ boxShadow: "0 0 30px rgba(0, 255, 133, 0.06), 0 0 60px rgba(0, 240, 255, 0.03)" }}
      >
        <h2 className="neon-text-cyan pixel-font mb-4 text-center text-lg text-[var(--blue)]">
          HIGH SCORE!
        </h2>

        <GameStatsDisplay
          stats={stats}
          scoreClassName="text-3xl font-bold text-[var(--neon-green)]"
          scoreStyle={{ textShadow: "0 0 10px rgba(0, 255, 133, 0.5), 0 0 20px rgba(0, 255, 133, 0.2)" }}
        />

        {submitted ? (
          <div className="py-4 text-center">
            <p className="text-lg text-green-400">Score submitted!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="nickname"
                className="mb-2 block text-sm text-zinc-400"
              >
                Enter your nickname to submit to leaderboard
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(sanitizeNickname(e.target.value))}
                placeholder="YourNickname"
                maxLength={20}
                className="neon-input w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-white placeholder-zinc-500 focus:border-[var(--blue)] focus:outline-none"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-zinc-500">
                2-20 characters (letters, numbers, - and _)
              </p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-zinc-600 px-4 py-3 text-zinc-300 transition hover:border-[var(--blue)]/30 hover:bg-zinc-800"
                disabled={isSubmitting}
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rateLimited}
                className="flex-1 rounded-lg bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Score"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
