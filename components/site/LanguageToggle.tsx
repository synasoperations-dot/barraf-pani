'use client';

import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { syncPreferredLang } from '@/features/account/hooks';
import { setLocale } from '@/lib/i18n/actions';

/** EN / اردو switch. Sets the locale cookie, then re-renders server components. */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations('lang');
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const qc = useQueryClient();
  const next = locale === 'ur' ? 'en' : 'ur';

  return (
    <button
      type="button"
      lang={next}
      disabled={pending}
      aria-label={`${t('label')}: ${t('switchTo')}`}
      onClick={() =>
        start(async () => {
          await setLocale(next);
          // Logged in → preferred_lang too (guests: cookie only); the profile then re-reads it.
          void syncPreferredLang(next).then(() => qc.invalidateQueries({ queryKey: ['me'] }));
          router.refresh();
        })
      }
      className={clsx(
        'inline-flex min-h-11 press items-center rounded-full border-2 border-ink bg-white px-4 font-bold shadow-hard-sm [--press-x:3px] [--press-y:3px] disabled:opacity-60',
        next === 'ur'
          ? 'font-[family-name:var(--font-nastaliq,serif)] text-base'
          : 'font-display text-lg',
        className,
      )}
    >
      {t('switchTo')}
    </button>
  );
}
