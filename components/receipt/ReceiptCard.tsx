'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Skeleton, Tag } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import { StatusTag } from '@/components/ui/StatusTag';
import type { Order, OrderStatus } from '@/lib/contracts';
import { formatAmount, localized } from '@/lib/format';
import { SITE } from '@/lib/site';

const TERMINAL = ['cancelled', 'rejected', 'payment_failed', 'expired'] as const;
type Terminal = (typeof TERMINAL)[number];
const isTerminal = (s: OrderStatus): s is Terminal => (TERMINAL as readonly string[]).includes(s);

/** Torn-paper zigzag edge (SVG pattern: ink stroke over white). */
function Zigzag({ flip }: { flip?: boolean }) {
  const id = `zz${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg aria-hidden="true" className={clsx('block h-3 w-full', flip && '-scale-y-100')}>
      <defs>
        <pattern id={id} width="16" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 12 8 2.5 16 12Z" fill="var(--color-white)" />
          <path
            d="M0 12 8 2.5 16 12"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill={`url(#${id})`} />
    </svg>
  );
}

/** Sticker receipt paper: zigzag top and bottom, ink sides, hard drop shadow following the edge. */
export function ReceiptPaper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} style={{ filter: 'drop-shadow(6px 6px 0 var(--color-ink))' }}>
      <Zigzag />
      <div className="border-x-3 border-ink bg-white px-5 py-4 md:px-8">{children}</div>
      <Zigzag flip />
    </div>
  );
}

const Row = ({
  label,
  value,
  strong,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
}) => (
  <div className={clsx('flex items-baseline justify-between gap-4', strong && 'pt-2')}>
    <dt className={strong ? 'font-display text-2xl' : 'text-muted'}>{label}</dt>
    <dd className={clsx('font-price tracking-[0.02em]', strong ? 'text-4xl' : 'text-xl text-ink')}>
      {value}
    </dd>
  </div>
);

export interface ReceiptCardProps {
  order: Order;
  onReorder?: () => void;
  reorderReady?: boolean;
}

