'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Odometer } from '@/components/ui/Odometer';
import { Stamp } from '@/components/ui/Stamp';
import { Skeleton } from '@/components/ui/states';
import type { Fulfilment, Item, Quote, QuotedLine } from '@/lib/contracts';
import { formatAmount, localized } from '@/lib/format';
import type { CartEntry } from '@/stores/cart';

interface QuotePanelProps {
  lines: CartEntry[];
  /** The server quote, only when it is current and error-free. Never the browser estimate. */
  quote: Quote | null;
  fetching: boolean;
  fulfilment: Fulfilment;
  soldOutIds: string[];
  replaceHref: (itemId: string) => string;
  onRemove: (key: string) => void;
  onEditCart?: () => void;
  /** Shown instead of the totals: no pin yet, BELOW_MIN_ORDER, a quote error… */
  problem?: ReactNode;
  children?: ReactNode;
}

/** Review step: cart lines (server prices when quoted), sold-out highlight, server totals. */
export function QuotePanel({
  lines,
  quote,
  fetching,
  fulfilment,
  soldOutIds,
  replaceHref,
  onRemove,
  onEditCart,
  problem,
  children,
}: QuotePanelProps) {
  const t = useTranslations('checkout.summary');
  const tr = useTranslations();
  const locale = useLocale();
  const rs = (n: number) => tr('price.rs', { amount: formatAmount(n) });
  // Quote lines come back in request order; only trust them if they still match the cart.
  const quoted = (i: number): QuotedLine | null => {
    const q = quote?.lines[i];
    return q && q.itemId === lines[i]?.itemId && q.variantId === lines[i]?.variantId ? q : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl">{t('title')}</h3>
        {onEditCart && (
          <Button size="sm" variant="ghost" onClick={onEditCart}>
            {t('edit')}
          </Button>
        )}
      </div>

      <ul className="space-y-3">
        {lines.map((l, i) => {
          const q = quoted(i);
          const soldOut = soldOutIds.includes(l.itemId);
          const s = l.snapshot;
          return (
            <li
              key={l.key}
              className={clsx(
                'relative rounded-input border-3 p-3',
                soldOut ? 'border-orange-deep bg-paper' : 'border-ink bg-white',
              )}
            >
              <div className="flex gap-3">
                {s.image ? (
                  <Image
                    src={s.image}
                    alt=""
                    width={56}
                    height={56}
                    sizes="56px"
                    className={clsx(
                      'aspect-square size-14 shrink-0 rounded-chip border-2 border-ink object-cover',
                      soldOut && 'grayscale',
                    )}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-14 shrink-0 rounded-chip border-2 border-ink grid-paper"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-price text-xl leading-tight tracking-[0.02em] uppercase">
                    <span className="me-1">{l.qty}×</span>
                    {localized(s.name, locale)}
                  </p>
                  {(s.size || s.option) && (
                    <p className="text-sm text-muted">
                      {[s.size, s.option && tr(`variant.${s.option}`)].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {q && q.modifiers.length > 0 && (
                    <p className="text-sm text-muted">
                      {q.modifiers.map((m) => localized(m.name, locale)).join(', ')}
                    </p>
                  )}
                  {l.note && <p className="text-sm text-muted italic">“{l.note}”</p>}
                </div>
                {q && !soldOut && (
                  <span className="shrink-0 font-price text-xl tracking-[0.02em]">
                    {rs(q.lineTotal)}
                  </span>
                )}
              </div>
              {soldOut && (
                <div className="mt-3 space-y-2" role="alert">
                  <Stamp tone="orange" size="sm" tilt={-6} animate className="absolute end-3 top-3">
                    {t('soldOut')}
                  </Stamp>
                  <p className="text-sm font-medium">{t('soldOutHelp')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onRemove(l.key)}>
                      {t('remove')}
                    </Button>
                    <Link
                      href={replaceHref(l.itemId)}
                      className={buttonClasses({ size: 'sm', variant: 'secondary' })}
                    >
                      {t('replace')}
                    </Link>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {problem ??
        (quote ? (
          <dl
            aria-busy={fetching || undefined}
            className={clsx(
              'space-y-2 border-t-3 border-dashed border-ink pt-4 transition-opacity',
              fetching && 'opacity-60',
            )}
          >
            <Row label={t('subtotal')} value={rs(quote.subtotal)} />
            {fulfilment === 'delivery' && (
              <Row
                label={t('deliveryFee')}
                value={quote.deliveryFee ? rs(quote.deliveryFee) : t('free')}
              />
            )}
            {quote.discount > 0 && (
              <Row
                label={t('discount', { code: quote.promo?.code ?? '' })}
                value={`−${rs(quote.discount)}`}
              />
            )}
            {quote.tax > 0 && <Row label={t('tax')} value={rs(quote.tax)} />}
            {quote.tip > 0 && <Row label={t('tip')} value={rs(quote.tip)} />}
            <div className="flex items-end justify-between gap-2 pt-2">
              <dt className="font-display text-2xl">{t('total')}</dt>
              <dd>
                <Odometer value={quote.total} className="text-4xl" />
              </dd>
            </div>
            <p className="text-sm text-muted" aria-live="polite">
              {fetching
                ? t('quoting')
                : t(fulfilment === 'delivery' ? 'etaDelivery' : 'etaPickup', {
                    minutes: quote.etaMinutes,
                  })}
            </p>
          </dl>
        ) : (
          <div className="space-y-2 border-t-3 border-dashed border-ink pt-4" aria-busy="true">
            <span className="sr-only">{t('quoting')}</span>
            <Skeleton className="h-6" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-10" />
          </div>
        ))}

      {children}
    </div>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-price text-xl tracking-[0.02em]">{value}</dd>
    </div>
  );
}

/** BELOW_MIN_ORDER: "Add Rs X more" with 2–3 cheap quick adds. */
export function BelowMin({
  shortBy,
  minOrder,
  items,
  onAdd,
}: {
  shortBy: number;
  minOrder: number;
  items: { item: Item; price: number }[];
  onAdd: (item: Item, el: HTMLElement) => void;
}) {
  const t = useTranslations('checkout.summary');
  const tr = useTranslations();
  const locale = useLocale();
  const rs = (n: number) => tr('price.rs', { amount: formatAmount(n) });
  return (
    <div role="alert" className="space-y-3 rounded-input border-3 border-ink bg-yellow p-4">
      <p className="font-display text-2xl">{t('belowMinTitle', { shortBy: rs(shortBy) })}</p>
      <p className="text-sm">{t('belowMinBody', { minOrder: rs(minOrder) })}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map(({ item, price }) => {
          const name = localized(item.name, locale);
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-label={t('quickAdd', { name })}
                onClick={(e) => onAdd(item, e.currentTarget)}
                className="flex min-h-11 press items-center gap-2 rounded-chip border-2 border-ink bg-white px-3 py-1 shadow-hard-sm [--press-x:3px] [--press-y:3px]"
              >
                <span aria-hidden="true" className="font-display text-lg">
                  +
                </span>
                <span className="font-medium">{name}</span>
                <span className="font-price text-lg tracking-[0.02em]">{rs(price)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
