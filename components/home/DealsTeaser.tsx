'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Tag } from '@/components/ui/states';
import { useDealsEvents } from '@/features/menu/useMenu';
import type { DealsEvents } from '@/lib/contracts';
import { localized } from '@/lib/format';
import { tilt } from '@/lib/tilt';

const TILTS = [-3, 2, -1.5];

/** Up to 3 tilted coupon / event stickers. Renders nothing when nothing is active (or loading). */
export function DealsTeaserView({ data }: { data: DealsEvents | undefined }) {
  const t = useTranslations('home.deals');
  const h = useId();
  const locale = useLocale();
  const format = useFormatter();
  if (!data) return null;

  const cards = [
    ...data.deals
      .filter((d) => d.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((d) => ({
        id: d.id,
        kind: 'deal' as const,
        title: localized(d.title, locale),
        meta: d.priceLabel, // display text from the server, never charged
      })),
    ...data.events
      .filter((e) => e.isActive)
      .map((e) => ({
        id: e.id,
        kind: 'event' as const,
        title: localized(e.title, locale),
        meta: format.dateTime(new Date(e.startsAt), {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }),
      })),
  ].slice(0, 3);
  if (!cards.length) return null;

  return (
    <section aria-labelledby={h} className="py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <StickerHeading id={h} tilt={-1.5}>
          {t('title')}
        </StickerHeading>
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {cards.map((c, i) => (
            <li key={c.id} style={{ rotate: tilt(TILTS[i] ?? 0) }}>
              <Link
                href="/deals"
                className={clsx(
                  'flex h-full press flex-col gap-3 rounded-card border-3 border-ink p-2 text-ink shadow-hard-md [--press-x:6px] [--press-y:6px]',
                  c.kind === 'deal' ? 'bg-yellow' : 'bg-blue-light',
                )}
              >
                {/* Dashed inner edge = coupon. */}
                <span className="flex h-full flex-col items-start gap-2 rounded-sticker border-3 border-dashed border-ink bg-white p-4">
                  <Tag tone={c.kind === 'deal' ? 'orange' : 'blue'}>{t(c.kind)}</Tag>
                  <span className="font-price text-3xl leading-tight tracking-[0.02em] uppercase">
                    {c.title}
                  </span>
                  {c.meta && (
                    <span className="mt-auto font-price text-2xl tracking-[0.02em] text-blue-deep">
                      {c.meta}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center">
          <Link href="/deals" className={buttonClasses({ variant: 'secondary' })}>
            {t('seeAll')}
          </Link>
        </p>
      </div>
    </section>
  );
}

export function DealsTeaser({ initial }: { initial?: DealsEvents }) {
  const { data } = useDealsEvents(initial);
  return <DealsTeaserView data={data} />;
}
