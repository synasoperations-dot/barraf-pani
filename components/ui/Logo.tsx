import clsx from 'clsx';

// TODO: replace with client SVG logo

interface LogoProps {
  /** Diameter in px. */
  size?: number;
  className?: string;
  /** Accessible name; omit when a parent link already has one. */
  label?: string;
}

/** Round orange badge: "BARRAF" in blue-light over "PAANI" in yellow, ink-stroked Lilita One. */
export function Logo({ size = 64, className, label }: LogoProps) {
  const stroke = Math.max(1.5, size / 36);
  const text = {
    WebkitTextStroke: `${stroke}px var(--color-ink)`,
    paintOrder: 'stroke fill',
    lineHeight: 0.9,
  } as const;
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={clsx(
        'inline-flex shrink-0 flex-col items-center justify-center rounded-full border-3 border-ink bg-orange font-display shadow-hard-sm',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span className="text-blue-light" style={{ ...text, fontSize: size * 0.24 }}>
        BARRAF
      </span>
      <span className="text-yellow" style={{ ...text, fontSize: size * 0.27 }}>
        PAANI
      </span>
    </span>
  );
}

/** Big footer wordmark. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <p aria-hidden="true" className={clsx('font-display leading-none headline', className)}>
      <span className="text-blue-light">BARRAF </span>
      <span className="text-yellow">PAANI</span>
    </p>
  );
}
