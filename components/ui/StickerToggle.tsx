'use client';

import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';

type StickerToggleProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  children: ReactNode;
  /** Right-hand extra, e.g. "+Rs 95". */
  aside?: ReactNode;
};

/**
 * "Peel on" sticker: a native checkbox under a white sticker. Checked = yellow and tilted −4°.
 * Disabled (unavailable, or the group is full) goes flat and muted.
 */
export function StickerToggle({ children, aside, className, ...rest }: StickerToggleProps) {
  return (
    <label
      className={clsx(
        'group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sticker border-3 border-ink bg-white py-1.5 ps-1.5 pe-3 shadow-hard-sm select-none',
        'transition-[rotate,background-color,box-shadow] duration-200 ease-(--ease-overshoot)',
        'has-checked:-rotate-4 has-checked:bg-yellow',
        'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-deep',
        'has-disabled:cursor-not-allowed has-disabled:bg-paper has-disabled:text-muted has-disabled:shadow-none',
        className,
      )}
    >
      <input type="checkbox" className="sr-only" {...rest} />
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-display text-lg leading-none"
      >
        <span className="group-has-checked:hidden">+</span>
        <span className="hidden group-has-checked:inline">✓</span>
      </span>
      <span className="font-bold">{children}</span>
      {aside}
    </label>
  );
}
