'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { useDebounced, useQuote } from '@/features/cart/useQuote';
import {
  categoryOf,
  defaultVariant,
  findItemById,
  findItemBySlug,
  isOrderable,
  itemImage,
  itemsIn,
} from '@/features/menu/helpers';
import { refetchMenu, useMenu } from '@/features/menu/useMenu';
import { orderingMode, useStoreStatus } from '@/features/store/useStore';
import { track } from '@/lib/analytics';
import { isApiError } from '@/lib/api';
import type { Fulfilment, Item, Menu, QuoteRequest, StoreStatus } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { localized } from '@/lib/format';
import { selectEstimate, toCartLines, useCart, type CartEntry } from '@/stores/cart';
import { useUi } from '@/stores/ui';
import { CartLineView, UndoPill } from './CartLine';
import { CheckoutCta, type CtaState } from './CheckoutCta';
import { EmptyCart } from './EmptyCart';
import { DipsCarousel, FriesNudge } from './Nudges';
import { PromoField, type PromoStatus } from './PromoField';

/** The cart lives in localStorage and rehydrates after mount: show skeletons until then. */
const useHydrated = () =>
  useSyncExternalStore(
    useCart.persist.onFinishHydration,
    () => useCart.persist.hasHydrated(),
    () => false,
  );

/** Cart lines joined with the live menu: sold-out flag, modifier names, "Replace" target. */
function useCartView(initialMenu?: Menu) {
  const lines = useCart((s) => s.lines);
  const flagged = useCart((s) => s.soldOutItemIds);
  const menuQuery = useMenu(initialMenu);
  const menu = menuQuery.data;

  const view = useMemo(() => {
    const mods = new Map(
      menu?.modifierGroups.flatMap((g) => g.modifiers).map((m) => [m.id, m.name] as const),
    );
    return lines.map((line) => {
      const item = menu ? findItemById(menu, line.itemId) : null;
      const variant = item?.variants.find((v) => v.id === line.variantId);
      const cat = menu && item ? categoryOf(menu, item) : null;
      const top = cat?.parentId ? menu?.categories.find((c) => c.id === cat.parentId) : cat;
      return {
        line,
        item,
        cat,
        // Server flag, or the live menu says it's gone (realtime flips this, §4.6).
        soldOut:
          flagged.includes(line.itemId) ||
          (!!menu && (!item?.isActive || item.isSoldOut || !variant?.isAvailable)),
        modifiers: line.modifierIds.flatMap((id) => mods.get(id) ?? []),
        replaceHref: top ? `/menu#${top.slug}` : '/menu',
      };
    });
  }, [lines, flagged, menu]);

  return { view, menu, menuPending: menuQuery.isPending, anySoldOut: view.some((v) => v.soldOut) };
}

/** Promo status from the pickup quote (it only validates the code; fees come at checkout). */
function usePromo(view: ReturnType<typeof useCartView>['view'], active: boolean) {
  const message = useErrorMessage();
  const qc = useQueryClient();
  const code = useCart((s) => s.promoCode);
  // useQuote debounces too: until this settles, the error on screen belongs to the previous code.
  const settledCode = useDebounced(code);
  const lines = useMemo(() => view.filter((v) => !v.soldOut).map((v) => v.line), [view]);
  const request = useMemo<QuoteRequest | null>(
    () =>
      // The drawer is always mounted: only quote while it's open (or on /cart).
      active && code && lines.length
        ? {
            lines: toCartLines(lines),
            fulfilment: 'pickup',
            addressId: null,
            location: null,
            promoCode: code,
            scheduledFor: null,
            tip: 0,
            phone: null,
          }
        : null,
    [active, code, lines],
  );
  const q = useQuote(request);

  // §2.4: on ITEM_SOLD_OUT, flag the line and re-fetch the menu (the line then leaves the quote).
  useEffect(() => {
    const e = q.error;
    if (!isApiError(e) || e.code !== 'ITEM_SOLD_OUT') return;
    const id = e.details?.itemId;
    const s = useCart.getState();
    if (typeof id === 'string' && !s.soldOutItemIds.includes(id))
      s.markSoldOut([...s.soldOutItemIds, id]);
    void refetchMenu(qc);
  }, [q.error, qc]);

  let status: PromoStatus = { kind: 'none' };
  if (code) {
    const e = q.error;
    const errCode = isApiError(e) ? e.code : e ? 'INTERNAL_ERROR' : null;
    const applied = q.data?.promo?.code === code;
    if (!lines.length) status = { kind: 'later' };
    else if (settledCode !== code || (q.isFetching && (e || !applied)))
      status = { kind: 'checking' };
    else if (errCode?.startsWith('PROMO_')) status = { kind: 'invalid', message: message(e) };
    else if (
      errCode === 'NETWORK_ERROR' ||
      errCode === 'INTERNAL_ERROR' ||
      errCode === 'RATE_LIMITED'
    )
      status = { kind: 'failed', message: message(e) };
    else if (errCode) status = { kind: 'later' };
    else if (applied) status = { kind: 'applied', discount: q.data?.promo?.discount ?? 0 };
    else status = { kind: 'checking' }; // debounce window before the request goes out
  }
  // refetch() ignores `enabled`: never fire it without a request.
  return { code, status, retry: () => void (request && q.refetch()) };
}

