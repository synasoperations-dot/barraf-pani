'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/form';
import { Logo } from '@/components/ui/Logo';
import { OtpInput } from '@/components/ui/OtpInput';
import { toast } from '@/components/ui/Toast';
import { staffKey } from '@/features/admin/session';
import { api } from '@/lib/api';
import { ROLE_HOME } from '@/lib/admin-access';
import type { Staff, TwoFactorEnrolResponse } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { LanguageToggle } from '@/components/site/LanguageToggle';

type Step =
  | { kind: 'credentials' }
  | { kind: 'verify'; staff: Staff }
  | { kind: 'enrol'; staff: Staff; enrol: TwoFactorEnrolResponse }
  | { kind: 'recovery'; staff: Staff; codes: string[] };

/** Decorative stand-in for the QR code (the backend can return a QR SVG for otpauthUrl). */
function QrPlaceholder({ seed }: { seed: string }) {
  const cells = Array.from(
    { length: 121 },
    (_, i) => (seed.charCodeAt(i % seed.length) * (i + 7)) % 3 === 0,
  );
  return (
    <div
      aria-hidden="true"
      className="grid size-44 grid-cols-11 gap-0.5 rounded-sticker border-3 border-ink bg-white p-2 shadow-hard-sm"
    >
      {cells.map((on, i) => (
        <span key={i} className={on ? 'bg-ink' : 'bg-white'} />
      ))}
    </div>
  );
}

export function StaffLogin() {
  const t = useTranslations('admin.login');
  const message = useErrorMessage();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>({ kind: 'credentials' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = (staff: Staff) => {
    qc.setQueryData(staffKey, staff);
    // Only same-site /admin paths are honoured as `next` (no open redirect).
    const next = params.get('next');
    router.replace(next?.startsWith('/admin/') ? next : ROLE_HOME[staff.role]);
  };

  const login = useMutation({
    mutationFn: () => api.admin.login({ email: email.trim(), password }),
    onSuccess: async ({ staff, next }) => {
      setError(null);
      if (next === 'ok') return finish(staff);
      if (next === 'verify_2fa') return setStep({ kind: 'verify', staff });
      setStep({ kind: 'enrol', staff, enrol: await api.admin.enrol2fa() });
    },
    onError: (e) => setError(message(e)),
  });

  const verify = useMutation({
    mutationFn: (c: string) => api.admin.verify2fa({ code: c }),
    onSuccess: (staff) => {
      setError(null);
      if (step.kind === 'enrol')
        setStep({ kind: 'recovery', staff, codes: step.enrol.recoveryCodes });
      else finish(staff);
    },
    onError: (e) => {
      setCode('');
      setError(message(e));
    },
  });

  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-4">
      <div className="w-full max-w-md rounded-panel border-3 border-ink bg-white p-6 shadow-hard-lg">
        <div className="mb-5 flex items-center justify-between">
          <Logo size={64} />
          <LanguageToggle />
        </div>
        <h1 className="mb-1 font-display text-3xl">{t(`title.${step.kind}`)}</h1>
        <p className="mb-5 text-muted">{t(`body.${step.kind}`)}</p>

        {step.kind === 'credentials' && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate();
            }}
          >
            <Input
              label={t('email')}
              type="email"
              autoComplete="username"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label={t('password')}
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
            />
            <Button type="submit" size="lg" block loading={login.isPending}>
              {t('submit')}
            </Button>
          </form>
        )}

        {(step.kind === 'verify' || step.kind === 'enrol') && (
          <div className="grid gap-5">
            {step.kind === 'enrol' && (
              <div className="grid justify-items-center gap-3">
                <QrPlaceholder seed={step.enrol.secret} />
                <p className="text-sm text-muted">{t('qrHint')}</p>
                <div className="w-full rounded-input border-3 border-dashed border-ink bg-paper p-3 text-center">
                  <p className="text-sm font-bold">{t('manualKey')}</p>
                  <p dir="ltr" className="font-mono text-lg break-all select-all">
                    {step.enrol.secret}
                  </p>
                </div>
              </div>
            )}
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(c) => verify.mutate(c)}
              error={error ?? undefined}
              disabled={verify.isPending}
              autoFocus
            />
            <Button
              size="lg"
              block
              loading={verify.isPending}
              disabled={code.length !== 6}
              onClick={() => verify.mutate(code)}
            >
              {t('verify')}
            </Button>
          </div>
        )}

        {step.kind === 'recovery' && (
          <div className="grid gap-4">
            <ol
              dir="ltr"
              className="grid grid-cols-2 gap-2 rounded-input border-3 border-ink bg-paper p-3 font-mono text-lg"
            >
              {step.codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            <Button
              variant="ghost"
              onClick={() =>
                void navigator.clipboard
                  .writeText(step.codes.join('\n'))
                  .then(() => toast(t('copied')))
              }
            >
              {t('copyCodes')}
            </Button>
            <Checkbox
              label={t('savedCodes')}
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
            />
            <Button size="lg" block disabled={!saved} onClick={() => finish(step.staff)}>
              {t('continue')}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
