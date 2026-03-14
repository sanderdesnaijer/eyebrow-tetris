"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

type SoundName = "move" | "rotate" | "hardFall" | "clearLine" | "gameOver";

const SOUND_PATHS: Record<SoundName, string> = {
  move: "/sounds/move.ogg",
  rotate: "/sounds/rotate.ogg",
  hardFall: "/sounds/hard-fall.ogg",
  clearLine: "/sounds/clear-line.ogg",
  gameOver: "/sounds/game-over.ogg",
};

const MUSIC_PATH = "/sounds/soundtrack.ogg";
const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.6;

export function useGameAudio(muted: boolean) {
  const sfxCache = useRef<Map<SoundName, HTMLAudioElement>>(new Map());
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const getOrCreateSfx = useCallback((name: SoundName): HTMLAudioElement => {
    let el = sfxCache.current.get(name);
    if (!el) {
      el = new Audio(SOUND_PATHS[name]);
      el.volume = SFX_VOLUME;
      sfxCache.current.set(name, el);
    }
    return el;
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (mutedRef.current) return;
      const source = getOrCreateSfx(name);
      const clone = source.cloneNode() as HTMLAudioElement;
      clone.volume = SFX_VOLUME;
      clone.play().catch(() => {});
    },
    [getOrCreateSfx],
  );

  const getOrCreateMusic = useCallback((): HTMLAudioElement => {
    if (!musicRef.current) {
      const el = new Audio(MUSIC_PATH);
      el.loop = true;
      el.volume = MUSIC_VOLUME;
      musicRef.current = el;
    }
    return musicRef.current;
  }, []);

  const startMusic = useCallback(() => {
    const music = getOrCreateMusic();
    music.currentTime = 0;
    music.volume = mutedRef.current ? 0 : MUSIC_VOLUME;
    music.play().catch(() => {});
  }, [getOrCreateMusic]);

  const stopMusic = useCallback(() => {
    const music = musicRef.current;
    if (!music) return;
    music.pause();
    music.currentTime = 0;
  }, []);

  const pauseMusic = useCallback(() => {
    musicRef.current?.pause();
  }, []);

  const resumeMusic = useCallback(() => {
    if (mutedRef.current) return;
    musicRef.current?.play().catch(() => {});
  }, []);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (muted) {
      music.volume = 0;
    } else {
      music.volume = MUSIC_VOLUME;
    }
  }, [muted]);

  useEffect(() => {
    return () => {
      musicRef.current?.pause();
      musicRef.current = null;
      sfxCache.current.clear();
    };
  }, []);

  return useMemo(
    () => ({ play, startMusic, stopMusic, pauseMusic, resumeMusic }),
    [play, startMusic, stopMusic, pauseMusic, resumeMusic],
  );
}
