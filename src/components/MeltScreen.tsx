"use client";

import { useEffect, useState, useMemo } from "react";

/** Deterministic pseudo-random 0–1 from index + seed (avoids Math.random during render) */
function drand(i: number, seed: number): number {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return ((x - Math.floor(x)) * 0.5 + 0.5) % 1;
}

interface MeltScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function MeltScreen({ onComplete, duration = 2500 }: MeltScreenProps) {
  const [phase, setPhase] = useState<"melting" | "fading" | "complete">("melting");

  // Generate deterministic drip data (stable across re-renders)
  const drips = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        left: (i / 30) * 100 + (drand(i, 1) - 0.5) * 3,
        width: 6 + drand(i, 2) * 20,
        delay: i * 0.05 + drand(i, 3) * 0.2,
        duration: 1.2 + drand(i, 4) * 0.8,
        hue: drand(i, 5) * 360,
      })),
    [],
  );

  const secondaryDrips = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: (i / 15) * 100 + drand(i, 10) * 6,
        width: 15 + drand(i, 11) * 30,
        duration: 1.8 + drand(i, 12) * 0.5,
      })),
    [],
  );

  const glitchLines = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        top: 10 + i * 12,
        grad: [
          drand(i, 20) * 30,
          30 + drand(i, 21) * 10,
          50 + drand(i, 22) * 10,
          70 + drand(i, 23) * 30,
        ] as const,
        anim: 0.1 + drand(i, 24) * 0.2,
        delay: 0.5 + i * 0.1,
      })),
    [],
  );

  useEffect(() => {
    // Phase timing
    const meltTimer = setTimeout(() => {
      setPhase("fading");
    }, duration * 0.8);

    const completeTimer = setTimeout(() => {
      setPhase("complete");
      onComplete();
    }, duration);

    return () => {
      clearTimeout(meltTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[55] transition-opacity duration-500 ${
        phase === "complete" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Dark overlay that fades in */}
      <div 
        className="absolute inset-0 bg-black transition-opacity duration-1000"
        style={{ opacity: phase === "melting" ? 0.3 : 0.9 }}
      />

      {/* Vertical drip columns - the main melt effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {drips.map((drip) => (
          <div
            key={drip.id}
            className="absolute top-0 animate-melt-drip"
            style={{
              left: `${drip.left}%`,
              width: `${drip.width}px`,
              background: `linear-gradient(
                to bottom,
                transparent 0%,
                rgba(0, 0, 0, 0.95) 5%,
                rgba(15, 15, 15, 0.98) 20%,
                rgba(10, 10, 10, 1) 50%,
                rgba(5, 5, 5, 0.95) 80%,
                rgba(0, 0, 0, 0.9) 100%
              )`,
              animationDelay: `${drip.delay}s`,
              animationDuration: `${drip.duration}s`,
              boxShadow: `
                0 0 ${drip.width}px rgba(0, 0, 0, 0.8),
                inset 0 0 ${drip.width / 2}px rgba(30, 30, 30, 0.3)
              `,
            }}
          />
        ))}
      </div>

      {/* Secondary drip layer for depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {secondaryDrips.map((drip) => (
          <div
            key={`secondary-${drip.id}`}
            className="absolute top-0 animate-melt-drip"
            style={{
              left: `${drip.left}%`,
              width: `${drip.width}px`,
              background: `linear-gradient(
                to bottom,
                transparent 0%,
                rgba(20, 20, 20, 0.7) 10%,
                rgba(10, 10, 10, 0.9) 100%
              )`,
              animationDelay: `${0.3 + drip.id * 0.1}s`,
              animationDuration: `${drip.duration}s`,
              filter: "blur(2px)",
            }}
          />
        ))}
      </div>

      {/* Glitch/distortion lines */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {glitchLines.map((line) => (
          <div
            key={`glitch-${line.id}`}
            className="absolute h-1 w-full"
            style={{
              top: `${line.top}%`,
              background: `linear-gradient(
                90deg,
                transparent ${line.grad[0]}%,
                rgba(255, 0, 0, 0.1) ${line.grad[1]}%,
                rgba(0, 255, 255, 0.1) ${line.grad[2]}%,
                transparent ${line.grad[3]}%
              )`,
              animation: `melt-glitch-line ${line.anim}s linear ${line.delay}s infinite`,
              opacity: phase === "melting" ? 0.6 : 0,
              transition: "opacity 0.3s",
            }}
          />
        ))}
      </div>

      {/* "GAME OVER" text that appears during melt */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: "melt-text-appear 1s ease-out 0.5s forwards",
          opacity: 0,
        }}
      >
        <div className="relative">
          {/* Glow effect behind text */}
          <div 
            className="pixel-font absolute inset-0 text-4xl text-red-600 blur-xl sm:text-5xl md:text-6xl"
            style={{ transform: "scale(1.2)" }}
          >
            GAME OVER
          </div>
          {/* Main text */}
          <div 
            className="pixel-font relative text-4xl text-red-500 sm:text-5xl md:text-6xl"
            style={{
              textShadow: `
                0 0 10px rgba(239, 68, 68, 0.8),
                0 0 20px rgba(239, 68, 68, 0.6),
                0 0 40px rgba(239, 68, 68, 0.4),
                0 2px 0 #7f1d1d
              `,
            }}
          >
            GAME OVER
          </div>
        </div>
      </div>

      {/* Scanline effect for retro feel */}
      <div 
        className="pointer-events-none absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)",
          opacity: 0.3,
        }}
      />
    </div>
  );
}
