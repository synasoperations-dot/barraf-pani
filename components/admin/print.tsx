'use client';

/** Printable tickets. Plain black-on-white, big lines: they go through an 80mm thermal printer. */
import { useLocale, useTranslations } from 'next-intl';
import type { AdminOrder, Booking } from '@/lib/contracts';
import { formatAmount, localized } from '@/lib/format';
import { formatPkPhone } from '@/lib/phone';

const time = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale === 'ur' ? 'ur-PK' : 'en-PK', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });

/** Kitchen order ticket: BP number, source, big item lines, modifiers, notes. No prices. */
export function KotTicket({ order }: { order: AdminOrder }) {
  const t = useTranslations('admin.print');
  const ts = useTranslations();
  const locale = useLocale();
  return (
    <article className="print-kot font-body text-lg leading-snug">
      <header className="border-b-2 border-dashed border-ink pb-1 text-center">
        <p className="font-price text-5xl leading-none">{order.number}</p>
        <p className="font-bold uppercase">
          {ts(`source.${order.source}`)} · {ts(`fulfilment.${order.fulfilment}`)}
        </p>
        <p>{time(order.createdAt, locale)}</p>
        {order.scheduledFor && (
          <p className="font-bold">
            {t('scheduledFor', { time: time(order.scheduledFor, locale) })}
          </p>
        )}
      </header>
      <ul className="my-2 grid gap-1.5">
        {order.lines.map((l, i) => (
          <li key={i}>
            <p className="text-xl leading-tight font-bold">
              {l.qty} × {localized(l.name, locale)}
              {l.variantName !== 'Standard' && ` (${l.variantName})`}
            </p>
            {l.modifiers.map((m) => (
              <p key={m.id} className="ps-4">
                + {localized(m.name, locale)}
              </p>
            ))}
            {l.note && <p className="ps-4 font-bold">» {l.note}</p>}
          </li>
        ))}
      </ul>
      {order.customerNote && (
        <p className="border-2 border-ink p-1 font-bold">
          {t('note')}: {order.customerNote}
        </p>
      )}
    </article>
  );
}

/** Customer receipt: lines with prices, totals, payment. */
export function ReceiptTicket({ order }: { order: AdminOrder }) {
  const t = useTranslations('admin.print');
  const ts = useTranslations();
  const locale = useLocale();
  const rs = (n: number) => ts('price.rs', { amount: formatAmount(n) });
  const row = (label: string, value: string, bold = false) => (
    <p className={`flex justify-between gap-2 ${bold ? 'text-xl font-bold' : ''}`}>
      <span>{label}</span>
      <span dir="ltr">{value}</span>
    </p>
  );
  return (
    <article className="print-kot font-body text-base leading-snug">
      <header className="border-b-2 border-dashed border-ink pb-1 text-center">
        <p className="font-display text-2xl">{ts('brand.name')}</p>
        <p className="font-price text-4xl leading-none">{order.number}</p>
        <p>{time(order.createdAt, locale)}</p>
      </header>
      <div className="my-2 grid gap-1">
        {order.lines.map((l) => row(`${l.qty} × ${localized(l.name, locale)}`, rs(l.lineTotal)))}
      </div>
      <div className="grid gap-0.5 border-t-2 border-dashed border-ink pt-1">
        {row(t('subtotal'), rs(order.subtotal))}
        {order.deliveryFee > 0 && row(t('delivery'), rs(order.deliveryFee))}
        {order.discount > 0 && row(t('discount'), `−${rs(order.discount)}`)}
        {row(t('total'), rs(order.total), true)}
        {row(
          t('payment'),
          `${ts(`admin.pay.${order.paymentMethod}`)} · ${ts(`admin.payStatus.${order.paymentStatus}`)}`,
        )}
      </div>
      <p className="mt-2 text-center">{ts('brand.tagline')}</p>
    </article>
  );
}

/** Tonight's bookings, printable on A4 for the host stand. */
export function BookingsSheet({ date, bookings }: { date: string; bookings: Booking[] }) {
  const t = useTranslations('admin.bookings');
  return (
    <article className="p-6 font-body text-base">
      <h1 className="mb-3 font-display text-3xl">{t('dayTitle', { date })}</h1>
      <table className="w-full border-collapse text-start">
        <thead>
          <tr className="border-b-2 border-ink text-start">
            <th className="py-1 text-start">{t('time')}</th>
            <th className="text-start">{t('name')}</th>
            <th className="text-start">{t('guests')}</th>
            <th className="text-start">{t('phone')}</th>
            <th className="text-start">{t('noteCol')}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.publicToken} className="border-b border-grid-line align-top">
              <td className="py-1 font-bold">{b.time}</td>
              <td>{b.name}</td>
              <td>{b.guests}</td>
              <td dir="ltr">{formatPkPhone(b.phone)}</td>
              <td>{b.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
