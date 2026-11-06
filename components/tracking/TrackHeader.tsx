'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Countdown } from '@/components/ui/Countdown';
import { SourceTag, StatusTag } from '@/components/ui/StatusTag';
import type { Order } from '@/lib/contracts';

type HeaderOrder = Pick<
  Order,
  | 'publicToken'
  | 'number'
  | 'status'
  | 'source'
  | 'fulfilment'
  | 'estimatedDeliveryAt'
  | 'estimatedReadyAt'
>;

const LIVE = new Set(['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery']);

/**
 * "Order #BP-1042", its StatusTag and (while live) the yellow ETA sticker.
 * `eta` false hides the sticker (special screens say the time in words).
 */
export function TrackHeader({ order, eta: showEta = true }: { order: HeaderOrder; eta?: boolean }) {
  const t = useTranslations();
  const eta = order.fulfilment === 'delivery' ? order.estimatedDeliveryAt : order.estimatedReadyAt;
  return (
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-display text-4xl leading-none md:text-5xl">
          {t('tracking.orderNumber', { number: order.number })}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag status={order.status} />
          <span className="text-sm font-bold text-muted">
            {t(`fulfilment.${order.fulfilment}`)}
          </span>
          {/* Staff-entered WhatsApp / phone orders use this same page (§A1). */}
          {order.source !== 'website' && <SourceTag source={order.source} />}
        </div>
        <Link
          href={`/order/${order.publicToken}`}
          className="inline-flex min-h-11 items-center font-bold text-blue-deep underline underline-offset-4"
        >
          {t('tracking.receiptLink')}
        </Link>
      </div>
      {showEta && eta && LIVE.has(order.status) && <EtaSticker key={eta} to={eta} />}
    </header>
  );
}

/** Keyed by the target, so a new ETA from realtime resets "Any minute now". */
export function EtaSticker({ to }: { to: string }) {
  const t = useTranslations('tracking.eta');
  const format = useFormatter();
  const [passed, setPassed] = useState(false);
  return (
    <div className="rotate-3 rounded-sticker border-3 border-ink bg-yellow px-5 py-3 text-center shadow-hard">
      <p className="font-sticker text-sm font-black uppercase">{t('label')}</p>
      {passed ? (
        <p className="font-display text-2xl leading-tight">{t('anyMinute')}</p>
      ) : (
        <Countdown to={to} onExpire={() => setPassed(true)} className="text-5xl leading-none" />
      )}
      <p className="text-sm font-medium" suppressHydrationWarning>
        {t('at', { time: format.dateTime(new Date(to), { hour: 'numeric', minute: '2-digit' }) })}
      </p>
    </div>
  );
}
