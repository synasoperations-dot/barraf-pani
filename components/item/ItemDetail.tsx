'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  useEffect,
  useId,
  useRef,
  useState,
  ViewTransition,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { RadioCards } from '@/components/ui/form';
import { Bolt, BoltPair } from '@/components/ui/motifs';
import { Odometer } from '@/components/ui/Odometer';
import { Stamp } from '@/components/ui/Stamp';
import { ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { Stepper } from '@/components/ui/Stepper';
import { StickerToggle } from '@/components/ui/StickerToggle';
import { useAddToCart, type AddToCartArgs } from '@/features/cart/useAddToCart';
import {
  resolveChoice,
  sizesOf,
  togglePick,
  variantForSize,
  type Picks,
} from '@/features/item/selection';
import {
  categoryOf,
  findItemBySlug,
  itemImage,
  modifierGroupsFor,
  unitEstimate,
} from '@/features/menu/helpers';
import { useMenu } from '@/features/menu/useMenu';
import { orderingMode, useStoreStatus } from '@/features/store/useStore';
import { track } from '@/lib/analytics';
import { isApiError } from '@/lib/api';
import type { Item, Menu, Modifier, ModifierGroup, Variant } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatAmount, localized } from '@/lib/format';
import { itemPhotoTransitionName } from '@/lib/motion';
import { FriesUpsell } from './FriesUpsell';
import { ItemNotFound } from './ItemNotFound';
import { spicyBurst } from './spicyBurst';

// Framer Motion ships only with pizzas.
const PizzaArt = dynamic(() => import('./PizzaArt'), {
  loading: () => <Skeleton className="aspect-square w-full rounded-card" />,
});

type Mode = 'sheet' | 'page';

/** Burgers, sandwiches and wraps get the fries upsell row. */
const UPSELL_CATEGORIES = ['burgers', 'sandwiches', 'wraps'];

/**
 * Item detail, used by the intercepted sheet (`mode="sheet"`) and the full page. Reads the live
 * menu, so a sold-out toggle over realtime updates an open sheet.
 */
export function ItemDetail({ slug, initial, mode }: { slug: string; initial?: Menu; mode: Mode }) {
  const t = useTranslations();
  const router = useRouter();
  const message = useErrorMessage();
  const pathname = usePathname();
  const menuQ = useMenu(initial);
  const menu = menuQ.data;
  const item = menu ? findItemBySlug(menu, slug) : null;

  // Parallel slots keep their last page on soft navigation, so a Link away (e.g. "Back to the
  // menu") would leave the sheet open over the new page. Hide it once the URL leaves /item/*.
  if (mode === 'sheet' && !pathname.startsWith('/item/')) return null;
  if (menu && item) return <ItemConfigurator key={item.id} menu={menu} item={item} mode={mode} />;

  const e = menuQ.error;
  const offline =
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    (isApiError(e) && e.code === 'NETWORK_ERROR');
  return (
    <Frame mode={mode} title={t('nav.menu')} onClose={() => router.back()}>
      {menu ? (
        <ItemNotFound />
      ) : menuQ.isError && !menuQ.isFetching ? (
        <ErrorState
          offline={offline}
          body={offline ? undefined : message(e)}
          onRetry={() => void menuQ.refetch()}
        />
      ) : (
        <DetailSkeleton label={t('item.loading')} />
      )}
    </Frame>
  );
}

function Frame({
  mode,
  title,
  footer,
  onClose,
  children,
}: {
  mode: Mode;
  title: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  if (mode === 'sheet')
    return (
      <Sheet open onClose={onClose} title={title} footer={footer}>
        {children}
      </Sheet>
    );
  return <div className="mx-auto max-w-6xl px-4 pt-6 md:pt-10">{children}</div>;
}

export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10" aria-busy="true">
      <span className="sr-only" role="status">
        {label}
      </span>
      <Skeleton className="aspect-[4/3] w-full rounded-card" />
      <Skeleton className="h-10 w-2/3" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-button" />
    </div>
  );
}

