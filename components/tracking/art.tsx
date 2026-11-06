import clsx from 'clsx';

/*
 * Comic panel illustrations (inline SVG, ink strokes, token colours only). Motion is CSS
 * keyframes behind `motion-safe:`, so prefers-reduced-motion gets still pictures.
 */

const KEYFRAMES = `
@keyframes bp-bob { 0%,100% { transform: translateY(0) rotate(-3deg) } 50% { transform: translateY(-8px) rotate(2deg) } }
@keyframes bp-wiggle { 0%,100% { transform: rotate(-4deg) scaleY(1) } 50% { transform: rotate(4deg) scaleY(1.08) } }
@keyframes bp-road { to { background-position: -40px 0 } }
@keyframes bp-ride { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
`;

/** Hoisted and de-duplicated by React 19 (`href` + `precedence`). */
export const ArtKeyframes = () => (
  <style href="bp-tracking-art" precedence="default">
    {KEYFRAMES}
  </style>
);

const stroke = {
  stroke: 'var(--color-ink)',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function ReceiptArt({ bob }: { bob?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 100"
      aria-hidden="true"
      className={clsx(
        'h-24 w-auto',
        bob && 'motion-safe:animate-[bp-bob_1.8s_ease-in-out_infinite]',
      )}
    >
      <path
        d="M12 6h56v84l-7-5-7 5-7-5-7 5-7-5-7 5-7-5-7 5Z"
        fill="var(--color-white)"
        {...stroke}
      />
      <path d="M22 24h36M22 36h28M22 48h36M22 60h20" fill="none" {...stroke} strokeWidth={2.5} />
      <path d="M46 70h12" fill="none" {...stroke} stroke="var(--color-orange)" strokeWidth={4} />
    </svg>
  );
}

export function FlameArt({ wiggle }: { wiggle?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 100"
      aria-hidden="true"
      className={clsx(
        'h-24 w-auto origin-bottom',
        wiggle && 'motion-safe:animate-[bp-wiggle_0.9s_ease-in-out_infinite]',
      )}
    >
      <path
        d="M40 96c20 0 32-13 32-30 0-20-14-30-19-50-9 9-14 18-14 28-5-5-9-10-9-19C19 35 8 47 8 66c0 17 12 30 32 30Z"
        fill="var(--color-orange)"
        {...stroke}
      />
      <path
        d="M40 92c10 0 16-7 16-16 0-10-7-15-10-25-5 6-8 11-8 17-3-3-5-6-5-10-6 6-9 11-9 18 0 9 6 16 16 16Z"
        fill="var(--color-yellow)"
        {...stroke}
        strokeWidth={2.5}
      />
    </svg>
  );
}

export function BagArt() {
  return (
    <svg viewBox="0 0 90 100" aria-hidden="true" className="h-24 w-auto">
      <path d="M14 34h62l-5 60H19Z" fill="var(--color-white)" {...stroke} />
      <path d="M31 34V24a14 14 0 0 1 28 0v10" fill="none" {...stroke} />
      <path
        d="m36 62 7 7 13-15"
        fill="none"
        {...stroke}
        stroke="var(--color-orange)"
        strokeWidth={4}
      />
    </svg>
  );
}

/** Rider on a scooter over a moving dashed road. Flips in RTL so it rides toward the end. */
export function RideArt({ moving }: { moving?: boolean }) {
  return (
    <div aria-hidden="true" className="relative w-full max-w-64 rtl:-scale-x-100">
      <svg
        viewBox="0 0 120 80"
        className={clsx(
          'mx-auto h-20 w-auto',
          moving && 'motion-safe:animate-[bp-ride_0.5s_ease-in-out_infinite]',
        )}
      >
        <path d="M24 58h52l12-26H70" fill="none" {...stroke} />
        <path d="M70 32h14l6 12" fill="none" {...stroke} />
        <path d="M30 40h30l6 18H24Z" fill="var(--color-blue)" {...stroke} />
        <circle cx="46" cy="22" r="9" fill="var(--color-yellow)" {...stroke} />
        <path d="M46 31v10l14 4" fill="none" {...stroke} />
        <circle cx="28" cy="62" r="9" fill="var(--color-white)" {...stroke} />
        <circle cx="90" cy="62" r="9" fill="var(--color-white)" {...stroke} />
        <path d="M2 30h14M6 42h10" fill="none" {...stroke} strokeWidth={2.5} />
      </svg>
      <div
        className={clsx(
          'mt-1 h-1.5 rounded-full',
          moving && 'motion-safe:animate-[bp-road_0.6s_linear_infinite]',
        )}
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, var(--color-ink) 0 22px, transparent 22px 40px)',
        }}
      />
    </div>
  );
}

export function CounterArt() {
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className="h-24 w-auto">
      <path d="M30 22h44l-4 44H34Z" fill="var(--color-white)" {...stroke} />
      <path d="M42 22v-6a10 10 0 0 1 20 0v6" fill="none" {...stroke} />
      <path d="M6 66h108v18H6Z" fill="var(--color-blue-light)" {...stroke} />
      <path d="M84 30h26v18H84Z" fill="var(--color-yellow)" {...stroke} strokeWidth={2.5} />
      <path d="m90 39 4 4 9-9" fill="none" {...stroke} strokeWidth={2.5} />
    </svg>
  );
}

export function PlateArt() {
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className="h-24 w-auto">
      <ellipse cx="60" cy="70" rx="52" ry="12" fill="var(--color-white)" {...stroke} />
      <path d="M26 58c0-22 15-36 34-36s34 14 34 36Z" fill="var(--color-orange)" {...stroke} />
      <path d="M22 60h76" fill="none" {...stroke} stroke="var(--color-yellow)" strokeWidth={6} />
      <path d="M22 60h76" fill="none" {...stroke} strokeWidth={1.5} />
      <path d="M44 36v4M60 32v4M76 36v4" fill="none" {...stroke} stroke="var(--color-white)" />
    </svg>
  );
}
