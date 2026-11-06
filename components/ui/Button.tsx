import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'whatsapp';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // White on orange is ~3:1, so only at lg (24px display = WCAG large text). sm/md use ink (6:1).
  primary: 'bg-orange shadow-hard',
  secondary: 'bg-yellow text-ink shadow-hard',
  ghost: 'bg-white text-ink shadow-hard',
  dark: 'bg-ink text-white shadow-hard-orange',
  // White on WhatsApp green fails contrast, so ink text.
  whatsapp: 'bg-whatsapp text-ink shadow-hard',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 text-base gap-1.5 [--press-x:3px] [--press-y:3px]',
  md: 'min-h-12 px-5 text-xl gap-2',
  lg: 'min-h-14 px-7 text-2xl gap-2.5',
};

/** Shared classes so links (<Link className={buttonClasses()}>) look identical to buttons. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  return clsx(
    'press inline-flex select-none items-center justify-center rounded-button border-3 border-ink font-display leading-none whitespace-nowrap',
    'disabled:cursor-not-allowed disabled:bg-grid-line disabled:text-muted disabled:shadow-none',
    'aria-disabled:pointer-events-none aria-disabled:bg-grid-line aria-disabled:text-muted aria-disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    variant === 'primary' && (size === 'lg' ? 'text-white' : 'text-ink'),
    block && 'w-full',
    className,
  );
}

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Shows a spinner, sets aria-busy and blocks clicks (double-tap safe). */
  loading?: boolean;
}

/**
 * Sticker button. Pressed: moves by its shadow offset and the shadow drops to 0 (`.press`).
 * Variants: primary (orange), secondary (yellow), ghost (white), dark, whatsapp.
 */
export function Button({
  variant,
  size,
  block,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, block, className })}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-3 border-current border-e-transparent"
        />
      )}
      {children}
    </button>
  );
}
