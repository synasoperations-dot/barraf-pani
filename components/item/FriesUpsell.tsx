'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Tag } from '@/components/ui/states';
import { useAddToCart } from '@/features/cart/useAddToCart';
import {
  defaultVariant,
  hasRequiredChoice,
  isOrderable,
  itemImage,
  itemsIn,
} from '@/features/menu/helpers';
import type { Menu } from '@/lib/contracts';
import { formatAmount, localized } from '@/lib/format';

/**
 * "Fries on the side?" — fries at their normal prices (§13.1: no combos in v1). One tap adds the
 * default variant. Inside a sheet the fly overlay would sit under the dialog's top layer, so it
 * skips the fly and shows "Added" inline instead.
 */
export function FriesUpsell({ menu, inSheet }: { menu: Menu; inSheet: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const add = useAddToCart();
  const headingId = useId();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  useEffect(() => {
    if (!justAdded) return;
    const id = setTimeout(() => setJustAdded(null), 1800);
    return () => clearTimeout(id);
  }, [justAdded]);
  const fries = menu.categories.find((c) => c.slug === 'fries');
  // One-tap add only works for fries without a required choice.
  const items = fries
    ? itemsIn(menu, fries.id).filter((f) => isOrderable(f) && !hasRequiredChoice(menu, f))
    : [];
  if (!items.length) return null;
  const added = items.find((f) => f.id === justAdded);

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="font-sticker text-xl font-black">
        {t('item.upsellTitle')}
      </h3>
      <p className="text-sm text-muted">{t('item.upsellNote')}</p>
      <p className="sr-only" aria-live="polite">
        {added ? t('cart.addedToast', { name: localized(added.name, locale) }) : ''}
      </p>
      <ul className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-3">
        {items.map((f) => {
          const v = defaultVariant(f);
          const img = itemImage(menu, f);
          const name = localized(f.name, locale);
          const amount = formatAmount(v.price);
          return (
            <li key={f.id} className="shrink-0 snap-start">
              <button
                type="button"
                aria-label={t('item.upsellAdd', { name, amount })}
                onClick={(e) => {
                  add({
                    item: f,
                    variant: v,
                    image: img,
                    from: inSheet ? null : e.currentTarget,
                    source: 'item',
                    toastAction: 'viewCart',
                  });
                  setJustAdded(f.id);
                }}
                className="flex w-36 press flex-col overflow-hidden rounded-card border-3 border-ink bg-white text-start shadow-hard-sm [--press-x:3px] [--press-y:3px]"
              >
                <span className="relative block aspect-[4/3] w-full border-b-3 border-ink bg-paper">
                  {img && <Image src={img} alt="" fill sizes="144px" className="object-cover" />}
                </span>
                <span className="flex flex-1 flex-col gap-1 p-2">
                  <span className="font-price text-xl leading-none tracking-[0.02em] uppercase">
                    {name}
                  </span>
                  <span className="mt-auto flex min-h-8 items-center justify-between gap-1">
                    <span className="font-price text-xl leading-none text-orange-deep">
                      +{t('price.rs', { amount })}
                    </span>
                    {justAdded === f.id ? (
                      <Tag tilt={-4} className="animate-pop">
                        {t('item.upsellAdded')}
                      </Tag>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="grid size-8 place-items-center rounded-full border-2 border-ink bg-yellow font-display text-lg leading-none"
                      >
                        +
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
