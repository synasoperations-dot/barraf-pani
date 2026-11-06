'use client';

import { useEffect, useState } from 'react';

/** Re-renders every `ms` with the current time (age timers, countdowns, release times). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** 75 000 ms → "1:15"; 3 900 000 → "1:05:00". */
export function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** next-intl dateTime options for "Fri 8:30 PM" (the provider pins Asia/Karachi). */
export const SHORT_TIME = { weekday: 'short', hour: 'numeric', minute: '2-digit' } as const;
