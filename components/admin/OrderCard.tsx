'use client';

import clsx from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SourceTag, StatusTag } from '@/components/ui/StatusTag';
import { Tag } from '@/components/ui/states';
import { acceptWindow, isAlerting } from '@/features/admin/board';
import { telLink, waLink } from '@/features/admin/links';
import { clock, SHORT_TIME } from '@/features/admin/useNow';
import type { AdminOrder, StaffRole, StoreSettings } from '@/lib/contracts';
import { FRONT_ROLES } from '@/lib/contracts';
import { localized } from '@/lib/format';
import { formatPkPhone } from '@/lib/phone';
import { Icon } from './icons';
import { Money } from './kit';
import { OrderActions } from './OrderActions';
import { KotTicket, ReceiptTicket } from './print';

type Timings = Pick<
  StoreSettings,
  'autoRejectMinutes' | 'managerAlertMinutes' | 'preorderReleaseMinutes'
>;

export function OrderLines({ order, big }: { order: AdminOrder; big?: boolean }) {
  const locale = useLocale();
  return (
    <ul className="grid gap-1">
      {order.lines.map((l, i) => (
        <li key={i} className={clsx(big ? 'text-lg' : 'text-base')}>
          <span className="font-price text-xl tracking-[0.02em]" dir="ltr">
            {l.qty}×
          </span>{' '}
          <span className="font-bold">{localized(l.name, locale)}</span>
          {l.variantName !== 'Standard' && <span className="font-normal"> · {l.variantName}</span>}
          {l.modifiers.length > 0 && (
            <span className="block ps-6 text-sm">
              {l.modifiers.map((m) => `+ ${localized(m.name, locale)}`).join(', ')}
            </span>
          )}
          {l.note && <span className="block ps-6 text-sm font-bold">» {l.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Customer phone with Call / WhatsApp for front of house; masked (no actions) for the kitchen. */
export function CustomerContact({ order, role }: { order: AdminOrder; role: StaffRole }) {
  const t = useTranslations('admin.card');
  const phone = order.customer.phone;
  const full = phone.startsWith('+92') && (FRONT_ROLES.includes(role) || role === 'rider');
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-bold">{order.customer.name ?? t('noName')}</span>
      <span dir="ltr">{full ? formatPkPhone(phone) : phone}</span>
      {full && (
        <span className="flex gap-2">
          <a
            href={telLink(phone)}
            className="inline-flex min-h-11 press items-center gap-1 rounded-button border-2 border-ink bg-white px-2 font-bold shadow-hard-sm"
          >
            <Icon name="phone" />
            {t('call')}
          </a>
          <a
            href={waLink(phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 press items-center gap-1 rounded-button border-2 border-ink bg-whatsapp px-2 font-bold shadow-hard-sm"
          >
            <Icon name="chat" />
            {t('whatsapp')}
          </a>
        </span>
      )}
    </div>
  );
}

/**
 * One order on the board. `placed` cards flash yellow with a countdown to auto-reject; past the
 * manager-alert mark they turn orange with "Manager alerted" (§9).
 */
export function OrderCard({
  order,
  role,
  timings,
  now,
  mine,
  readOnly,
  onPrint,
}: {
  order: AdminOrder;
  role: StaffRole;
  timings: Timings;
  now: number;
  mine?: boolean;
  /** Awaiting payment: staff never move these (the payment decides). */
  readOnly?: boolean;
  onPrint: (node: ReactNode) => void;
}) {
  const t = useTranslations('admin.card');
  const ts = useTranslations();
  const format = useFormatter();
  const placed = order.status === 'placed';
  const alerting = isAlerting(order, timings, now);
  const { rejectAt } = acceptWindow(order, timings);
  const age = now - new Date(order.createdAt).getTime();

  return (
    <article
      aria-labelledby={`order-${order.id}`}
      className={clsx(
        'relative grid gap-3 rounded-card border-3 border-ink p-3 shadow-hard-md',
        placed && !mine && !alerting && 'animate-pop motion-safe:animate-flash',
        placed && alerting && 'bg-orange',
        (!placed || mine) && !alerting && 'bg-white',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            id={`order-${order.id}`}
            className="font-price text-4xl leading-none tracking-[0.02em]"
            dir="ltr"
          >
            {order.number}
          </h3>
          <p className="text-sm font-bold">
            <span className="sr-only">{t('age')}: </span>
            <span className="font-price text-xl tracking-[0.02em] tabular-nums" dir="ltr">
              {clock(age)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <SourceTag source={order.source} />
          <Tag tone={order.fulfilment === 'delivery' ? 'blue' : 'white'}>
            {ts(`fulfilment.${order.fulfilment}`)}
          </Tag>
          <StatusTag status={order.status} />
        </div>
      </header>

      {placed && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-chip border-2 border-ink bg-white px-2 text-sm font-bold">
            {t('autoRejectIn')}{' '}
            <span className="font-price text-xl tabular-nums" dir="ltr">
              {clock(rejectAt - now)}
            </span>
          </span>
          {alerting && (
            <Tag tone="ink" tilt={-3}>
              {t('managerAlerted')}
            </Tag>
          )}
          {mine && <Tag tone="white">{t('createdByYou')}</Tag>}
        </div>
      )}
      {order.scheduledFor && (
        <p className="text-sm font-bold">
          {t('scheduledFor', {
            time: format.dateTime(new Date(order.scheduledFor), SHORT_TIME),
          })}
        </p>
      )}
      {order.callBack && (
        <p className="flex items-center gap-2 rounded-input border-2 border-ink bg-yellow p-2 text-sm font-bold">
          <Icon name="flag" />
          {t('callBack')}
        </p>
      )}

      <OrderLines order={order} />

      {order.customerNote && (
        <p className="rounded-input border-2 border-dashed border-ink bg-yellow p-2 text-sm">
          <span className="font-bold">{t('note')}: </span>
          {/* Customer text is always rendered as text, never HTML. */}
          {order.customerNote}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex flex-wrap items-center gap-2">
          <Money value={order.total} className="text-2xl" />
          <span className="rounded-chip border-2 border-ink bg-paper px-1.5 font-bold">
            {ts(`admin.pay.${order.paymentMethod}`)} ·{' '}
            {ts(`admin.payStatus.${order.paymentStatus}`)}
          </span>
        </span>
        {order.rider && (
          <span className="font-bold">
            {t('rider')}: {order.rider.name}
          </span>
        )}
      </div>

      {order.address && (
        <p className="text-sm">
          {order.address.line1}, {order.address.area}
          {order.address.landmark && <span> · {order.address.landmark}</span>}
        </p>
      )}
      <CustomerContact order={order} role={role} />
      {order.cancelReason && (
        <p className="text-sm">
          <span className="font-bold">{t('reason')}: </span>
          {order.cancelReason}
        </p>
      )}

      {!readOnly && <OrderActions order={order} role={role} />}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPrint(<KotTicket order={order} />)}
          className="inline-flex min-h-11 press items-center gap-1 rounded-button border-2 border-ink bg-white px-2 text-sm font-bold shadow-hard-sm"
        >
          <Icon name="print" />
          {t('printKot')}
        </button>
        <button
          type="button"
          onClick={() => onPrint(<ReceiptTicket order={order} />)}
          className="inline-flex min-h-11 press items-center gap-1 rounded-button border-2 border-ink bg-white px-2 text-sm font-bold shadow-hard-sm"
        >
          <Icon name="print" />
          {t('printReceipt')}
        </button>
      </div>
    </article>
  );
}
