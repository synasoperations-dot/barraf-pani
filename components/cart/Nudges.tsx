'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Bolt } from '@/components/ui/motifs';
import { PriceChip } from '@/components/ui/PriceChip';
import { formatAmount } from '@/lib/format';

export interface NudgeItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
}

/** Burger in the cart, no fries: tilted sticker card "Make it furious? + Snow Salt Fries Rs 250". */
export function FriesNudge({ item, onAdd }: { item: NudgeItem; onAdd: (el: HTMLElement) => void }) {
  const t = useTranslations('cartFlow');
  const tp = useTranslations('price');
  const price = tp('rs', { amount: formatAmount(item.price) });
  return (
    <div className="relative rotate-[-1.5deg] rounded-card border-3 border-ink bg-yellow p-4 shadow-sticker">
      <div className="flex items-center gap-3">
        {item.image && (
          <Image
            src={item.image}
            alt=""
            width={64}
            height={64}
            sizes="64px"
            className="aspect-square size-16 shrink-0 rounded-sticker border-2 border-ink object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-sticker text-xl font-black">
            <Bolt size={22} />
            {t('friesTitle')}
          </p>
          <p className="text-sm">{t('friesBody')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => onAdd(e.currentTarget)}
        aria-label={t('friesAddLabel', { name: item.name, price })}
        className="mt-3 flex min-h-12 w-full press items-center justify-between gap-2 rounded-button border-3 border-ink bg-white px-4 shadow-hard"
      >
        <span className="font-price text-2xl tracking-[0.02em] uppercase">
          {t('friesAdd', { name: item.name })}
        </span>
        <span className="font-price text-2xl tracking-[0.02em]">{price}</span>
      </button>
    </div>
  );
}

/** No dip in the cart: a horizontal scroll-snap row of dips, each adds in one tap. */
export function DipsCarousel({
  dips,
  onAdd,
}: {
  dips: NudgeItem[];
  onAdd: (id: string, el: HTMLElement) => void;
}) {
  const t = useTranslations('cartFlow');
  const tp = useTranslations('price');
  const id = useId();
  if (dips.length === 0) return null;
  return (
    <section aria-labelledby={id} className="space-y-2">
      <div>
        <h3 id={id} className="font-sticker text-xl font-black">
          {t('dipsTitle')}
        </h3>
        <p className="text-sm text-muted">{t('dipsBody')}</p>
      </div>
      <ul className="-mx-1 flex snap-x snap-mandatory [scrollbar-width:thin] gap-3 overflow-x-auto px-1 pt-1 pb-3">
        {dips.map((d) => (
          <li
            key={d.id}
            className="flex w-32 shrink-0 snap-start flex-col items-center gap-2 rounded-card border-3 border-ink bg-white p-3 text-center shadow-hard-sm"
          >
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-full border-3 border-ink bg-orange halftone"
            >
              <Bolt size={20} />
            </span>
            <span className="font-price text-xl leading-none tracking-[0.02em] uppercase">
              {d.name}
            </span>
            <PriceChip
              tone="paper"
              label="+"
              price={d.price}
              aria-label={t('dipAddLabel', {
                name: d.name,
                price: tp('rs', { amount: formatAmount(d.price) }),
              })}
              onClick={(e) => onAdd(d.id, e.currentTarget)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
