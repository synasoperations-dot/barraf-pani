'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

interface CountdownProps {
  /** Target time (ISO string or Date). */
  to: string | Date;
  onExpire?: () => void;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function format(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/**
 * mm:ss (or h:mm:ss) countdown, e.g. payment expiry or the 8-minute accept window.
 * Visually ticks every second; screen readers get a static label (no per-second chatter).
 */
export function Countdown({ to, onExpire, className }: CountdownProps) {
  const t = useTranslations('countdown');
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const left = target - now;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [left, onExpire]);

  const text = left > 0 ? format(left) : null;
  return (
    <span
      role="timer"
      suppressHydrationWarning
      aria-label={text ? t('left', { time: text }) : t('expired')}
      className={clsx('font-price tracking-[0.02em] tabular-nums', className)}
    >
      <span aria-hidden="true" suppressHydrationWarning>
        {text ?? t('expired')}
      </span>
    </span>
  );
}
