'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Countdown } from '@/components/ui/Countdown';
import { Stamp } from '@/components/ui/Stamp';
import type { OnlineProvider } from '@/lib/contracts';
import type { PayView } from '@/features/payment/payView';
import { PayScreen } from './PayScreen';

export interface PayOutcomeProps {
  view: PayView;
  token: string;
  provider: OnlineProvider;
  /** Payment window end (ISO) for the countdown while pending. */
  expiresAt: string;
  /** Realtime dropped; polling instead. */
  reconnecting?: boolean;
  onExpire?: () => void;
  onReorder?: () => void;
  reorderReady?: boolean;
}

/** Every /pay/return state as a sticker screen. Pure view: the container picks `view`. */
export function PayOutcome({
  view,
  token,
  provider,
  expiresAt,
  reconnecting,
  onExpire,
  onReorder,
  reorderReady = true,
}: PayOutcomeProps) {
  const t = useTranslations();
  const name = t(`payment.provider.${provider}`);
  const enc = encodeURIComponent(token);
  const r = (k: Parameters<typeof t>[0]) => t(k, { provider: name });

  const trackLink = (variant: 'primary' | 'ghost' = 'ghost') => (
    <Link href={`/track/${enc}`} className={buttonClasses({ variant })}>
      {t('payment.return.track')}
    </Link>
  );
  const orderLink = (
    <Link href={`/order/${enc}?placed=1`} className={buttonClasses()}>
      {t('payment.return.viewOrder')}
    </Link>
  );
  const countdown = (
    <p className="flex items-center justify-center gap-2 rounded-sticker border-3 border-ink bg-yellow px-4 py-2 font-bold text-ink shadow-hard-sm">
      {t('payment.return.window')}
      <Countdown to={expiresAt} onExpire={onExpire} className="text-2xl" />
    </p>
  );
  const polling = reconnecting && (
    <p className="rounded-sticker border-2 border-ink bg-white px-3 py-1 text-sm text-ink">
      {t('payment.return.reconnecting')}
    </p>
  );

  switch (view) {
    case 'confirming':
      return (
        <PayScreen busy title={t('payment.return.title')} body={r('payment.return.body')}>
          {countdown}
          {polling}
        </PayScreen>
      );
    case 'stuck':
      return (
        <PayScreen busy title={r('payment.return.stuckTitle')} body={t('payment.return.stuckBody')}>
          {countdown}
          {trackLink('primary')}
          {polling}
        </PayScreen>
      );
    case 'placed':
      return (
        <PayScreen
          title={t('payment.return.confirmedTitle')}
          body={t('payment.return.confirmedBody')}
          stamp={
            <Stamp tone="yellow" animate>
              {t('status.placed')}
            </Stamp>
          }
        >
          {orderLink}
        </PayScreen>
      );
    case 'back_on':
      return (
        <PayScreen title={t('payment.return.backOnTitle')} body={t('payment.return.backOnBody')}>
          {orderLink}
          {trackLink()}
        </PayScreen>
      );
    case 'failed':
      return (
        <PayScreen
          title={t('payment.return.failedTitle')}
          body={r('payment.return.failedBody')}
          stamp={<Stamp tone="orange">{t('status.payment_failed')}</Stamp>}
        >
          <Link
            href={`/pay/redirect?token=${enc}&provider=${provider}`}
            className={buttonClasses()}
          >
            {t('payment.return.tryAgain')}
          </Link>
          <Link href="/checkout?payment=cod" className={buttonClasses({ variant: 'secondary' })}>
            {t('payment.return.switchCod')}
          </Link>
        </PayScreen>
      );
    case 'expired':
      return (
        <PayScreen
          title={t('payment.return.expiredTitle')}
          body={r('payment.return.expiredBody')}
          stamp={<Stamp>{t('status.expired')}</Stamp>}
        >
          <Button onClick={onReorder} loading={!reorderReady}>
            {t('payment.return.reorder')}
          </Button>
          <Link href="/menu" className={buttonClasses({ variant: 'ghost' })}>
            {t('payment.return.menu')}
          </Link>
        </PayScreen>
      );
    case 'refund':
      return (
        <PayScreen title={t('payment.return.refundTitle')} body={t('payment.return.refundBody')}>
          {trackLink('primary')}
        </PayScreen>
      );
  }
}
