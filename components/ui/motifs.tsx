import clsx from 'clsx';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

/* ---------- Bolt ---------- */

interface BoltProps extends ComponentPropsWithoutRef<'svg'> {
  size?: number;
}

/** Yellow lightning bolt with a 1.5px ink stroke. Decorative. */
export function Bolt({ size = 28, className, ...rest }: BoltProps) {
  return (
    <svg
      viewBox="0 0 24 32"
      width={size * 0.75}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={clsx('shrink-0 overflow-visible', className)}
      {...rest}
    >
      <path
        d="M15.5 1 3 18.5h8.2L7.5 31 21 12.6h-8.3L17.8 1z"
        fill="var(--color-yellow)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A big and a small bolt, angled outward. Place one on each side of a heading. */
export function BoltPair({ side, scale = 1 }: { side: 'start' | 'end'; scale?: number }) {
  const out = side === 'start' ? -1 : 1;
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-flex items-end gap-0.5',
        side === 'start' ? 'flex-row' : 'flex-row-reverse',
      )}
      style={{ transform: `scaleX(${out === -1 ? 1 : -1})` }}
    >
      <Bolt size={18 * scale} style={{ transform: 'rotate(-28deg) translateY(-6px)' }} />
      <Bolt size={30 * scale} style={{ transform: 'rotate(-12deg)' }} />
    </span>
  );
}

/* ---------- Backgrounds ---------- */

type DivProps = ComponentPropsWithoutRef<'div'>;

/** 22px grid of grid-line on paper (pure CSS). */
export function GridPaper({ className, ...rest }: DivProps) {
  return <div className={clsx('grid-paper', className)} {...rest} />;
}

/** Concentric rings on blue, like the menu cover. Behind heroes and page headers. */
export function Rings({ className, ...rest }: DivProps) {
  return <div className={clsx('rings', className)} {...rest} />;
}

/** Ink halftone dots (~7px pitch, 60% opacity). A strip under sticker headings. */
export function Halftone({ className, ...rest }: DivProps) {
  return <div aria-hidden="true" className={clsx('h-3 halftone', className)} {...rest} />;
}

/* ---------- Wave ---------- */

const WAVES = {
  gentle:
    'M0 20 C 120 0, 240 40, 360 20 S 600 0, 720 20 S 960 40, 1080 20 S 1320 0, 1440 20 V40 H0 Z',
  choppy:
    'M0 22 Q 60 4 120 22 T 240 22 T 360 22 T 480 22 T 600 22 T 720 22 T 840 22 T 960 22 T 1080 22 T 1200 22 T 1320 22 T 1440 22 V40 H0 Z',
  blob: 'M0 26 C 180 -6, 300 40, 520 18 C 700 0, 820 38, 1000 22 C 1160 8, 1300 34, 1440 14 V40 H0 Z',
} as const;
export type WavePreset = keyof typeof WAVES;

interface WaveProps {
  preset?: WavePreset;
  /** Tailwind fill class for the colour of the section *below* the wave, e.g. `fill-orange`. */
  fillClassName?: string;
  /** Flip vertically to sit at the bottom of a section. */
  flip?: boolean;
  className?: string;
}

/** Wavy divider between orange/blue sections. */
export function Wave({
  preset = 'gentle',
  fillClassName = 'fill-orange',
  flip,
  className,
}: WaveProps) {
  return (
    <svg
      viewBox="0 0 1440 40"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={clsx('block h-6 w-full md:h-10', flip && 'rotate-180', className)}
    >
      <path d={WAVES[preset]} className={fillClassName} />
    </svg>
  );
}

/* ---------- Blob ---------- */

interface BlobProps {
  size: number;
  tone?: 'orange' | 'blue';
  className?: string;
  style?: CSSProperties;
}

/** Decorative circle: orange-blob on orange panels, lighter blue on blue. Position it absolutely. */
export function Blob({ size, tone = 'orange', className, style }: BlobProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'pointer-events-none absolute rounded-full',
        tone === 'orange' ? 'bg-orange-blob' : 'bg-blue-light/40',
        className,
      )}
      style={{ width: size, height: size, ...style }}
    />
  );
}
