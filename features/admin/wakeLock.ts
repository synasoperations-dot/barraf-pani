'use client';

import { useEffect, useState } from 'react';

/** Keeps the kitchen tablet's screen on (Wake Lock API); re-acquired when the tab comes back. */
export function useWakeLock(enabled = true) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) return void lock.release();
        setHeld(true);
        lock.addEventListener('release', () => setHeld(false));
      } catch {
        setHeld(false); // battery saver or not visible: try again on the next visibility change
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [enabled]);
  return held;
}
