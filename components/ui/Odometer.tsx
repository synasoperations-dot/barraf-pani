'use client';

import clsx from 'clsx';
import { formatAmount } from '@/lib/format';

const DIGITS = '0123456789';

/**
 * Number roll for totals. Each digit is a vertical strip translated with a CSS transition
 * (reduced motion collapses it to an instant change). Screen readers get the plain value.
 */
export function Odometer({
  value,
  prefix = 'Rs ',
  className,
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const text = formatAmount(value);
  return (
    <span
      className={clsx('inline-flex items-baseline font-price leading-none tabular-nums', className)}
    >
      <span className="sr-only">
        {prefix}
        {text}
      </span>
      <span aria-hidden="true" className="inline-flex">
        {prefix && <span className="whitespace-pre">{prefix}</span>}
        {[...text].map((ch, i) =>
          DIGITS.includes(ch) ? (
            <span key={text.length - i} className="relative inline-block h-[1em] overflow-hidden">
              <span
                className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.2,1.2,0.4,1)]"
                style={{ transform: `translateY(-${Number(ch) * 10}%)` }}
              >
                {[...DIGITS].map((d) => (
                  <span key={d} className="h-[1em]">
                    {d}
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span key={`s${text.length - i}`}>{ch}</span>
          ),
        )}
      </span>
    </span>
  );
}
