'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

const btn =
  'press grid place-items-center rounded-chip border-2 border-ink bg-white font-display leading-none shadow-hard-sm [--press-x:3px] [--press-y:3px] disabled:bg-grid-line disabled:text-muted disabled:shadow-none';

/** Quantity stepper. Number in Bebas; announces changes politely. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 50,
  size = 'md',
  className,
}: StepperProps) {
  const t = useTranslations('qty');
  const dim = size === 'sm' ? 'size-9 text-xl' : 'size-11 text-2xl';
  return (
    <div
      role="group"
      aria-label={t('label')}
      className={clsx('inline-flex items-center gap-2', className)}
    >
      <button
        type="button"
        className={clsx(btn, dim)}
        aria-label={t('decrease')}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output
        aria-live="polite"
        className={clsx(
          'min-w-8 text-center font-price leading-none',
          size === 'sm' ? 'text-2xl' : 'text-3xl',
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={clsx(btn, dim)}
        aria-label={t('increase')}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
