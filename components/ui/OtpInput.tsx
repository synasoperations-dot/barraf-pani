'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useId, useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Called once all 6 digits are filled. */
  onComplete?: (code: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const LENGTH = 6;

/** 6 digit boxes: auto-advance, backspace goes back, paste fills all, SMS autofill on the first box. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  error,
  disabled,
  autoFocus,
}: OtpInputProps) {
  const t = useTranslations('otp');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const labelId = useId();
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  function write(start: number, incoming: string) {
    const clean = incoming.replace(/\D/g, '');
    if (!clean) return;
    const next = [...digits];
    for (let k = 0; k < clean.length && start + k < LENGTH; k++) next[start + k] = clean[k]!;
    const code = next.join('').slice(0, LENGTH);
    onChange(code);
    focus(start + clean.length);
    if (code.length === LENGTH && !next.includes('')) onComplete?.(code);
  }

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? `${labelId}-err` : undefined}
    >
      <p id={labelId} className="mb-2 text-sm font-bold">
        {t('label')}
      </p>
      {/* Digits read left-to-right even in RTL. */}
      <div dir="ltr" className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={i === 0 ? LENGTH : 1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={t('digit', { n: i + 1 })}
            aria-invalid={error ? true : undefined}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => write(i, e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              write(0, e.clipboardData.getData('text'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !d) {
                e.preventDefault();
                const next = [...digits];
                next[i - 1] = '';
                onChange(next.join(''));
                focus(i - 1);
              } else if (e.key === 'ArrowLeft') focus(i - 1);
              else if (e.key === 'ArrowRight') focus(i + 1);
            }}
            className={clsx(
              'size-12 rounded-input border-3 bg-white text-center font-price text-3xl leading-none text-ink transition-shadow focus:shadow-hard-sm focus:outline-none md:size-14',
              error ? 'border-orange-deep' : 'border-ink',
              d && 'bg-yellow',
            )}
          />
        ))}
      </div>
      {error && (
        <p id={`${labelId}-err`} className="mt-2 text-sm font-medium text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
