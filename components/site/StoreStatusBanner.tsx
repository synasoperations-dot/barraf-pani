'use client';

import clsx from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { Bolt } from '@/components/ui/motifs';
import { useStoreStatus } from '@/features/store/useStore';

/** Closed / opening soon / paused strip under the header. Renders nothing while open. */
export function StoreStatusBanner() {
  const t = useTranslations('store');
  const format = useFormatter();
  const { data } = useStoreStatus();
  if (!data || data.state === 'open') return null;

  const time = data.opensAt
    ? format.dateTime(new Date(data.opensAt), { hour: 'numeric', minute: '2-digit' })
    : null;
  const message =
    data.state === 'paused'
      ? data.pauseReason
        ? t('pausedReason', { reason: data.pauseReason })
        : t('paused')
      : data.state === 'opening_soon' && time
        ? t('openingSoon', { time })
        : time
          ? t('closedUntil', { time })
          : t('closed');

  return (
    <div
      role="status"
      className={clsx(
        'border-b-3 border-ink px-4 py-2.5 text-ink',
        data.state === 'opening_soon'
          ? 'bg-yellow'
          : data.state === 'paused'
            ? 'bg-orange'
            : 'bg-blue-light',
      )}
    >
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 text-center font-bold">
        <Bolt size={20} />
        {message}
        {data.allowPreorders && data.state !== 'paused' && (
          <span className="font-normal">{t('preorderHint')}</span>
        )}
      </p>
    </div>
  );
}
