'use client';

import clsx from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState, type ReactNode } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Input } from '@/components/ui/form';
import { OtpInput } from '@/components/ui/OtpInput';
import { Stamp } from '@/components/ui/Stamp';
import { Bolt } from '@/components/ui/motifs';
import type { SlotDay } from '@/features/store/hours';
import { USE_MOCKS } from '@/lib/flags';
import { formatAmount } from '@/lib/format';
import { SITE } from '@/lib/site';

/** Presentational checkout pieces. CheckoutScreen wires them to hooks; /dev/ui shows every state. */

/* ---------- Numbered sticker step ---------- */

export function StepCard({
  n,
  title,
  children,
  className,
}: {
  n: number;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('checkout');
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={clsx(
        'scroll-mt-28 rounded-card border-3 border-ink bg-white p-4 shadow-hard-md md:p-6',
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 -rotate-6 place-items-center rounded-full border-3 border-ink bg-yellow font-display text-xl shadow-hard-sm"
        >
          {n}
        </span>
        <h2 id={id} className="font-sticker text-2xl font-black">
          <span className="sr-only">{t('stepN', { n })} </span>
          {title}
        </h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* ---------- Inline notice ---------- */

export function Notice({
  tone = 'error',
  title,
  children,
  action,
  className,
}: {
  tone?: 'error' | 'info';
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      tabIndex={-1}
      data-notice={tone}
      className={clsx(
        'flex gap-3 rounded-input border-3 border-ink p-4 text-ink',
        tone === 'error' ? 'bg-white' : 'bg-yellow',
        className,
      )}
    >
      {tone === 'error' ? (
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange font-display text-sm"
        >
          !
        </span>
      ) : (
        <Bolt size={22} aria-hidden="true" className="shrink-0" />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="text-sm">{children}</div>}
        {action && <div className="flex flex-wrap gap-2 pt-1">{action}</div>}
      </div>
    </div>
  );
}

/* ---------- Pickup store card ---------- */

export function PickupCard({ etaMinutes, phone }: { etaMinutes: number | null; phone: string }) {
  const t = useTranslations('checkout.pickup');
  return (
    <div className="space-y-3 rounded-input border-3 border-ink grid-paper p-4">
      <p className="font-display text-xl">{t('title')}</p>
      <p className="font-medium">{SITE.address}</p>
      {etaMinutes !== null && (
        <p className="inline-block rounded-chip border-2 border-ink bg-yellow px-2 font-bold">
          {t('ready', { minutes: etaMinutes })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${phone}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          <span dir="ltr">{t('call', { phone })}</span>
        </a>
        <a
          href={SITE.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: 'secondary', size: 'sm' })}
        >
          {t('directions')}
        </a>
      </div>
    </div>
  );
}

/* ---------- OUTSIDE_ZONE ---------- */

export function OutsideZoneCard({ onPickup }: { onPickup: () => void }) {
  const t = useTranslations('checkout.delivery');
  return (
    <Notice
      title={t('outsideTitle')}
      action={
        <Button size="sm" variant="secondary" onClick={onPickup}>
          {t('switchToPickup')}
        </Button>
      }
    >
      {t('outsideBody')}
    </Notice>
  );
}

/* ---------- Promo field ---------- */

export function PromoField({
  applied,
  discount,
  error,
  onApply,
  onRemove,
}: {
  /** The code in the cart (validated by the server quote). */
  applied: string | null;
  discount: number | null;
  error: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('checkout.promo');
  const tp = useTranslations('price');
  const [text, setText] = useState(applied ?? '');
  const errId = useId();

  if (applied && !error)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-chip border-2 border-ink bg-yellow px-2 py-1 font-bold">
          {t('applied', { code: applied })}
          {discount ? (
            <span className="ms-2 font-price text-lg">
              −{tp('rs', { amount: formatAmount(discount) })}
            </span>
          ) : null}
        </span>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          {t('remove')}
        </Button>
      </div>
    );

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onApply(text);
      }}
    >
      <div className="flex items-end gap-2">
        <Input
          className="min-w-0 flex-1"
          label={t('label')}
          placeholder={t('placeholder')}
          autoCapitalize="characters"
          maxLength={32}
          value={text}
          onChange={(e) => setText(e.target.value.toUpperCase())}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
        />
        <Button type="submit" variant="dark" className="min-h-[54px]">
          {t('apply')}
        </Button>
      </div>
      {error && (
        <div className="flex flex-wrap items-center gap-2">
          <p id={errId} className="flex items-center gap-1.5 text-sm font-medium">
            <span
              aria-hidden="true"
              className="grid size-5 place-items-center rounded-full border-2 border-ink bg-orange font-display text-xs"
            >
              !
            </span>
            {error}
          </p>
          {applied && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setText('');
                onRemove();
              }}
            >
              {t('remove')}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}

/* ---------- Pre-order slot picker ---------- */

export function SlotPicker({
  days,
  value,
  onChange,
  today,
  tomorrow,
}: {
  days: SlotDay[];
  value: string | null;
  onChange: (iso: string) => void;
  /** Local dates ("YYYY-MM-DD") for the Today / Tomorrow labels. */
  today: string;
  tomorrow: string;
}) {
  const t = useTranslations('checkout.when');
  const format = useFormatter();
  const day = days.find((d) => value !== null && d.slots.includes(value)) ?? days[0];
  if (!day) return null;
  const tz = SITE.timezone;
  const noon = (date: string) => new Date(`${date}T12:00:00+05:00`);

  return (
    <div className="space-y-4">
      <ChoiceChips
        legend={t('day')}
        scroll
        value={day.date}
        onChange={(date) => {
          const first = days.find((d) => d.date === date)?.slots[0];
          if (first) onChange(first);
        }}
        options={days.map((d) => ({
          value: d.date,
          label:
            d.date === today
              ? t('today')
              : d.date === tomorrow
                ? t('tomorrow')
                : format.dateTime(noon(d.date), { weekday: 'short', timeZone: tz }),
          sub: format.dateTime(noon(d.date), { day: 'numeric', month: 'short', timeZone: tz }),
        }))}
      />
      <ChoiceChips
        legend={t('time')}
        value={value}
        onChange={onChange}
        options={day.slots.map((s) => ({
          value: s,
          label: format.dateTime(new Date(s), { hour: 'numeric', minute: '2-digit', timeZone: tz }),
        }))}
      />
    </div>
  );
}

/* ---------- OTP (first COD order from an unverified phone, §7) ---------- */

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function OtpPanel({
  phone,
  sent,
  verified,
  sending,
  verifying,
  resendIn,
  lockedFor,
  error,
  onSend,
  onVerify,
}: {
  /** Display form, e.g. "0300 1234567". */
  phone: string;
  sent: boolean;
  verified: boolean;
  sending: boolean;
  verifying: boolean;
  resendIn: number;
  /** RATE_LIMITED Retry-After, seconds left. */
  lockedFor: number;
  error: string | null;
  onSend: () => void;
  onVerify: (code: string) => void;
}) {
  const t = useTranslations('checkout.otp');
  const [code, setCode] = useState('');

  if (verified)
    return (
      <div className="flex items-center gap-3 rounded-input border-3 border-ink bg-white p-4">
        <Stamp tone="yellow" size="sm" tilt={-6}>
          {t('verified')}
        </Stamp>
        <span dir="ltr" className="font-medium">
          {phone}
        </span>
      </div>
    );

  const locked = lockedFor > 0;
  return (
    <div className="space-y-4 rounded-input border-3 border-ink bg-yellow p-4">
      <div>
        <p className="font-display text-xl">{t('title')}</p>
        <p className="text-sm">{t('body')}</p>
      </div>
      {locked && (
        <p role="status" className="rounded-chip border-2 border-ink bg-white px-3 py-2 font-bold">
          {t('locked', { time: mmss(lockedFor) })}
        </p>
      )}
      {!sent ? (
        <Button variant="dark" onClick={onSend} loading={sending} disabled={locked}>
          {t('send')}
        </Button>
      ) : (
        <>
          <p className="text-sm">{t('sentTo', { phone })}</p>
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={onVerify}
            disabled={verifying || locked}
            error={error ?? undefined}
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="dark"
              loading={verifying}
              disabled={code.length !== 6 || locked}
              onClick={() => onVerify(code)}
            >
              {t('verify')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={resendIn > 0 || locked || sending}
              onClick={() => {
                setCode('');
                onSend();
              }}
            >
              {resendIn > 0 ? t('resendIn', { seconds: resendIn }) : t('resend')}
            </Button>
          </div>
          {USE_MOCKS && <p className="font-mono text-xs">{t('mockHint')}</p>}
        </>
      )}
      {!sent && error && <p className="text-sm font-medium">{error}</p>}
    </div>
  );
}
