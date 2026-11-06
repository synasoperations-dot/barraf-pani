/**
 * Barraf Paani design tokens: the single source of truth (docs/DESIGN.md).
 * Loaded by app/globals.css via `@config`. The plugin below also publishes every colour,
 * shadow and radius as a CSS variable (`var(--color-ink)`, …) for SVGs and inline styles.
 * `theme` (not `extend`) replaces Tailwind's defaults, so only brand tokens exist.
 */
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export const colors = {
  blue: '#1C9AD6',
  'blue-deep': '#0B6BA6',
  'blue-light': '#6CCFFF',
  orange: '#F26522',
  'orange-deep': '#D9551A',
  'orange-blob': '#E2581C',
  yellow: '#FFD43B',
  ink: '#14181F',
  paper: '#F7FAFC',
  'grid-line': '#DCE8F0',
  muted: '#4A5560',
  whatsapp: '#25D366',
  white: '#FFFFFF',
  transparent: 'transparent',
  current: 'currentColor',
} as const;

const ink = colors.ink;

/** Hard offset shadows only. Never blurred. */
export const shadows = {
  'hard-sm': `3px 3px 0 ${ink}`,
  hard: `4px 4px 0 ${ink}`,
  'hard-md': `6px 6px 0 ${ink}`,
  'hard-lg': `8px 8px 0 ${ink}`,
  sticker: `0 6px 0 ${ink}`,
  'hard-orange': `4px 4px 0 ${colors.orange}`,
  none: '0 0 0 transparent',
} as const;

export const radii = {
  none: '0',
  chip: '10px',
  sticker: '12px',
  input: '14px',
  button: '16px',
  card: '22px',
  panel: '28px',
  full: '9999px',
} as const;

const OVERSHOOT = 'cubic-bezier(0.2, 1.4, 0.4, 1)';

const config = {
  theme: {
    colors,
    boxShadow: shadows,
    borderRadius: radii,
    fontFamily: {
      // Urdu fonts are only attached for `ur`; Latin faces lack Arabic glyphs, so Urdu falls through.
      display: ['var(--font-lilita, system-ui)', 'var(--font-lalezar, system-ui)', 'sans-serif'],
      sticker: ['var(--font-poppins, system-ui)', 'var(--font-lalezar, system-ui)', 'sans-serif'],
      price: ['var(--font-bebas, system-ui)', 'sans-serif'],
      body: ['var(--font-dm-sans, system-ui)', 'var(--font-nastaliq, system-ui)', 'sans-serif'],
      mono: ['ui-monospace', 'monospace'],
    },
    extend: {
      transitionTimingFunction: { overshoot: OVERSHOOT },
      keyframes: {
        pop: {
          from: { transform: 'scale(0.85)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        stamp: {
          from: { transform: 'scale(1.6) rotate(-12deg)', opacity: '0' },
          to: { transform: 'scale(1) rotate(-12deg)', opacity: '1' },
        },
        bump: {
          '0%': { transform: 'scale(1) rotate(0)' },
          '40%': { transform: 'scale(1.4) rotate(-10deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0, 0 0, 0 0' },
          to: { backgroundPosition: '200% 0, 0 0, 0 0' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        pop: `pop 260ms ${OVERSHOOT} both`,
        stamp: `stamp 380ms ${OVERSHOOT} both`,
        bump: `bump 420ms ${OVERSHOOT}`,
        shimmer: 'shimmer 1.4s linear infinite',
        'fade-in': 'fade-in 200ms ease-out both',
      },
    },
  },
  plugins: [
    // Publish tokens as CSS variables from the same objects (no second copy of any value).
    plugin(({ addBase }) => {
      const vars: Record<string, string> = { '--ease-overshoot': OVERSHOOT };
      for (const [k, v] of Object.entries(colors)) vars[`--color-${k}`] = v;
      for (const [k, v] of Object.entries(shadows)) vars[`--shadow-${k}`] = v;
      for (const [k, v] of Object.entries(radii)) vars[`--radius-${k}`] = v;
      addBase({ ':root': vars });
    }),
  ],
} satisfies Omit<Config, 'content'>;

export default config;
