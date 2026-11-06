'use client';

import clsx from 'clsx';
import { useId } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group name, e.g. "How do you want it?" */
  label: string;
  className?: string;
}

/**
 * Delivery / Pickup style toggle. Native radios underneath, so arrow keys, focus and
 * screen readers work for free. Active segment is blue-deep.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedToggleProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx(
        'inline-flex rounded-button border-3 border-ink bg-white p-1 shadow-hard-sm',
        className,
      )}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={clsx(
            'relative flex min-h-11 cursor-pointer items-center rounded-input px-4 font-display text-lg transition-colors',
            'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-yellow has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
            o.value === value ? 'bg-blue-deep text-white' : 'text-ink hover:bg-paper',
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
