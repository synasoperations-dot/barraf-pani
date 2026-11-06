'use client';

import clsx from 'clsx';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Bolt } from '@/components/ui/motifs';
import type { Order } from '@/lib/contracts';
import { formatAmount } from '@/lib/format';
import { OVERSHOOT } from '@/lib/motion';

// Deterministic pseudo-random so every render (and the style guide) looks the same.
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const COLORS = ['bg-blue', 'bg-orange', 'bg-yellow', 'bg-white'];
const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  left: `${(rnd(i, 1) * 96 + 2).toFixed(1)}%`,
  top: `${(rnd(i, 7) * 90 + 3).toFixed(1)}%`, // static (reduced-motion) position
  delay: 0.2 + rnd(i, 2) * 0.6,
  duration: 2.2 + rnd(i, 3) * 1.4,
  rotate: (rnd(i, 4) - 0.5) * 720,
  drift: (rnd(i, 5) - 0.5) * 120,
  w: 8 + Math.round(rnd(i, 6) * 8),
  h: 10 + Math.round(rnd(i, 8) * 10),
  color: COLORS[i % COLORS.length],
  round: i % 3 === 0,
}));
const BOLTS = [0, 60, 120, 180, 240, 300];

interface CelebrationProps {
  order: Pick<Order, 'number' | 'total' | 'publicToken'>;
  onDismiss: () => void;
  /** Style guide: render in a box instead of a full-screen modal. */
  preview?: boolean;
}

/**
 * "Order placed!" overlay, once per order. Native modal <dialog> (focus moves in, Esc closes,
 * background inert). Logo spins in, 6 bolts burst, 26 confetti pieces fall; under reduced
 * motion everything sits still in its final place. Buttons work immediately.
 */
export function Celebration({ order, onDismiss, preview }: CelebrationProps) {
  const t = useTranslations('receipt.celebrate');
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduced = useReducedMotion();

  useEffect(() => {
    const d = ref.current;
    if (preview) return;
    if (d && !d.open) d.showModal();
    navigator.vibrate?.(40);
    return () => d?.close();
  }, [preview]);

  const body = (
    <MotionConfig reducedMotion="user">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI.map((c, i) => {
          const cls = clsx(
            'absolute border-2 border-ink',
            c.color,
            c.round ? 'rounded-full' : 'rounded-[2px]',
          );
          const size = { insetInlineStart: c.left, width: c.w, height: c.h };
          return reduced ? (
            <span
              key={i}
              className={cls}
              style={{ ...size, top: c.top, rotate: `${c.rotate}deg` }}
            />
          ) : (
            <motion.span
              key={i}
              className={cls}
              style={{ ...size, top: 0 }}
              initial={{ y: '-10vh', x: 0, rotate: 0 }}
              animate={{ y: '110vh', x: c.drift, rotate: c.rotate }}
              transition={{ duration: c.duration, delay: c.delay, ease: 'easeIn' }}
            />
          );
        })}
      </div>

      <div className="relative flex min-h-full flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <div className="relative grid place-items-center">
          {BOLTS.map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <motion.span
                key={a}
                aria-hidden="true"
                className="absolute"
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                animate={{ x: Math.cos(rad) * 120, y: Math.sin(rad) * 120, scale: 1, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.45, ease: OVERSHOOT }}
              >
                <Bolt size={40} style={{ rotate: `${a + 90}deg` }} />
              </motion.span>
            );
          })}
          <motion.div
            initial={{ scale: 0, rotate: -200 }}
            animate={{ scale: [0, 1.15, 1], rotate: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <Logo size={140} />
          </motion.div>
        </div>

        <h2
          id={titleId}
          className="mt-6 font-display text-6xl leading-none text-white headline md:text-8xl"
        >
          {t('title')}
        </h2>
        <motion.p
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.26, ease: OVERSHOOT }}
          className="-rotate-2 rounded-sticker border-3 border-ink bg-white px-4 pt-2 pb-1.5 font-price text-2xl tracking-[0.02em] text-ink shadow-sticker md:text-3xl"
        >
          {t('sticker', { number: order.number, total: formatAmount(order.total) })}
        </motion.p>
        <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href={`/track/${encodeURIComponent(order.publicToken)}`}
            className={buttonClasses({ size: 'lg' })}
          >
            {t('track')}
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className={buttonClasses({ variant: 'ghost', size: 'lg' })}
          >
            {t('dismiss')}
          </button>
        </div>
      </div>
    </MotionConfig>
  );

  if (preview)
    return (
      <div
        role="group"
        aria-labelledby={titleId}
        className="relative h-[40rem] overflow-hidden rounded-panel border-3 border-ink rings"
      >
        {body}
      </div>
    );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onDismiss();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto border-0 rings p-0 text-ink backdrop:bg-ink"
    >
      {body}
    </dialog>
  );
}
