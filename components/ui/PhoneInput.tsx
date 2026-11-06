'use client';

import { useTranslations } from 'next-intl';
import { useState, type ComponentPropsWithRef } from 'react';
import { formatPkPhone, formatPkPhoneInput, normalizePkPhone } from '@/lib/phone';
import { Input } from './form';

type NativeProps = Omit<
  ComponentPropsWithRef<'input'>,
  'value' | 'onChange' | 'type' | 'defaultValue'
>;

interface PhoneInputProps extends NativeProps {
  /** E.164 (+923…) or null. This is what the API gets. */
  value: string | null;
  onChange: (e164: string | null) => void;
  label?: string;
  hint?: string;
  /** External error (e.g. from the form). Falls back to the built-in "invalid" message on blur. */
  error?: string;
}

/**
 * Pakistani mobile input. Shows "03XX XXXXXXX" while typing, emits E.164 "+923XXXXXXXXX"
 * (or null while incomplete/invalid). Accepts pasted +92 / 0092 / 92 forms too.
 */
export function PhoneInput({
  value,
  onChange,
  label,
  hint,
  error,
  onBlur,
  ...rest
}: PhoneInputProps) {
  const t = useTranslations('phone');
  const [text, setText] = useState(() => (value ? formatPkPhone(value) : ''));
  const [touched, setTouched] = useState(false);

  // Keep the display in sync when the form resets/sets the value from outside.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value !== normalizePkPhone(text)) setText(value ? formatPkPhone(value) : '');
  }

  const invalid = touched && text !== '' && normalizePkPhone(text) === null;

  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      label={label ?? t('label')}
      hint={hint ?? t('hint')}
      placeholder={t('placeholder')}
      error={error ?? (invalid ? t('invalid') : undefined)}
      value={text}
      onChange={(e) => {
        const next = formatPkPhoneInput(e.target.value);
        setText(next);
        onChange(normalizePkPhone(next));
      }}
      onBlur={(e) => {
        setTouched(true);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
}
