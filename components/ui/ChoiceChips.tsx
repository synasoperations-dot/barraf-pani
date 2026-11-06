'use client';

import clsx from 'clsx';
import { useId, type ReactNode } from 'react';

export interface ChoiceChip<T extends string> {
  value: T;
  label: ReactNode;
  /** Second line, e.g. "Today" under a date. */
  sub?: ReactNode;
  disabled?: boolean;
}

interface ChoiceChipsProps<T extends string> {
  /** Accessible group name (visible legend). */
  legend: ReactNode;
  options: ChoiceChip<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Scroll horizontally instead of wrapping (day strips on phones). */
  scroll?: boolean;
  className?: string;
}

/**
 * Compact single-choice chips (day / time slots, quick picks). Native radios underneath, so
 * arrow keys and screen readers work; the checked chip turns yellow with a hard shadow. 44px tall.
 */
export function ChoiceChips<T extends string>({
  legend,
  options,
  value,
  onChange,
  scroll,
  className,
}: ChoiceChipsProps<T>) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div
        className={clsx(
          'flex gap-2',
          scroll ? '-mx-1 snap-x overflow-x-auto px-1 pt-0.5 pb-2' : 'flex-wrap',
        )}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={clsx(
              'flex min-h-11 shrink-0 snap-start flex-col items-center justify-center rounded-chip border-2 border-ink px-3 py-1 text-center leading-tight transition-[background-color,box-shadow]',
              'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-yellow has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
              o.disabled
                ? 'cursor-not-allowed bg-paper text-muted line-through'
                : o.value === value
                  ? 'cursor-pointer bg-yellow shadow-hard-sm'
                  : 'cursor-pointer bg-white hover:bg-paper',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="font-bold">{o.label}</span>
            {o.sub && <span className="text-xs text-muted">{o.sub}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
