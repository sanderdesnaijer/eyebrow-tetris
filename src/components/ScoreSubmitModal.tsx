"use client";

import { useState, useEffect, useRef } from "react";
import type { GameStats } from "./TetrisOverlay";
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
          <p className={`text-sm ${stats.inputMode === 'eyebrow' ? 'text-green-400' : 'text-amber-400'}`}>
            {stats.inputMode === 'eyebrow' ? '👁️ Eyebrow Leaderboard' : '⌨️ Keyboard Leaderboard'}
          </p>
        </div>

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
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none"
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
                className="flex-1 rounded-lg border border-zinc-600 px-4 py-3 text-zinc-300 transition hover:bg-zinc-800"
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
