'use client';

import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

interface BadgeProps {
  count: number;
  /** Change this value to play the bump (1 → 1.4 → 1, −10° wobble, 420ms). */
  bumpKey?: unknown;
  className?: string;
}

const BUMP: Keyframe[] = [
  { transform: 'scale(1) rotate(0)' },
  { transform: 'scale(1.4) rotate(-10deg)', offset: 0.4 },
  { transform: 'scale(1) rotate(0)' },
];

/** Count bubble. Decorative: the parent control carries the accessible count. */
export function Badge({ count, bumpKey, className }: BadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!prefersReducedMotion())
      ref.current?.animate(BUMP, { duration: 420, easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)' });
  }, [bumpKey]);

  if (count <= 0) return null;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={clsx(
        'inline-grid min-w-6 place-items-center rounded-full border-2 border-ink bg-yellow px-1.5 font-price text-base leading-6 text-ink',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
