import clsx from 'clsx';
import type { ReactNode } from 'react';
import { tilt as tiltCss } from '@/lib/tilt';

const TONES = {
  ink: 'border-ink bg-ink text-white',
  orange: 'border-ink bg-orange text-ink',
  yellow: 'border-ink bg-yellow text-ink',
  white: 'border-ink bg-white text-ink',
} as const;

interface StampProps {
  children: ReactNode;
  tone?: keyof typeof TONES;
  /** Degrees; stamps sit crooked (default −12°, like `stamp` in lib/motion). */
  tilt?: number;
  /** Play the stamp-in animation (scale 1.6 → 1). Off for static/server renders. */
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'px-2 pt-0.5 text-lg',
  md: 'px-3 pt-1 text-2xl',
  lg: 'px-4 pt-1.5 text-4xl',
} as const;

/**
 * Rubber stamp: "SOLD OUT TODAY", "Done", "Accepted!". Bebas, double ink outline, tilted.
 * Position it absolutely over the thing it stamps. Decorative tilt only; text stays readable.
 */
export function Stamp({
  children,
  tone = 'ink',
  tilt = -12,
  animate,
  size = 'md',
  className,
}: StampProps) {
  return (
    // The `stamp` keyframes already rotate −12°, so the wrapper adds only the difference.
    <span
      className={clsx('inline-block', className)}
      style={{ rotate: tiltCss(animate ? tilt + 12 : tilt) }}
    >
      <span
        className={clsx(
          animate && 'animate-stamp',
          'inline-block rounded-chip border-3 font-price leading-none tracking-[0.06em] whitespace-nowrap uppercase shadow-hard-sm outline-2 outline-offset-2 outline-ink',
          TONES[tone],
          SIZES[size],
        )}
      >
        {children}
      </span>
    </span>
  );
}
