'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Turnstile } from '@/components/checkout/Turnstile';
import { Button, buttonClasses } from '@/components/ui/Button';
import { BoltPair } from '@/components/ui/motifs';
import { OtpInput } from '@/components/ui/OtpInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Stamp } from '@/components/ui/Stamp';
import { Card } from '@/components/ui/surfaces';
import { toast } from '@/components/ui/Toast';
import { safeNext, syncPreferredLang } from '@/features/account/hooks';
import { useOtpFlow } from '@/features/auth/useOtpFlow';
import { isApiError } from '@/lib/api';
import { useErrorMessage } from '@/lib/errors';
import { formatPkPhone } from '@/lib/phone';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * /login: phone → OTP (Turnstile + 3 per phone per 10 min with lockout, §7) → session cookie →
 * back to `?next=` (same-site paths only). Designed states: wrong code, expired code,
 * RATE_LIMITED with a live countdown, lockout.
 */
export function LoginScreen() {
  const t = useTranslations('account.login');
  const message = useErrorMessage();
  const router = useRouter();
  const locale = useLocale();
  const next = safeNext(useSearchParams().get('next'));
  const otp = useOtpFlow();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const locked = otp.lockedFor > 0;

  const verify = (c: string) => {
    if (otp.verify.isPending || locked) return;
    otp.verify.mutate(c, {
      onSuccess: (res) => {
        toast(res.isNew ? t('welcomeNew') : t('welcome'));
        // The language the customer is looking at wins (cookie → preferred_lang).
        if (res.customer.preferredLang !== locale) void syncPreferredLang(locale);
        router.replace(next);
        router.refresh();
      },
      onError: () => setCode(''),
    });
  };

  const verifyErr = isApiError(otp.verify.error) ? otp.verify.error : null;
  const requestErr = isApiError(otp.request.error) ? otp.request.error : null;
  const err = (otp.sentTo ? verifyErr : null) ?? requestErr;
  const expired = verifyErr?.code === 'OTP_EXPIRED';
  const errText = !err
    ? null
    : err.code === 'OTP_INVALID'
      ? t('wrong')
      : expired
        ? t('expired')
        : err.code === 'RATE_LIMITED'
          ? null // the lockout card shows a live countdown instead
          : message(err);

  return (
    <div className="grid-paper">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10 md:py-16">
        <header className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-3">
            <BoltPair side="start" />
            <h1 className="font-display text-4xl leading-none md:text-5xl">{t('title')}</h1>
            <BoltPair side="end" />
          </div>
          <p className="text-lg text-muted">{t('sub')}</p>
        </header>

        <Card className="flex flex-col gap-5 p-5 md:p-7">
          {locked ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <Stamp tone="orange" size="sm" tilt={-6}>
                {t('lockedTitle')}
              </Stamp>
              <p className="font-bold">{t('locked', { time: mmss(otp.lockedFor) })}</p>
            </div>
          ) : null}

          {!otp.sentTo ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (phone && !locked) otp.request.mutate({ phone });
              }}
            >
              <p className="text-muted">{t('phoneBody')}</p>
              <PhoneInput value={phone} onChange={setPhone} autoFocus />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" loading={otp.request.isPending} disabled={!phone || locked}>
                  {t('send')}
                </Button>
                <Turnstile />
              </div>
            </form>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === 6) verify(code);
              }}
            >
              <p className="font-bold">{t('sentTo', { phone: formatPkPhone(otp.sentTo) })}</p>
              <OtpInput
                value={code}
                onChange={(c) => {
                  setCode(c);
                  if (otp.verify.error) otp.verify.reset();
                }}
                onComplete={verify}
                error={errText ?? undefined}
                disabled={otp.verify.isPending || locked || expired}
                autoFocus
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  loading={otp.verify.isPending}
                  disabled={code.length !== 6 || locked || expired}
                >
                  {t('verify')}
                </Button>
                <Button
                  variant={expired ? 'secondary' : 'ghost'}
                  size="sm"
                  disabled={(otp.resendIn > 0 && !expired) || locked || otp.request.isPending}
                  onClick={() => {
                    setCode('');
                    otp.verify.reset();
                    otp.request.mutate({ phone: otp.sentTo! });
                  }}
                >
                  {otp.resendIn > 0 && !expired
                    ? t('resendIn', { seconds: otp.resendIn })
                    : t('resend')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCode('');
                    otp.reset();
                  }}
                >
                  {t('change')}
                </Button>
              </div>
            </form>
          )}

          {errText && !otp.sentTo && (
            <p role="alert" className="flex gap-2 font-bold">
              <span aria-hidden="true" className="text-orange-deep">
                !
              </span>
              {errText}
            </p>
          )}
        </Card>

        <p className="flex flex-wrap items-center gap-3 text-muted">
          {t('guest')}
          <Link href="/menu" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
            {t('toMenu')}
          </Link>
        </p>
      </div>
    </div>
  );
}
