'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { BoltPair } from '@/components/ui/motifs';
import { Stamp } from '@/components/ui/Stamp';
import { Skeleton, Tag } from '@/components/ui/states';
import { findItemById } from '@/features/menu/helpers';
import type { Deal, Event, Menu } from '@/lib/contracts';
import { localized } from '@/lib/format';
import { tilt } from '@/lib/tilt';

/** Half-circle notch on the cut line (paper-coloured bite out of the coupon edge). */
const Notch = ({ side }: { side: 'start' | 'end' }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'absolute top-1/2 size-8 -translate-y-1/2 rounded-full border-3 border-ink bg-paper',
      side === 'start' ? '-start-[17px]' : '-end-[17px]',
    )}
  />
);

/**
 * Coupon sticker: name (Lilita), included items (Bebas), display price sticker, validity,
 * optional promo code, and "Order this deal". `priceLabel` is display text only (§A2.1).
 */
export function DealCoupon({
  deal,
  menu,
  index = 0,
  onOrder,
  onCopyCode,
}: {
  deal: Deal;
  menu: Menu | undefined;
  index?: number;
  onOrder: () => void;
  onCopyCode: (code: string) => void;
}) {
  const t = useTranslations('deals.deal');
  const locale = useLocale();
  const format = useFormatter();
  const until = deal.validUntil ? new Date(deal.validUntil) : null;
  // "Till Sunday" within the week, "Till 21 Nov" further out.
  const untilText = until
    ? format.dateTime(
        until,
        until.getTime() - new Date().getTime() < 6 * 86_400_000
          ? { weekday: 'long' }
          : { day: 'numeric', month: 'short' },
      )
    : null;

  return (
    <article
      style={{ rotate: tilt(index % 2 ? 1.5 : -1.5) }}
      className="relative rounded-card border-3 border-ink bg-yellow p-2 text-ink shadow-hard-md"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-sticker border-3 border-dashed border-ink bg-white">
        <div className="flex gap-4 p-4 md:p-5">
          {deal.imagePath && (
            <div className="relative size-24 shrink-0 overflow-hidden rounded-sticker border-3 border-ink bg-paper md:size-28">
              <Image src={deal.imagePath} alt="" fill sizes="112px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-3xl leading-tight md:text-4xl">
              {localized(deal.title, locale)}
            </h3>
            {deal.description && (
              <p className="mt-1 text-muted">{localized(deal.description, locale)}</p>
            )}
            <p className="mt-3 text-sm font-bold">{t('includes')}</p>
            {menu ? (
              <ul className="font-price text-2xl leading-tight tracking-[0.02em] uppercase">
                {deal.items.map((l) => {
                  const item = findItemById(menu, l.itemId);
                  return (
                    <li key={`${l.itemId}-${l.variantId}`}>
                      <span dir="ltr">{l.qty}×</span> {item ? localized(item.name, locale) : '—'}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div aria-label={t('loadingMenu')} className="mt-1 flex flex-col gap-1.5">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-32" />
              </div>
            )}
          </div>
        </div>

        {/* Cut line */}
        <div className="relative border-t-3 border-dashed border-ink">
          <Notch side="start" />
          <Notch side="end" />
        </div>

        <div className="flex flex-wrap items-center gap-3 p-4 md:p-5">
          {deal.priceLabel && (
            <span
              dir="ltr"
              style={{ rotate: tilt(-4) }}
              className="rounded-sticker border-3 border-ink bg-orange px-3 pt-1 font-price text-3xl leading-none tracking-[0.02em] text-ink shadow-hard-sm"
            >
              {deal.priceLabel}
            </span>
          )}
          {untilText && (
            <Tag tone="blue" tilt={2}>
              {t('till', { date: untilText })}
            </Tag>
          )}
          {deal.promoCode && (
            <span className="inline-flex items-center gap-2">
              <Tag tone="white">
                {t('code')}:{' '}
                <span dir="ltr" className="ms-1">
                  {deal.promoCode}
                </span>
              </Tag>
              <Button size="sm" variant="ghost" onClick={() => onCopyCode(deal.promoCode!)}>
                {t('copyCode')}
              </Button>
            </span>
          )}
          <Button className="ms-auto" onClick={onOrder} disabled={!menu}>
            {t('orderThis')}
          </Button>
          <p className="w-full text-sm text-muted">{t('priceNote')}</p>
        </div>
      </div>
    </article>
  );
}

/** Comic-poster event card: image or designed placeholder, date sticker, time, Book. */
export function EventPoster({
  event,
  index = 0,
  onBook,
}: {
  event: Event;
  index?: number;
  onBook: () => void;
}) {
  const t = useTranslations('deals.event');
  const locale = useLocale();
  const format = useFormatter();
  const start = new Date(event.startsAt);
  const full = event.spotsLeft === 0;
  const time = (d: Date) => format.dateTime(d, { hour: 'numeric', minute: '2-digit' });

  return (
    <article
      style={{ rotate: tilt(index % 2 ? -1 : 1.5) }}
      className="relative flex flex-col overflow-hidden rounded-card border-3 border-ink bg-white shadow-hard-md"
    >
      <div className="relative aspect-[4/3] border-b-3 border-ink">
        {event.imagePath ? (
          <Image
            src={event.imagePath}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center gap-2 rings">
            <BoltPair side="start" />
            <Logo size={84} />
            <BoltPair side="end" />
          </div>
        )}
        <div
          style={{ rotate: tilt(-5) }}
          className="absolute start-3 top-3 flex flex-col items-center rounded-sticker border-3 border-ink bg-yellow px-3 py-1 text-ink shadow-sticker"
        >
          <span className="font-price text-lg leading-none uppercase">
            {format.dateTime(start, { month: 'short' })}
          </span>
          <span className="font-display text-4xl leading-none">
            {format.dateTime(start, { day: 'numeric' })}
          </span>
          <span className="font-price text-lg leading-none uppercase">
            {format.dateTime(start, { weekday: 'short' })}
          </span>
        </div>
        {full && (
          <span className="absolute inset-0 grid place-items-center bg-ink/30">
            <Stamp tone="orange" size="lg">
              {t('fullyBooked')}
            </Stamp>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <Tag tone="ink" className="self-start">
          {t('poster')}
        </Tag>
        <h3 className="font-display text-3xl leading-tight">{localized(event.title, locale)}</h3>
        <p className="font-bold">
          {t('time', { from: time(start), to: time(new Date(event.endsAt)) })}
        </p>
        {event.description && <p className="text-muted">{localized(event.description, locale)}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          {event.bookable && (
            <Button onClick={onBook} disabled={full}>
              {full ? t('fullyBooked') : t('book')}
            </Button>
          )}
          {event.spotsLeft !== null && event.spotsLeft > 0 && (
            <span className="text-sm font-bold">{t('spotsLeft', { count: event.spotsLeft })}</span>
          )}
        </div>
      </div>
    </article>
  );
}