/** /order/[token]: the receipt (paper) plus payment, address/pickup, schedule and actions. */
export function ReceiptCard({ order, onReorder, reorderReady = true }: ReceiptCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const rs = (n: number) => t('price.rs', { amount: formatAmount(n) });
  const when = (iso: string) =>
    format.dateTime(new Date(iso), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  const enc = encodeURIComponent(order.publicToken);
  const online = order.paymentMethod !== 'cod';
  const payStatus =
    !online && order.paymentStatus === 'unpaid'
      ? t('receipt.payStatus.codDue')
      : t(`receipt.payStatus.${order.paymentStatus}`);

  const share = () => {
    const url = `${location.origin}/track/${enc}`;
    const text = t('receipt.shareText', { url });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-8 md:grid-cols-[minmax(0,1fr)_22rem] md:py-12 lg:gap-12">
      <ReceiptPaper className="mx-auto w-full max-w-2xl">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-dashed border-ink pb-4">
          <Logo size={52} />
          <div className="min-w-0 flex-1">
            <p className="font-sticker text-sm font-black tracking-wide text-muted uppercase">
              {t('receipt.title')}
            </p>
            <h1 className="font-price text-4xl leading-none tracking-[0.02em]">
              {t('receipt.orderNumber', { number: order.number })}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t('receipt.placedAt', { time: when(order.createdAt) })}
            </p>
          </div>
          <StatusTag status={order.status} />
        </header>

        <h2 className="sr-only">{t('receipt.items')}</h2>
        <ul className="divide-y-2 divide-dashed divide-grid-line py-2">
          {order.lines.map((l, i) => {
            const variant = [l.size, l.option && t(`variant.${l.option}`)]
              .filter(Boolean)
              .join(' · ');
            const mods = l.modifiers.map((m) => localized(m.name, locale)).join(', ');
            return (
              <li key={`${l.variantId}-${i}`} className="flex items-start gap-3 py-3">
                <span className="w-10 shrink-0 font-price text-2xl leading-7 tracking-[0.02em]">
                  {t('receipt.qty', { qty: l.qty })}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-price text-2xl leading-7 tracking-[0.02em] uppercase">
                    {localized(l.name, locale)}
                  </p>
                  {variant && <p className="text-sm font-bold">{variant}</p>}
                  {mods && <p className="text-sm text-muted">{mods}</p>}
                  {l.note && (
                    <p className="text-sm text-muted italic">
                      {t('receipt.lineNote', { note: l.note })}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-price text-2xl leading-7 tracking-[0.02em]">
                  {rs(l.lineTotal)}
                </span>
              </li>
            );
          })}
        </ul>

        <dl className="space-y-1 border-t-2 border-dashed border-ink pt-4">
          <Row label={t('receipt.subtotal')} value={rs(order.subtotal)} />
          {order.fulfilment === 'delivery' && (
            <Row
              label={t('receipt.deliveryFee')}
              value={order.deliveryFee ? rs(order.deliveryFee) : t('receipt.free')}
            />
          )}
          {order.discount > 0 && (
            <Row label={t('receipt.discount')} value={`− ${rs(order.discount)}`} />
          )}
          {order.tax > 0 && <Row label={t('receipt.tax')} value={rs(order.tax)} />}
          {order.tip > 0 && <Row label={t('receipt.tip')} value={rs(order.tip)} />}
          <Row strong label={t('receipt.total')} value={rs(order.total)} />
        </dl>
      </ReceiptPaper>

      <aside className="flex flex-col gap-5">
        {order.status === 'pending_payment' && (
          <Card className="bg-yellow p-5">
            <h2 className="font-display text-2xl">{t('receipt.pendingTitle')}</h2>
            <p className="mt-1">{t('receipt.pendingBody')}</p>
            <Link
              href={`/pay/return?token=${enc}`}
              className={buttonClasses({ variant: 'dark', block: true, className: 'mt-4' })}
            >
              {t('receipt.pendingCta')}
            </Link>
          </Card>
        )}
        {isTerminal(order.status) && (
          <Card className="p-5">
            <StatusTag status={order.status} />
            <p className="mt-3">{t(`receipt.terminal.${order.status}`)}</p>
          </Card>
        )}

        <Card className="space-y-4 p-5">
          <section>
            <h2 className="text-sm font-bold text-muted">{t('receipt.payment')}</h2>
            <p className="flex flex-wrap items-center gap-2 font-bold">
              {t(`receipt.method.${order.paymentMethod}`)}
              <Tag tone={order.paymentStatus === 'paid' ? 'blue' : 'white'}>{payStatus}</Tag>
            </p>
          </section>

          {order.fulfilment === 'delivery' && order.address ? (
            <section>
              <h2 className="text-sm font-bold text-muted">{t('receipt.deliveryTo')}</h2>
              <address className="not-italic">
                <p className="font-bold">{order.address.line1}</p>
                {order.address.area && <p>{order.address.area}</p>}
                {order.address.landmark && (
                  <p className="text-muted">
                    {t('receipt.landmark', { landmark: order.address.landmark })}
                  </p>
                )}
              </address>
            </section>
          ) : (
            <section>
              <h2 className="text-sm font-bold text-muted">{t('receipt.pickupFrom')}</h2>
              <address className="not-italic">
                <p className="font-bold">{SITE.name}</p>
                <p>{SITE.address}</p>
              </address>
              <a
                href={SITE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'ghost', className: 'mt-2' })}
              >
                {t('receipt.directions')}
              </a>
            </section>
          )}

          {order.scheduledFor && (
            <section>
              <h2 className="text-sm font-bold text-muted">{t('receipt.scheduled')}</h2>
              <p className="font-price text-2xl tracking-[0.02em]">{when(order.scheduledFor)}</p>
            </section>
          )}

          {order.customerNote && (
            <section>
              <h2 className="text-sm font-bold text-muted">{t('receipt.yourNote')}</h2>
              <p>{order.customerNote}</p>
            </section>
          )}
        </Card>

        <div className="flex flex-col gap-3">
          <Link href={`/track/${enc}`} className={buttonClasses({ block: true, size: 'lg' })}>
            {t('receipt.track')}
          </Link>
          <Button variant="secondary" block onClick={onReorder} loading={!reorderReady}>
            {t('receipt.reorder')}
          </Button>
          <Button variant="whatsapp" block onClick={share}>
            {t('receipt.share')}
          </Button>
        </div>
      </aside>
    </div>
  );
}

/** Loading state: the same layout in grid-paper shimmer. */
export function ReceiptSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-8 md:grid-cols-[minmax(0,1fr)_22rem] md:py-12 lg:gap-12"
    >
      <ReceiptPaper className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-4 border-b-2 border-dashed border-ink pb-4">
          <Skeleton className="size-13 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-48" />
          </div>
        </div>
        <div className="space-y-3 py-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
        <Skeleton className="h-24" />
      </ReceiptPaper>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-48 rounded-card" />
        <Skeleton className="h-14 rounded-button" />
        <Skeleton className="h-12 rounded-button" />
      </div>
    </div>
  );
}
