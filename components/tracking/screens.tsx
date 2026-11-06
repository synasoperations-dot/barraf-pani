'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { BoltPair } from '@/components/ui/motifs';
import { Stamp } from '@/components/ui/Stamp';
import { Card } from '@/components/ui/surfaces';
import { lastNote, type TrackScreen } from '@/features/tracking/panels';
import type { CustomerRider, Order } from '@/lib/contracts';
import { formatPkPhone } from '@/lib/phone';

const tel = (phone: string) => `tel:${phone}`;
const wa = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;
const pretty = (phone: string) => (phone.startsWith('+92') ? formatPkPhone(phone) : phone);

/** "Reconnecting… we'll keep checking" while realtime is down and we poll (§2.3). */
export function ReconnectingBanner() {
  const t = useTranslations('tracking');
  return (
    <p
      role="status"
      className="flex items-center gap-3 rounded-sticker border-3 border-ink bg-white px-4 py-3 font-bold shadow-hard-sm"
    >
      <span
        aria-hidden="true"
        className="size-4 shrink-0 animate-spin rounded-full border-3 border-ink border-e-transparent"
      />
      {t('reconnecting')}
    </p>
  );
}

/** Rider card during out_for_delivery: name, Call, WhatsApp. */
export function RiderCard({ rider }: { rider: CustomerRider }) {
  const t = useTranslations('tracking.rider');
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-full border-3 border-ink bg-blue-light font-display text-2xl"
        >
          {rider.name.slice(0, 1)}
        </span>
        <div>
          <p className="font-sticker text-sm font-black text-muted uppercase">{t('title')}</p>
          <p className="font-display text-2xl leading-tight">{t('body', { name: rider.name })}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={tel(rider.phone)} className={buttonClasses({ variant: 'secondary' })}>
          {t('call')}
        </a>
        <a
          href={wa(rider.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: 'whatsapp' })}
        >
          {t('whatsapp')}
        </a>
      </div>
    </Card>
  );
}

export const CallShopLink = ({ phone }: { phone: string }) => {
  const t = useTranslations('tracking');
  return (
    <a href={tel(phone)} className={buttonClasses({ variant: 'ghost' })}>
      {t('callShop', { phone: pretty(phone) })}
    </a>
  );
};

type ScreenOrder = Pick<
  Order,
  | 'publicToken'
  | 'status'
  | 'events'
  | 'scheduledFor'
  | 'releasesAt'
  | 'paymentMethod'
  | 'paymentStatus'
>;

/** Terminal and special states: each its own designed screen, not just a tag. */
export function SpecialScreen({
  screen,
  order,
  shopPhone,
}: {
  screen: Exclude<TrackScreen, 'strip'>;
  order: ScreenOrder;
  shopPhone: string;
}) {
  const t = useTranslations('tracking');
  const ts = useTranslations('status');
  const format = useFormatter();
  const note = lastNote(order);
  const menu = (
    <Link href="/menu" className={buttonClasses()}>
      {t('orderElse')}
    </Link>
  );
  const time = (iso: string | null, weekday?: boolean) =>
    iso
      ? format.dateTime(new Date(iso), {
          hour: 'numeric',
          minute: '2-digit',
          ...(weekday && { weekday: 'short' }),
        })
      : '';

  const view: Record<
    typeof screen,
    {
      stamp: string;
      tone: 'ink' | 'orange' | 'yellow' | 'white';
      title: string;
      body: string;
      actions: ReactNode;
    }
  > = {
    scheduled: {
      stamp: t('scheduled.stamp'),
      tone: 'yellow',
      title: t('scheduled.title', { time: time(order.scheduledFor, true) }),
      body: t('scheduled.body', { release: time(order.releasesAt) }),
      actions: null, // Cancel sits under the card (TrackingView keeps it mounted).
    },
    pending_payment: {
      stamp: ts('pending_payment'),
      tone: 'white',
      title: t('pendingPayment.title'),
      body: t('pendingPayment.body'),
      actions: (
        <Link
          href={`/pay/return?token=${encodeURIComponent(order.publicToken)}`}
          className={buttonClasses()}
        >
          {t('pendingPayment.cta')}
        </Link>
      ),
    },
    payment_failed: {
      stamp: ts('payment_failed'),
      tone: 'orange',
      title: t('paymentFailed.title'),
      body: t('paymentFailed.body'),
      actions: <PaymentRetry />,
    },
    expired: {
      stamp: ts('expired'),
      tone: 'white',
      title: t('expired.title'),
      body: t('expired.body'),
      actions: (
        <>
          <PaymentRetry />
          <CallShopLink phone={shopPhone} />
        </>
      ),
    },
    rejected: {
      stamp: ts('rejected'),
      tone: 'ink',
      title: t('rejected.title'),
      body: t('rejected.body'),
      actions: (
        <>
          {menu}
          <CallShopLink phone={shopPhone} />
        </>
      ),
    },
    auto_rejected: {
      stamp: t('autoRejected.stamp'),
      tone: 'ink',
      title: t('autoRejected.title'),
      body: t('autoRejected.body'),
      actions: (
        <>
          {menu}
          <CallShopLink phone={shopPhone} />
        </>
      ),
    },
    cancelled: {
      stamp: ts('cancelled'),
      tone: 'white',
      title: t('cancelled.title'),
      body: t('cancelled.body'),
      actions: menu,
    },
  };
  const v = view[screen];
  const refund =
    screen === 'cancelled' &&
    order.paymentMethod !== 'cod' &&
    ['paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus);
  // Auto-reject notes are system text; the kitchen's own note is worth showing.
  const reason =
    (screen === 'rejected' && note && { label: t('rejected.reason'), note }) ||
    (screen === 'cancelled' && note && { label: t('cancelled.reason'), note });

  return (
    <Card className="relative overflow-hidden p-6 text-center md:p-10">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
        {/* Bolts only from sm: a long lg stamp plus both pairs overflows a 390px card. */}
        <div className="flex items-end gap-2" aria-hidden="true">
          <span className="max-sm:hidden">
            <BoltPair side="start" />
          </span>
          <Stamp tone={v.tone} size="lg" tilt={-6} animate>
            {v.stamp}
          </Stamp>
          <span className="max-sm:hidden">
            <BoltPair side="end" />
          </span>
        </div>
        <h2 className="font-display text-3xl leading-tight md:text-4xl">{v.title}</h2>
        <p className="text-lg text-muted">{v.body}</p>
        {reason && (
          <blockquote className="w-full rounded-sticker border-3 border-dashed border-ink bg-paper px-4 py-3 text-start">
            <p className="font-sticker text-sm font-black uppercase">{reason.label}</p>
            <p className="font-medium">“{reason.note}”</p>
          </blockquote>
        )}
        {refund && <p className="font-bold">{t('cancelled.refund')}</p>}
        {v.actions && <div className="flex flex-wrap justify-center gap-3">{v.actions}</div>}
      </div>
    </Card>
  );
}

/** Online payment fell through: the cart is still saved, so checkout can retry or switch to COD. */
function PaymentRetry() {
  const t = useTranslations('tracking');
  return (
    <>
      <Link href="/checkout" className={buttonClasses()}>
        {t('retryPayment')}
      </Link>
      <Link href="/checkout?payment=cod" className={buttonClasses({ variant: 'secondary' })}>
        {t('payCash')}
      </Link>
    </>
  );
}
