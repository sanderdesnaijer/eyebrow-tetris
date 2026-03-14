"use client";

import { useState, useEffect, useCallback } from "react";

const TUTORIAL_SEEN_KEY = "eyebrow-tetris-tutorial-seen";

export const EYEBROW_CONTROLS = [
  { label: "Left eyebrow up", action: "Move left", icon: "←" },
  { label: "Right eyebrow up", action: "Move right", icon: "→" },
  { label: "Both eyebrows up", action: "Rotate piece", icon: "↻" },
  { label: "Open mouth", action: "Soft drop", icon: "↓" },
  { label: "Both brows + mouth", action: "Hard drop", icon: "⬇" },
] as const;

export function hasSeenTutorial(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";
}

export function markTutorialSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
}

interface TutorialOverlayProps {
  onDismiss: () => void;
  forceShow?: boolean;
}

export function TutorialOverlay({ onDismiss, forceShow }: TutorialOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shouldShow = forceShow || !hasSeenTutorial();
    if (shouldShow) {
      queueMicrotask(() => setVisible(true));
    }
  }, [forceShow]);

  const handleDismiss = useCallback(() => {
    markTutorialSeen();
    setVisible(false);
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, handleDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-tutorial-fade-in">
      <div className="mx-4 w-full max-w-sm animate-tutorial-slide-up rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a1a] p-6 shadow-[0_0_30px_rgba(0,229,255,0.08)]">
        <h2
          className="pixel-font mb-5 text-center text-sm leading-relaxed"
          style={{
            color: "#ffb84d",
            textShadow: "0 0 8px rgba(255,184,77,0.5)",
          }}
        >
          EYEBROW CONTROLS
        </h2>

        <div className="flex flex-col gap-2">
          {EYEBROW_CONTROLS.map((ctrl, i) => (
            <div
              key={ctrl.action}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 animate-tutorial-slide-up"
              style={{ animationDelay: `${0.1 + i * 0.06}s` }}
            >
              <span
                className="min-w-[28px] text-center text-lg"
                style={{ color: "#00e5ff" }}
              >
                {ctrl.icon}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-zinc-200">
                  {ctrl.label}
                </div>
                <div className="text-xs text-zinc-500">{ctrl.action}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Keyboard backup: arrow keys / WASD + Space
        </p>

        <button
          type="button"
          onClick={handleDismiss}
          className="mt-5 w-full animate-pulse-glow rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-[0.97]"
        >
          Got it, let&apos;s play!
        </button>
      </div>
    </div>
  );
}
