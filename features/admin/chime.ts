'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * New-order sounds synthesised with Web Audio (no audio files). Browsers only allow sound after a
 * user gesture, so the board shows "Tap to enable sound" until `unlock()` runs from a click.
 */
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

export const isSoundUnlocked = () => ctx?.state === 'running';

export async function unlockSound() {
  ctx ??= new AudioContext();
  await ctx.resume();
  listeners.forEach((l) => l());
}

function tone(freq: number, start: number, length: number, gain: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + length);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + length + 0.05);
}

/** Loud three-note order chime. */
export const playOrderChime = () => {
  tone(880, 0, 0.18, 0.5);
  tone(1175, 0.2, 0.18, 0.5);
  tone(1568, 0.4, 0.35, 0.5);
};

/** Softer two-note chime for booking requests. */
export const playBookingChime = () => {
  tone(660, 0, 0.25, 0.2);
  tone(990, 0.25, 0.4, 0.2);
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

export const useSoundUnlocked = () => useSyncExternalStore(subscribe, isSoundUnlocked, () => false);

/** Repeats `play` every `everyMs` while `active` (and sound is unlocked). */
export function useRepeatingChime(active: boolean, play = playOrderChime, everyMs = 3000) {
  const unlocked = useSoundUnlocked();
  useEffect(() => {
    if (!active || !unlocked) return;
    play();
    const id = setInterval(play, everyMs);
    return () => clearInterval(id);
  }, [active, unlocked, play, everyMs]);
  return unlocked;
}

/** "(2) New orders" in the tab title while orders wait; restores the title after. */
export function useTitleBadge(count: number, label: (n: number) => string) {
  useEffect(() => {
    if (!count) return;
    const before = document.title;
    document.title = `(${count}) ${label(count)}`;
    return () => {
      document.title = before;
    };
  }, [count, label]);
}