/** Estimate + Checkout / Pre-order / closed CTA. The drawer puts this in its footer. */
export function CartCheckout({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  const format = useFormatter();
  const message = useErrorMessage();
  const estimate = useCart(selectEstimate);
  const { anySoldOut } = useCartView();
  const { data: s, isPending } = useStoreStatus();
  const mode = orderingMode(s);

  let state: CtaState;
  if (anySoldOut) state = { kind: 'blocked' };
  else if (isPending) state = { kind: 'loading' };
  else if (mode !== 'closed') state = { kind: mode };
  else
    state = {
      kind: 'closed',
      label:
        s?.state === 'paused'
          ? s.pauseReason
            ? t('store.pausedReason', { reason: s.pauseReason })
            : t('store.paused')
          : s?.opensAt
            ? t('cartFlow.closedOpensAt', {
                time: format.dateTime(new Date(s.opensAt), {
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                }),
              })
            : t('store.closed'),
    };

  const min = s?.minOrderValue ?? 0;
  const hint =
    estimate < min
      ? message({ code: 'BELOW_MIN_ORDER', details: { minOrder: min, shortBy: min - estimate } })
      : null;

  return <CheckoutCta estimate={estimate} state={state} hint={hint} onNavigate={onNavigate} />;
}

interface CartContentsProps {
  layout: 'drawer' | 'page';
  /** Called before any in-cart link navigates (the drawer closes itself). */
  onNavigate?: () => void;
  /** Server-read seeds (the /cart page passes these). */
  menu?: Menu;
  status?: StoreStatus;
}

/** Shared by the cart drawer and /cart: lines, nudges, fulfilment, promo (+ CTA on the page). */
export function CartContents({ layout, onNavigate, menu: initialMenu, status }: CartContentsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const hydrated = useHydrated();
  const { view, menu, menuPending } = useCartView(initialMenu);
  useStoreStatus(status);
  const drawerOpen = useUi((s) => s.cartOpen);
  const promo = usePromo(view, layout === 'page' || drawerOpen);
  const fulfilment = useCart((s) => s.fulfilment);
  const [replaced, setReplaced] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: number; message: string; restore: () => void } | null>(
    null,
  );
  const addToCart = useAddToCart();
  const cart = useCart.getState();

  // cart_viewed: the drawer fires it on open; the page fires it once the cart has loaded.
  const viewed = useRef(false);
  useEffect(() => {
    if (layout !== 'page' || !hydrated || viewed.current) return;
    viewed.current = true;
    const s = useCart.getState();
    track('cart_viewed', { lines: s.lines.length, estimate: selectEstimate(s) });
  }, [layout, hydrated]);

  // The pill waits while Undo holds focus (a timed control must not vanish under the user).
  const [holdUndo, setHoldUndo] = useState(false);
  useEffect(() => {
    if (!undo || holdUndo) return;
    const id = setTimeout(() => setUndo(null), 4500);
    return () => clearTimeout(id);
  }, [undo, holdUndo]);

  if (!hydrated)
    return (
      <div className="space-y-3" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-14 rounded-button" />
      </div>
    );

  const remove = (entry: CartEntry) => {
    const s = useCart.getState();
    const index = s.lines.findIndex((l) => l.key === entry.key);
    if (index < 0) return;
    s.remove(entry.key);
    const restore = () =>
      useCart.setState((c) =>
        c.lines.some((l) => l.key === entry.key)
          ? c
          : { lines: [...c.lines.slice(0, index), entry, ...c.lines.slice(index)] },
      );
    const message = t('cartFlow.removed', { name: localized(entry.snapshot.name, locale) });
    // Toasts render under an open <dialog>, so the drawer shows its own pill.
    if (layout === 'page') toast(message, { action: { label: t('cart.undo'), onClick: restore } });
    else setUndo((u) => ({ id: (u?.id ?? 0) + 1, message, restore }));
  };

  const add = (item: Item, el: HTMLElement) =>
    menu &&
    addToCart({
      item,
      variant: defaultVariant(item),
      image: itemImage(menu, item),
      // The fly is hidden under the drawer's top layer; the new line shows up right here instead.
      from: layout === 'page' ? el : null,
      source: 'cart',
    });

  const slugs = new Set(view.flatMap((v) => (v.cat ? [v.cat.slug] : [])));
  const fries = menu ? findItemBySlug(menu, 'snow-salt-fries') : null;
  const friesCat = menu?.categories.find((c) => c.slug === 'fries');
  const hasFries = view.some(
    (v) => v.cat && (v.cat.id === friesCat?.id || v.cat.parentId === friesCat?.id),
  );
  const dipsCat = menu?.categories.find((c) => c.slug === 'dips' && c.isActive);
  const dips =
    menu && dipsCat && !slugs.has('dips') ? itemsIn(menu, dipsCat.id).filter(isOrderable) : [];

  const empty = view.length === 0;
  const undoRegion = (
    <div
      role="status"
      className="sticky bottom-0 z-10"
      onFocus={() => setHoldUndo(true)}
      onBlur={() => setHoldUndo(false)}
    >
      {undo && (
        // Remounts per removal so Undo takes focus: the removed line's button is gone and
        // focus would otherwise fall to <body> inside the modal.
        <UndoPill
          key={undo.id}
          autoFocus
          message={undo.message}
          onUndo={() => {
            undo.restore();
            setUndo(null);
            setHoldUndo(false);
          }}
        />
      )}
    </div>
  );

  const linesList = (
    <>
      <ul aria-label={t('cartFlow.lines')} className="space-y-3">
        {view.map((v) => {
          const { line } = v;
          const name = localized(line.snapshot.name, locale);
          return (
            <CartLineView
              key={line.key}
              name={name}
              variant={[
                line.snapshot.size,
                line.snapshot.option && t(`variant.${line.snapshot.option}`),
              ]
                .filter(Boolean)
                .join(' · ')}
              modifiers={v.modifiers.map((n) => localized(n, locale))}
              note={line.note}
              image={line.snapshot.image}
              qty={line.qty}
              lineTotal={line.snapshot.unitPrice * line.qty}
              soldOut={v.soldOut}
              replaceHref={v.replaceHref}
              onQty={(q) => cart.setQty(line.key, q)}
              onRemove={() => remove(line)}
              onNavigate={onNavigate}
            />
          );
        })}
      </ul>
      <p className="hidden text-xs text-muted pointer-coarse:block">{t('cartFlow.swipeHint')}</p>
    </>
  );

  const nudges = menuPending ? (
    <Skeleton className="h-32 rounded-card" />
  ) : (
    menu && (
      <>
        {slugs.has('burgers') && !hasFries && fries && isOrderable(fries) && (
          <FriesNudge
            item={{
              id: fries.id,
              name: localized(fries.name, locale),
              price: defaultVariant(fries).price,
              image: itemImage(menu, fries),
            }}
            onAdd={(el) => add(fries, el)}
          />
        )}
        <DipsCarousel
          dips={dips.map((d) => ({
            id: d.id,
            name: localized(d.name, locale),
            price: defaultVariant(d).price,
            image: itemImage(menu, d),
          }))}
          onAdd={(id, el) => {
            const d = dips.find((x) => x.id === id);
            if (d) add(d, el);
          }}
        />
      </>
    )
  );

  const options = (
    <>
      <SegmentedToggle<Fulfilment>
        label={t('fulfilment.label')}
        value={fulfilment}
        onChange={cart.setFulfilment}
        options={[
          { value: 'delivery', label: t('fulfilment.delivery') },
          { value: 'pickup', label: t('fulfilment.pickup') },
        ]}
        className="w-full [&>label]:flex-1 [&>label]:justify-center"
      />
      <PromoField
        code={promo.code}
        status={promo.status}
        replaced={replaced}
        onApply={(c) => {
          const prev = useCart.getState().promoCode;
          const next = c.trim().toUpperCase();
          // Same code again = "check it again" (the store wouldn't change, so nothing would refetch).
          if (prev === next) return promo.retry();
          setReplaced(prev);
          cart.setPromoCode(next);
        }}
        onRemove={() => {
          setReplaced(null);
          cart.setPromoCode(null);
        }}
        onRetry={promo.retry}
      />
    </>
  );

  if (layout === 'drawer')
    return (
      <div className="space-y-5">
        {empty ? (
          <EmptyCart onNavigate={onNavigate} />
        ) : (
          <>
            {linesList}
            {nudges}
            {options}
          </>
        )}
        {undoRegion}
      </div>
    );

  if (empty) return <EmptyCart />;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div className="space-y-5">
        {linesList}
        {nudges}
      </div>
      <aside className="space-y-5 rounded-card border-3 border-ink bg-white p-5 shadow-hard-md lg:sticky lg:top-24">
        {options}
        <CartCheckout />
      </aside>
    </div>
  );
}