/** The configurator itself. `onClose` replaces router.back() for the sheet (the /dev/ui previews). */
export function ItemConfigurator({
  menu,
  item,
  mode,
  onClose,
}: {
  menu: Menu;
  item: Item;
  mode: Mode;
  onClose?: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const add = useAddToCart();
  const store = useStoreStatus();
  const groups = modifierGroupsFor(menu, item);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Picks>({});
  const [qty, setQty] = useState(1);
  const { variant, modifiers, missing, soldOut, canAdd } = resolveChoice(
    item,
    groups,
    variantId,
    picks,
  );
  const heroRef = useRef<HTMLDivElement>(null);
  const pendingAdd = useRef<AddToCartArgs | null>(null);

  const name = localized(item.name, locale);
  const image = itemImage(menu, item);
  const category = categoryOf(menu, item);
  const chosen = new Set(modifiers.map((m) => m.id));
  const total = unitEstimate(variant, modifiers) * qty;
  const rs = (amount: number) => t('price.rs', { amount: formatAmount(amount) });
  const variantLabel = (v: Variant) => (v.option ? t(`variant.${v.option}`) : v.name);
  const close = onClose ?? (() => router.back());

  useEffect(() => {
    track('item_viewed', { itemId: item.id, slug: item.slug });
  }, [item.id, item.slug]);

  // Sheet: the cart add runs once the sheet has unmounted, so the fly and the toast aren't hidden
  // under the <dialog> top layer.
  useEffect(
    () => () => {
      const args = pendingAdd.current;
      pendingAdd.current = null;
      if (args) add(args);
    },
    [add],
  );

  const pick = (g: ModifierGroup, m: Modifier) => {
    setPicks((p) => togglePick(p, g, m.id));
    if (g.maxSelect === 1 && !chosen.has(m.id) && /spicy/i.test(m.name.en))
      spicyBurst(heroRef.current);
  };

  const onAdd = (e: MouseEvent<HTMLButtonElement>) => {
    // A second tap while the sheet closes must not go back twice.
    if (!canAdd || pendingAdd.current) return;
    const args: AddToCartArgs = {
      item,
      variant,
      modifiers,
      qty,
      image,
      source: 'item',
      toastAction: 'viewCart',
    };
    if (mode === 'page') {
      add({ ...args, from: e.currentTarget });
      setQty(1);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    // ponytail: a rect stand-in for `from`; the real button is gone once the sheet unmounts.
    pendingAdd.current = { ...args, from: { getBoundingClientRect: () => rect } as Element };
    close();
  };

  const prices = item.variants.filter((v) => v.isAvailable).map((v) => v.price);
  const priceLine =
    prices.length > 1
      ? t('price.from', { amount: formatAmount(Math.min(...prices)) })
      : rs(variant.price);
  const sizes = sizesOf(item);
  const sizeGroup = sizes.find((s) => s.size === variant.size);
  const hint = soldOut
    ? null
    : missing[0] &&
      t('item.chooseFirst', { group: localized(missing[0].name, locale).toLowerCase() });
  const hintId = useId();

  const hero = (
    <div
      ref={heroRef}
      className="relative isolate overflow-hidden rounded-card border-3 border-ink bg-white shadow-hard-md"
    >
      <ViewTransition name={itemPhotoTransitionName(item.slug)} share="morph" default="none">
        <div
          className={clsx('relative w-full', image ? 'aspect-[4/3]' : 'aspect-[2/1] grid-paper')}
        >
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              preload={mode === 'page'}
              sizes={
                mode === 'page'
                  ? '(min-width: 768px) 45vw, 100vw'
                  : '(min-width: 768px) 512px, 100vw'
              }
              className={clsx('object-cover transition-[filter]', soldOut && 'grayscale')}
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2">
              <BoltPair side="start" />
              <span className="font-price text-2xl tracking-[0.02em] text-muted uppercase">
                {t('item.noPhoto')}
              </span>
              <BoltPair side="end" />
            </div>
          )}
        </div>
      </ViewTransition>
      {soldOut && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-ink/30">
          <Stamp size="lg" animate>
            {t('item.soldOutStamp')}
          </Stamp>
        </div>
      )}
    </div>
  );

  const heading = (
    <header className="space-y-2">
      {category && (
        <Tag tone="blue" tilt={-2}>
          {localized(category.name, locale)}
        </Tag>
      )}
      {mode === 'page' && (
        <h1 className="font-price text-5xl leading-none tracking-[0.02em] uppercase md:text-6xl">
          {name}
        </h1>
      )}
      <p className="font-price text-3xl leading-none tracking-[0.02em] text-orange-deep">
        {priceLine}
      </p>
      {item.description && <p className="text-muted">{localized(item.description, locale)}</p>}
    </header>
  );

  const legend = (text: ReactNode, required?: boolean) => (
    <span className="flex items-center gap-2">
      <span className="font-sticker text-lg font-black">{text}</span>
      {required && <Tag tone="orange">{t('item.required')}</Tag>}
    </span>
  );
  const priceNote = (available: boolean, price: number, plus = false) => (
    <span className="font-price text-xl tracking-[0.02em] text-ink">
      {available ? `${plus ? '+' : ''}${rs(price)}` : t('common.soldOut')}
    </span>
  );

  const choices = (
    <fieldset disabled={soldOut} className="min-w-0 space-y-7 disabled:opacity-60">
      {sizes.length > 0 && variant.size ? (
        <div className="@container space-y-4">
          {/* Container query: side by side only where the column is wide (not in the sheet). */}
          <div className="flex flex-col gap-4 @xl:flex-row @xl:items-start">
            <div className="w-40 shrink-0 self-center @xl:w-44 @xl:self-start">
              <PizzaArt size={variant.size} />
            </div>
            <RadioCards
              legend={legend(t('item.sizeLegend'))}
              className="flex-1 [&>div]:grid-cols-2"
              value={variant.size}
              onChange={(size) => {
                const v = variantForSize(item, size, variant);
                if (v) setVariantId(v.id);
              }}
              options={sizes.map((s) => {
                const avail = s.variants.filter((v) => v.isAvailable);
                const min = Math.min(...avail.map((v) => v.price));
                return {
                  value: s.size,
                  disabled: !avail.length,
                  label: (
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-price text-3xl leading-none">{s.size}</span>
                      <span className="text-sm font-medium text-muted">
                        {t(`item.sizes.${s.size}`)}
                      </span>
                    </span>
                  ),
                  description:
                    avail.length > 1 ? (
                      <span className="font-price text-xl tracking-[0.02em] text-ink">
                        {t('price.from', { amount: formatAmount(min) })}
                      </span>
                    ) : (
                      priceNote(avail.length > 0, avail[0]?.price ?? 0)
                    ),
                };
              })}
            />
          </div>
          {sizeGroup && sizeGroup.variants.length > 1 && (
            <RadioCards
              legend={legend(t('item.optionLegend'))}
              className="[&>div]:grid-cols-2"
              value={variant.id}
              onChange={setVariantId}
              options={sizeGroup.variants.map((v) => ({
                value: v.id,
                label: variantLabel(v),
                description: priceNote(v.isAvailable, v.price),
                disabled: !v.isAvailable,
              }))}
            />
          )}
        </div>
      ) : (
        item.variants.length > 1 && (
          <RadioCards
            legend={legend(t('item.variantLegend'))}
            className="[&>div]:grid-cols-2"
            value={variant.id}
            onChange={setVariantId}
            options={item.variants.map((v) => ({
              value: v.id,
              label: variantLabel(v),
              description: priceNote(v.isAvailable, v.price),
              disabled: !v.isAvailable,
            }))}
          />
        )
      )}

      {groups.map((g) => {
        const gName = localized(g.name, locale);
        // Required single choice (Honey Glazed "Style") → radios; anything else → peel-on stickers.
        if (g.minSelect >= 1 && g.maxSelect === 1)
          return (
            <RadioCards
              key={g.id}
              legend={legend(gName, true)}
              className="[&>div]:grid-cols-2"
              value={g.modifiers.find((m) => chosen.has(m.id))?.id ?? null}
              onChange={(id) => {
                const m = g.modifiers.find((x) => x.id === id);
                if (m) pick(g, m);
              }}
              options={g.modifiers.map((m) => ({
                value: m.id,
                label: localized(m.name, locale),
                description:
                  m.price || !m.isAvailable ? priceNote(m.isAvailable, m.price, true) : undefined,
                disabled: !m.isAvailable,
              }))}
            />
          );
        const count = g.modifiers.filter((m) => chosen.has(m.id)).length;
        const full = count >= g.maxSelect;
        const gHint = `${hintId}-${g.id}`;
        return (
          <fieldset key={g.id} className="min-w-0">
            <legend className="mb-1">{legend(gName, g.minSelect > 0)}</legend>
            <p id={gHint} aria-live="polite" className="mb-3 text-sm text-muted">
              {full
                ? t('item.maxReached', { max: g.maxSelect })
                : t('item.pickUpTo', { max: g.maxSelect })}
            </p>
            <div className="flex flex-wrap gap-3">
              {g.modifiers.map((m) => {
                const on = chosen.has(m.id);
                return (
                  <StickerToggle
                    key={m.id}
                    checked={on}
                    disabled={!m.isAvailable || (!on && full)}
                    aria-describedby={gHint}
                    onChange={() => pick(g, m)}
                    aside={priceNote(m.isAvailable, m.price, true)}
                  >
                    {localized(m.name, locale)}
                  </StickerToggle>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </fieldset>
  );

  const notes = (
    <>
      {orderingMode(store.data) !== 'open' && !soldOut && (
        <p className="flex items-start gap-2 rounded-input border-3 border-ink bg-yellow p-3 text-sm font-medium">
          <Bolt size={20} />
          {t('item.closedNote')}
        </p>
      )}
      {soldOut && (
        <div className="flex flex-col items-start gap-3 rounded-card border-3 border-ink bg-white p-4 shadow-hard-sm">
          <p className="font-medium">{t('item.soldOutBody')}</p>
          <Link href="/menu" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            {t('item.backToMenu')}
          </Link>
        </div>
      )}
    </>
  );

  const bar = (
    <div className="space-y-2">
      {hint && (
        <p id={hintId} className="flex items-center gap-2 text-sm font-medium">
          <span
            aria-hidden="true"
            className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange font-display text-xs"
          >
            !
          </span>
          {hint}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Stepper value={qty} onChange={setQty} min={1} max={50} />
        <Button
          size="lg"
          className="min-w-0 flex-1 px-4!"
          disabled={!canAdd}
          aria-describedby={hint ? hintId : undefined}
          onClick={onAdd}
        >
          <span>{t('item.add')}</span>
          <span aria-hidden="true">·</span>
          <Odometer value={total} />
        </Button>
      </div>
    </div>
  );

  const upsell = category && UPSELL_CATEGORIES.includes(category.slug) && !soldOut && (
    <FriesUpsell menu={menu} inSheet={mode === 'sheet'} />
  );

  if (mode === 'sheet')
    return (
      <Frame mode="sheet" title={name} footer={bar} onClose={close}>
        <div className="space-y-6">
          {hero}
          {heading}
          {notes}
          {choices}
          {upsell}
        </div>
      </Frame>
    );

  return (
    <Frame mode="page" title={name} onClose={close}>
      <div className="md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start md:gap-10">
        <div className="md:sticky md:top-24">{hero}</div>
        <div className="mt-6 space-y-7 md:mt-0">
          {heading}
          {notes}
          {choices}
          {upsell}
          {/* Sits above the mobile cart bar (z-30): on this page, Add is the primary action. */}
          <div className="sticky bottom-0 z-40 -mx-4 border-t-3 border-ink bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-4 md:mx-0 md:mb-10 md:rounded-card md:border-3 md:p-4 md:shadow-hard-md">
            {bar}
          </div>
        </div>
      </div>
    </Frame>
  );
}
