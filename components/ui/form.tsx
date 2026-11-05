'use client';

import clsx from 'clsx';
import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

/* ---------- Field wrapper ---------- */

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
}

function useField({ hint, error }: Pick<FieldProps, 'hint' | 'error'>) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return {
    id,
    hintId,
    errorId,
    describedBy: [errorId, hintId].filter(Boolean).join(' ') || undefined,
  };
}

function FieldText({
  hint,
  error,
  hintId,
  errorId,
}: {
  hint?: ReactNode;
  error?: ReactNode;
  hintId?: string;
  errorId?: string;
}) {
  return (
    <>
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
          <span
            aria-hidden="true"
            className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange font-display text-xs"
          >
            !
          </span>
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </>
  );
}

const control = (error: unknown) =>
  clsx(
    'w-full rounded-input border-3 bg-white px-4 py-3 text-base text-ink placeholder:text-muted',
    'transition-shadow focus:shadow-hard-sm focus:outline-none focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted',
    error ? 'border-orange-deep' : 'border-ink',
  );

function Label({
  htmlFor,
  children,
  optionalLabel,
}: {
  htmlFor: string;
  children: ReactNode;
  optionalLabel?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-baseline justify-between text-sm font-bold"
    >
      {children}
      {optionalLabel && <span className="font-normal text-muted">{optionalLabel}</span>}
    </label>
  );
}

/* ---------- Input ---------- */

type InputProps = ComponentPropsWithRef<'input'> & FieldProps;

/** Text input with label, hint and friendly error. Works with react-hook-form `register`. */
export function Input({ label, hint, error, optionalLabel, className, ...rest }: InputProps) {
  const f = useField({ hint, error });
  return (
    <div className={className}>
      <Label htmlFor={f.id} optionalLabel={optionalLabel}>
        {label}
      </Label>
      <input
        id={f.id}
        aria-invalid={error ? true : undefined}
        aria-describedby={f.describedBy}
        className={control(error)}
        {...rest}
      />
      <FieldText hint={hint} error={error} hintId={f.hintId} errorId={f.errorId} />
    </div>
  );
}

/* ---------- TextArea ---------- */

type TextAreaProps = ComponentPropsWithRef<'textarea'> & FieldProps;

export function TextArea({
  label,
  hint,
  error,
  optionalLabel,
  className,
  rows = 3,
  ...rest
}: TextAreaProps) {
  const f = useField({ hint, error });
  return (
    <div className={className}>
      <Label htmlFor={f.id} optionalLabel={optionalLabel}>
        {label}
      </Label>
      <textarea
        id={f.id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={f.describedBy}
        className={clsx(control(error), 'resize-y')}
        {...rest}
      />
      <FieldText hint={hint} error={error} hintId={f.hintId} errorId={f.errorId} />
    </div>
  );
}

/* ---------- Checkbox ---------- */

type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  label: ReactNode;
  hint?: ReactNode;
};

/** Sticker checkbox: ink box, yellow fill with an ink tick when checked. */
export function Checkbox({ label, hint, className, ...rest }: CheckboxProps) {
  const id = useId();
  return (
    <div className={clsx('flex items-start gap-3', className)}>
      <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="peer size-7 cursor-pointer appearance-none rounded-chip border-3 border-ink bg-white transition-colors checked:bg-yellow disabled:cursor-not-allowed disabled:bg-paper"
          {...rest}
        />
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="pointer-events-none absolute size-4 opacity-0 peer-checked:animate-pop peer-checked:opacity-100"
        >
          <path
            d="M3 8.5 6.5 12 13 4.5"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        <label htmlFor={id} className="cursor-pointer text-base font-medium">
          {label}
        </label>
        {hint && (
          <span id={`${id}-hint`} className="block text-sm text-muted">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}

/* ---------- RadioCards ---------- */

export interface RadioCardOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  disabled?: boolean;
}

interface RadioCardsProps<T extends string> {
  name?: string;
  legend: ReactNode;
  options: RadioCardOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: ReactNode;
  className?: string;
}

/** Big tappable choices (payment method, address). Native radios; checked card turns yellow. */
export function RadioCards<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  className,
}: RadioCardsProps<T>) {
  const autoName = useId();
  const errorId = `${autoName}-error`;
  return (
    <fieldset className={className} aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="grid gap-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={clsx(
              'flex cursor-pointer items-center gap-3 rounded-input border-3 border-ink p-4 transition-[background-color,box-shadow,translate]',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-deep',
              o.disabled && 'cursor-not-allowed bg-paper text-muted',
              !o.disabled &&
                (o.value === value
                  ? 'bg-yellow shadow-hard-sm'
                  : 'bg-white hover:-translate-y-0.5'),
            )}
          >
            <input
              type="radio"
              name={name ?? autoName}
              value={o.value}
              checked={o.value === value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="size-5 shrink-0 accent-ink"
            />
            <span className="flex-1">
              <span className="block font-bold">{o.label}</span>
              {o.description && <span className="block text-sm text-muted">{o.description}</span>}
            </span>
            {o.aside}
          </label>
        ))}
      </div>
      {error && <FieldText error={error} errorId={errorId} />}
    </fieldset>
  );
}
