'use client';

import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';
import { formatAmount } from '@/lib/format';
import { prefersReducedMotion } from '@/lib/motion';

interface PriceChipProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  price: number;
  /** Size / option label, e.g. "S" or "Large". */
  label?: string;
  selected?: boolean;
  /** `panel` = white outline on orange/blue; `paper` = ink outline on light backgrounds. */
  tone?: 'panel' | 'paper';
}

const FLASH: Keyframe[] = [
  { transform: 'scale(1) rotate(0)' },
  {
    transform: 'scale(1.12) rotate(-4deg)',
    backgroundColor: 'var(--color-yellow)',
    color: 'var(--color-ink)',
    offset: 0.45,
  },
  { transform: 'scale(1) rotate(0)' },
];

/**
 * Outlined price button like the menu boards. On tap it flashes yellow and bounces
 * (scale 1.12, rotate −4°). Prices are always Bebas Neue.
 */
export function PriceChip({
  price,
  label,
  selected,
  tone = 'panel',
  className,
  onClick,
  ...rest
}: PriceChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(e) => {
        if (!prefersReducedMotion())
          e.currentTarget.animate(FLASH, {
            duration: 320,
            easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)',
          });
        onClick?.(e);
      }}
      className={clsx(
        'inline-flex min-h-11 items-baseline gap-1.5 rounded-chip border-3 px-3 pt-1 font-price text-2xl leading-none tracking-[0.02em] uppercase',
        selected
          ? 'border-ink bg-yellow text-ink shadow-hard-sm'
          : tone === 'panel'
            ? 'border-white text-white'
            : 'border-ink bg-white text-ink',
        className,
      )}
      {...rest}
    >
      {label && <span className="text-xl opacity-90">{label}</span>}
      <span>{formatAmount(price)}</span>
    </button>
  );
}
