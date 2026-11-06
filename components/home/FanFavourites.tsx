'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useId, ViewTransition } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Stamp } from '@/components/ui/Stamp';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import { GridPaper } from '@/components/ui/motifs';
import { useAddToCart } from '@/features/cart/useAddToCart';
import {
  defaultVariant,
  findItemBySlug,
  hasRequiredChoice,
  isOrderable,
  itemImage,
} from '@/features/menu/helpers';
import { useMenu } from '@/features/menu/useMenu';
import { isApiError } from '@/lib/api';
import type { Item, Menu } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatAmount, localized } from '@/lib/format';
import { itemPhotoTransitionName } from '@/lib/motion';

export const FAVOURITE_SLUGS = [
  'fillet-fury',
  'deep-cheese-core',
  'philly-cheesesteak-fries',
  'honey-glazed-wings',
];

/** No connection, or the request never got a response. */
export const isOffline = (e: unknown) =>
  (typeof navigator !== 'undefined' && !navigator.onLine) ||
  (isApiError(e) && e.code === 'NETWORK_ERROR');

interface CardProps {
  item: Item;
  image: string | null;
  /** Required modifiers (e.g. wing style): "Add +" opens the item sheet instead. */
  needsChoice: boolean;
  onAdd: (item: Item, from: Element) => void;
}

export function FavouriteCard({ item, image, needsChoice, onAdd }: CardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const name = localized(item.name, locale);
  const variant = defaultVariant(item);
  const variantLabel = [variant.size, variant.option && t(`variant.${variant.option}`)]
    .filter(Boolean)
    .join(' ');
  const soldOut = !isOrderable(item);
  const href = `/item/${item.slug}`;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Link href={href} className="group flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden border-b-3 border-ink grid-paper">
          {image && (
            <ViewTransition name={itemPhotoTransitionName(item.slug)} share="morph" default="none">
              <Image
                src={image}
                alt=""
                fill
                sizes="(min-width: 1024px) 18rem, (min-width: 640px) 45vw, 90vw"
                className={`object-cover transition-transform duration-300 group-hover:scale-105 ${soldOut ? 'grayscale' : ''}`}
              />
            </ViewTransition>
          )}
          {soldOut && (
            <span className="absolute inset-0 grid place-items-center">
              <Stamp size="md" animate>
                {t('home.favourites.soldOutStamp')}
              </Stamp>
            </span>
          )}
        </div>
        <h3 className="px-4 pt-3 font-price text-2xl leading-tight tracking-[0.02em] uppercase">
          {name}
          {variantLabel && <span className="ms-2 text-blue-deep">{variantLabel}</span>}
        </h3>
      </Link>
      <div className="flex items-center justify-between gap-3 px-4 pt-1 pb-4">
        <p className="font-price text-3xl tracking-[0.02em] text-orange-deep">
          {t('price.rs', { amount: formatAmount(variant.price) })}
        </p>
        {soldOut ? (
          <Button disabled>{t('common.soldOut')}</Button>
        ) : needsChoice ? (
          <Link
            href={href}
            aria-label={t('home.favourites.choose', { name })}
            className={buttonClasses()}
          >
            {t('home.favourites.add')}
          </Link>
        ) : (
          <Button
            aria-label={t('home.favourites.addLabel', { name })}
            onClick={(e) => onAdd(item, e.currentTarget)}
          >
            {t('home.favourites.add')}
          </Button>
        )}
      </div>
    </Card>
  );
}

interface ViewProps {
  menu: Menu | undefined;
  error: unknown;
  onRetry: () => void;
  onAdd: (item: Item, from: Element) => void;
}

export function FanFavouritesView({ menu, error, onRetry, onAdd }: ViewProps) {
  const t = useTranslations('home.favourites');
  const h = useId();
  const errorMessage = useErrorMessage();
  const items = menu
    ? FAVOURITE_SLUGS.map((s) => findItemBySlug(menu, s)).filter((i): i is Item => i !== null)
    : [];

  return (
    <GridPaper id="fan-favourites" className="scroll-mt-24 py-14 md:py-20">
      <section aria-labelledby={h} className="mx-auto max-w-6xl px-4">
        <StickerHeading id={h} halftone tilt={-2}>
          {t('title')}
        </StickerHeading>
        <div className="mt-10">
          {menu ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <FavouriteCard
                    item={item}
                    image={itemImage(menu, item)}
                    needsChoice={hasRequiredChoice(menu, item)}
                    onAdd={onAdd}
                  />
                </li>
              ))}
            </ul>
          ) : error ? (
            <ErrorState
              offline={isOffline(error)}
              body={isOffline(error) ? undefined : errorMessage(error)}
              onRetry={onRetry}
            />
          ) : (
            <ul aria-busy="true" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FAVOURITE_SLUGS.map((s) => (
                <li key={s}>
                  <Skeleton className="aspect-[4/5] rounded-card" />
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-10 text-center">
          <Link href="/menu" className={buttonClasses({ variant: 'ghost' })}>
            {t('seeMenu')}
          </Link>
        </p>
      </section>
    </GridPaper>
  );
}

/** Four real photos; "Add +" adds straight to the cart (flyToCart → badge bump). */
export function FanFavourites({ initial }: { initial?: Menu }) {
  const q = useMenu(initial);
  const add = useAddToCart();
  return (
    <FanFavouritesView
      menu={q.data}
      error={q.error}
      onRetry={() => void q.refetch()}
      onAdd={(item, from) =>
        q.data &&
        add({
          item,
          variant: defaultVariant(item),
          image: itemImage(q.data, item),
          from,
          source: 'home',
        })
      }
    />
  );
}
