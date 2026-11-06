/* Brand art for next/og (Satori): only flexbox + basic CSS, colours from the design tokens. */
import { colors } from '@/tailwind.config';

/** Round orange badge with BARRAF / PAANI, like components/ui/Logo (CSS recreation, TBC SVG). */
export function BrandBadge({ size }: { size: number }) {
  const b = Math.max(3, Math.round(size * 0.045));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: colors.orange,
        border: `${b}px solid ${colors.ink}`,
        boxShadow: `${b * 1.5}px ${b * 1.5}px 0 ${colors.ink}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        fontWeight: 900,
      }}
    >
      <div style={{ color: colors['blue-light'], fontSize: size * 0.24, letterSpacing: -1 }}>
        BARRAF
      </div>
      <div style={{ color: colors.yellow, fontSize: size * 0.26, letterSpacing: -1 }}>PAANI</div>
    </div>
  );
}

/** Concentric "Rings" on blue (the menu-cover motif) as stacked circles. */
export function RingsBackdrop({ width, height }: { width: number; height: number }) {
  const max = Math.hypot(width, height);
  const rings = Array.from({ length: Math.ceil(max / 44) }, (_, i) => (i + 1) * 44);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: colors.blue }}>
      {rings.map((r) => (
        <div
          key={r}
          style={{
            position: 'absolute',
            left: width / 2 - r,
            top: height / 2 - r,
            width: r * 2,
            height: r * 2,
            borderRadius: r * 2,
            border: '8px solid rgba(255,255,255,0.13)',
          }}
        />
      ))}
    </div>
  );
}
