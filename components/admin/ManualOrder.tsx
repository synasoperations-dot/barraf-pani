'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Sheet } from '@/components/ui/Dialog';
import { Input, RadioCards, TextArea } from '@/components/ui/form';
import { MapPinPicker } from '@/components/ui/MapPinPicker';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { SourceTag } from '@/components/ui/StatusTag';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { StickerToggle } from '@/components/ui/StickerToggle';
import { Stepper } from '@/components/ui/Stepper';
import { toast } from '@/components/ui/Toast';
import { useDebounced, useQuote } from '@/features/cart/useQuote';
import { waLink } from '@/features/admin/links';
import { addLine, repeatLines, setQty, trackingMessage } from '@/features/admin/manual';
import { rememberMine, useOrderTransition } from '@/features/admin/orders';
import { useStaff } from '@/features/admin/session';
import { togglePick, type Picks } from '@/features/item/selection';
import {
  activeCategories,
  defaultVariant,
  hasRequiredChoice,
  isOrderable,
  itemsIn,
  modifierGroupsFor,
} from '@/features/menu/helpers';
import { matches } from '@/features/menu/search';
import { api, isApiError, newIdempotencyKey } from '@/lib/api';
import type {
  AddressInput,
  CartLine,
  Item,
  Locale,
  ManualOrderRequest,
  ManualOrderResponse,
  Menu,
} from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatAmount, localized } from '@/lib/format';
import { Icon } from './icons';
import { AdminPage, Money, Panel } from './kit';
import { PrepSheet } from './OrderActions';

type Source = ManualOrderRequest['source'];
const SOURCES: Source[] = ['whatsapp', 'phone', 'walk_in', 'foodpanda'];
const EMPTY_ADDRESS: Omit<AddressInput, 'location'> = {
  label: 'home',
  line1: '',
  area: '',
  landmark: null,
};

/** Long-press (or right-click / the ⋯ button) opens variants, add-ons and qty. */
function useLongPress(onLong: () => void, onTap: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  return {
    onPointerDown: () => {
      fired.current = false;
      timer.current = setTimeout(() => {
        fired.current = true;
        onLong();
      }, 450);
    },
    onPointerUp: () => timer.current && clearTimeout(timer.current),
    onPointerLeave: () => timer.current && clearTimeout(timer.current),
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();
      onLong();
    },
    onClick: () => {
      if (!fired.current) onTap();
    },
  };
}

function ItemButton({
  item,
  onAdd,
  onConfigure,
}: {
  item: Item;
  onAdd: () => void;
  onConfigure: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations('admin.manual');
  const press = useLongPress(onConfigure, onAdd);
  const off = !isOrderable(item);
  return (
    <li className="relative">
      <button
        type="button"
        disabled={off}
        {...press}
        className={clsx(
          'flex min-h-20 w-full press flex-col items-start justify-between rounded-input border-3 border-ink p-2 text-start shadow-hard-sm',
          off ? 'bg-grid-line text-muted shadow-none' : 'bg-white',
        )}
      >
        <span className="pe-9 leading-tight font-bold">{localized(item.name, locale)}</span>
        <span className="flex w-full items-end justify-between gap-1">
          <Money value={defaultVariant(item).price} className="text-xl" />
          {off && <span className="text-xs font-bold uppercase">{t('soldOut')}</span>}
        </span>
      </button>
      {!off && (
        <button
          type="button"
          onClick={onConfigure}
          aria-label={t('configure', { name: localized(item.name, locale) })}
          className="absolute end-1 top-1 grid size-9 place-items-center rounded-chip border-2 border-ink bg-paper font-bold"
        >
          ⋯
        </button>
      )}
    </li>
  );
}

function ConfigureSheet({
  menu,
  item,
  onClose,
  onAdd,
}: {
  menu: Menu;
  item: Item;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const t = useTranslations('admin.manual');
  const tp = useTranslations('price');
  const locale = useLocale();
  const [variantId, setVariantId] = useState<string | null>(() => defaultVariant(item).id);
  const [picks, setPicks] = useState<Picks>({});
  const [qty, setQtyState] = useState(1);
  const groups = modifierGroupsFor(menu, item);
  const ok = groups.every((g) => (picks[g.id]?.length ?? 0) >= g.minSelect);
  return (
    <Sheet
      open
      onClose={onClose}
      title={localized(item.name, locale)}
      footer={
        <div className="flex items-center gap-3">
          <Stepper value={qty} onChange={setQtyState} min={1} max={50} />
          <Button
            size="lg"
            className="flex-1"
            disabled={!ok || !variantId}
            onClick={() => {
              onAdd({
                itemId: item.id,
                variantId: variantId!,
                modifierIds: Object.values(picks).flat(),
                qty,
                note: null,
              });
              onClose();
            }}
          >
            {t('addToOrder')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        {item.variants.length > 1 && (
          <ChoiceChips
            legend={t('variant')}
            value={variantId}
            onChange={setVariantId}
            options={item.variants.map((v) => ({
              value: v.id,
              label: v.name,
              sub: tp('rs', { amount: formatAmount(v.price) }),
              disabled: !v.isAvailable,
            }))}
          />
        )}
        {groups.map((g) => (
          <fieldset key={g.id}>
            <legend className="mb-2 text-sm font-bold">
              {localized(g.name, locale)}{' '}
              <span className="font-normal text-muted">
                {t('pickRange', { min: g.minSelect, max: g.maxSelect })}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {g.modifiers.map((m) => (
                <StickerToggle
                  key={m.id}
                  checked={picks[g.id]?.includes(m.id) ?? false}
                  disabled={!m.isAvailable}
                  onChange={() => setPicks((p) => togglePick(p, g, m.id))}
                  aside={
                    m.price ? (
                      <span className="font-price text-lg">+{formatAmount(m.price)}</span>
                    ) : undefined
                  }
                >
                  {localized(m.name, locale)}
                </StickerToggle>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}

function SuccessSheet({
  result,
  customerName,
  onNext,
}: {
  result: ManualOrderResponse | null;
  customerName: string;
  onNext: () => void;
}) {
  const t = useTranslations('admin.manual');
  const tc = useTranslations('admin.common');
  const [lang, setLang] = useState<Locale>('en');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const move = useOrderTransition();
  const message = useErrorMessage();
  if (!result) return null;
  const url = `${window.location.origin}${result.trackingPath}`;
  const text = trackingMessage(lang, { name: customerName, number: result.order.number, url });
  const phone = result.order.customer.phone;
  return (
    <Sheet open onClose={onNext} title={t('created', { number: result.order.number })}>
      <div className="grid gap-4">
        <SegmentedToggle
          label={t('messageLanguage')}
          value={lang}
          onChange={setLang}
          options={[
            { value: 'en', label: tc('english') },
            { value: 'ur', label: tc('urdu') },
          ]}
        />
        <p
          dir={lang === 'ur' ? 'rtl' : 'ltr'}
          lang={lang}
          className="rounded-input border-2 border-dashed border-ink bg-paper p-3 text-sm"
        >
          {text}
        </p>
        {phone.startsWith('+92') && (
          <a
            href={waLink(phone, text)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'whatsapp', size: 'lg', block: true })}
          >
            <Icon name="chat" />
            {t('sendWhatsapp')}
          </a>
        )}
        <Button
          variant="ghost"
          size="lg"
          block
          onClick={() => void navigator.clipboard.writeText(url).then(() => toast(t('linkCopied')))}
        >
          <Icon name="copy" />
          {t('copyLink')}
        </Button>
        {result.order.status === 'placed' && !accepted && (
          <Button variant="secondary" size="lg" block onClick={() => setAccepting(true)}>
            {t('acceptNow')}
          </Button>
        )}
        {accepted && <p className="text-center font-bold">{t('acceptedNow')}</p>}
        <Button size="lg" block onClick={onNext}>
          {t('nextOrder')}
        </Button>
        <PrepSheet
          open={accepting}
          number={result.order.number}
          onClose={() => setAccepting(false)}
          onPick={(prepMinutes) => {
            setAccepting(false);
            move.mutate(
              { order: result.order, to: 'accepted', prepMinutes },
              { onSuccess: () => setAccepted(true), onError: (e) => toast(message(e)) },
            );
          }}
        />
      </div>
    </Sheet>
  );
}

/**
 * POS-style entry for WhatsApp / phone / walk-in / Foodpanda orders (ADDITION §A1). Same
 * create_order rules as the website; the live server quote is the only total shown.
 */
export function ManualOrder() {
  const t = useTranslations('admin.manual');
  const ts = useTranslations();
  const locale = useLocale();
  const message = useErrorMessage();
  useStaff('orders');
  const menu = useQuery({ queryKey: ['admin', 'menu'], queryFn: () => api.admin.menu() });

  // The idempotency key is created when the screen opens, reused on retries (§2.4).
  const [key, setKey] = useState(() => newIdempotencyKey());
  const [source, setSource] = useState<Source>('whatsapp');
  const [phone, setPhone] = useState<string | null>(null);
  const [nameInput, setName] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [fulfilment, setFulfilment] = useState<'delivery' | 'pickup'>('pickup');
  const [addressChoice, setAddressId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState(EMPTY_ADDRESS);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [when, setWhen] = useState<'asap' | 'later'>('asap');
  const [scheduled, setScheduled] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [configure, setConfigure] = useState<Item | null>(null);
  const [result, setResult] = useState<ManualOrderResponse | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const walkIn = source === 'walk_in';
  const effectiveFulfilment = walkIn ? 'pickup' : fulfilment;

  const lookup = useQuery({
    queryKey: ['admin', 'lookup', phone],
    queryFn: () => api.admin.customerLookup(phone!),
    enabled: !!phone,
    retry: false,
  });
  const known = lookup.data?.customer ?? null;
  const isNew = isApiError(lookup.error) && lookup.error.code === 'NOT_FOUND';
  // A returning customer pre-fills name and default address until staff change them.
  const name = nameInput ?? known?.name ?? '';
  const addressId =
    addressChoice ?? (known?.addresses.find((a) => a.isDefault) ?? known?.addresses[0])?.id ?? null;

  const savedAddress = known?.addresses.find((a) => a.id === addressId) ?? null;
  const location =
    effectiveFulfilment === 'delivery'
      ? (savedAddress?.location ?? (addressId === 'new' || !known?.addresses.length ? pin : null))
      : null;
  const scheduledFor =
    when === 'later' && scheduled ? new Date(`${scheduled}:00+05:00`).toISOString() : null;

  const debouncedPin = useDebounced(location);
  const zone = useQuery({
    queryKey: ['zone', debouncedPin],
    queryFn: () => api.deliveryQuote({ location: debouncedPin! }),
    enabled:
      effectiveFulfilment === 'delivery' && !!debouncedPin && addressId !== null && !savedAddress,
    retry: false,
  });

  const quote = useQuote(
    lines.length && (effectiveFulfilment === 'pickup' || location)
      ? {
          lines,
          fulfilment: effectiveFulfilment,
          addressId: null,
          location,
          promoCode: null,
          scheduledFor,
          tip: 0,
          phone,
        }
      : null,
  );

  const place = useMutation({
    mutationFn: () =>
      api.admin.manualOrder(
        {
          source,
          customer: { name: name.trim(), phone: phone! },
          lines,
          fulfilment: effectiveFulfilment,
          addressId: effectiveFulfilment === 'delivery' && savedAddress ? savedAddress.id : null,
          newAddress:
            effectiveFulfilment === 'delivery' && !savedAddress && pin
              ? { ...draft, location: pin }
              : null,
          paymentMethod: 'cod',
          promoCode: null,
          customerNote: note.trim() || null,
          scheduledFor,
        },
        key,
      ),
    onSuccess: (r) => {
      rememberMine(r.order.id);
      setResult(r);
    },
    onError: (e) => toast(message(e)),
  });

  const reset = () => {
    setResult(null);
    setKey(newIdempotencyKey());
    setPhone(null);
    setName(null);
    setLines([]);
    setAddressId(null);
    setDraft(EMPTY_ADDRESS);
    setPin(null);
    setWhen('asap');
    setScheduled('');
    setNote('');
    setSearch('');
  };

  // Keyboard: "/" focuses the item search from anywhere outside a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const m = menu.data;
  const categories = useMemo(() => (m ? activeCategories(m) : []), [m]);
  const hits = useMemo(
    () =>
      m && search.trim()
        ? m.items.filter((i) => i.isActive && matches(search, i.name.en, i.name.ur))
        : null,
    [m, search],
  );

  const add = (item: Item) => {
    if (!m) return;
    if (hasRequiredChoice(m, item)) return setConfigure(item);
    setLines((ls) =>
      addLine(ls, {
        itemId: item.id,
        variantId: defaultVariant(item).id,
        modifierIds: [],
        qty: 1,
        note: null,
      }),
    );
    toast(t('added', { name: localized(item.name, locale) }), 1200);
  };

  const q = quote.data;
  const codBlocked = known?.isBlocked || known?.codAllowed === false || (q && !q.cod.allowed);
  const deliveryReady = effectiveFulfilment === 'pickup' || !!location;
  const canPlace =
    !!phone &&
    name.trim().length > 0 &&
    lines.length > 0 &&
    deliveryReady &&
    !!q &&
    !quote.isFetching &&
    !quote.isError &&
    !codBlocked &&
    !(when === 'later' && !scheduledFor);

  const lineLabel = (l: CartLine) => {
    const item = m?.items.find((i) => i.id === l.itemId);
    if (!item) return l.itemId;
    const v = item.variants.find((x) => x.id === l.variantId);
    const mods = m!.modifierGroups
      .flatMap((g) => g.modifiers)
      .filter((x) => l.modifierIds.includes(x.id));
    return [
      localized(item.name, locale),
      v && v.name !== 'Standard' ? v.name : null,
      ...mods.map((x) => `+ ${localized(x.name, locale)}`),
    ]
      .filter(Boolean)
      .join(' · ');
  };

  return (
    <AdminPage
      title={t('title')}
      actions={
        <Link href="/admin/orders" className={buttonClasses({ variant: 'ghost', size: 'md' })}>
          {t('backToBoard')}
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* ---------- Menu grid ---------- */}
        <Panel className="min-w-0">
          <label className="mb-3 grid gap-1 text-sm font-bold">
            {t('search')}
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && hits?.[0] && isOrderable(hits[0])) {
                  e.preventDefault();
                  add(hits[0]);
                  setSearch('');
                }
              }}
              placeholder={t('searchHint')}
              aria-keyshortcuts="/"
              className="min-h-14 rounded-input border-3 border-ink px-3 text-base font-normal"
            />
          </label>
          {menu.isError && <ErrorState onRetry={() => void menu.refetch()} />}
          {menu.isLoading && <Skeleton className="h-96" />}
          {m && hits && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {hits.map((item) => (
                <ItemButton
                  key={item.id}
                  item={item}
                  onAdd={() => add(item)}
                  onConfigure={() => setConfigure(item)}
                />
              ))}
              {!hits.length && (
                <li className="col-span-full py-6 text-center text-muted">{t('noHits')}</li>
              )}
            </ul>
          )}
          {m && !hits && (
            <div className="grid max-h-[70dvh] gap-5 overflow-y-auto pe-1">
              {categories.map((c) => {
                const items = itemsIn(m, c.id);
                if (!items.length) return null;
                return (
                  <section key={c.id} aria-labelledby={`mc-${c.id}`}>
                    <h2 id={`mc-${c.id}`} className="mb-2 font-sticker text-lg font-black">
                      {localized(c.name, locale)}
                    </h2>
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {items.map((item) => (
                        <ItemButton
                          key={item.id}
                          item={item}
                          onAdd={() => add(item)}
                          onConfigure={() => setConfigure(item)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </Panel>

        {/* ---------- Ticket ---------- */}
        <form
          className="grid content-start gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canPlace) place.mutate();
          }}
        >
          <Panel className="grid gap-4">
            <fieldset>
              <legend className="mb-2 text-sm font-bold">{t('source')}</legend>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((s) => (
                  <label
                    key={s}
                    className={clsx(
                      'cursor-pointer rounded-full',
                      source === s && 'outline-3 outline-offset-2 outline-ink',
                    )}
                  >
                    <input
                      type="radio"
                      name="source"
                      className="sr-only"
                      checked={source === s}
                      onChange={() => setSource(s)}
                    />
                    <SourceTag source={s} className="min-h-11" />
                  </label>
                ))}
              </div>
            </fieldset>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              label={t('phone')}
              hint={t('phoneHint')}
              autoFocus
            />
            {lookup.isFetching && <p className="text-sm text-muted">{t('lookingUp')}</p>}
            {isNew && <p className="text-sm font-bold">{t('newCustomer')}</p>}
            {known && (
              <div className="grid gap-2 rounded-input border-2 border-ink bg-paper p-3 text-sm">
                <p className="font-bold">{t('returning', { count: known.orderCount })}</p>
                {(known.isBlocked || !known.codAllowed) && (
                  <p className="rounded-chip border-2 border-ink bg-orange p-2 font-bold">
                    {known.isBlocked
                      ? t('blocked', { reason: known.blockReason ?? '—' })
                      : t('codOff')}
                  </p>
                )}
                {lookup.data!.recentOrders[0] && (
                  <Button
                    variant="secondary"
                    size="md"
                    className="min-h-14"
                    onClick={() => setLines(repeatLines(lookup.data!.recentOrders[0]!))}
                  >
                    {t('repeatLast', { number: lookup.data!.recentOrders[0]!.number })}
                  </Button>
                )}
              </div>
            )}
            <Input
              label={t('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              autoComplete="off"
            />
          </Panel>

          <Panel>
            <h2 className="mb-2 font-sticker text-lg font-black">{t('items')}</h2>
            {lines.length ? (
              <ul className="grid gap-2" aria-live="polite">
                {lines.map((l, i) => (
                  <li
                    key={`${l.itemId}-${l.variantId}-${l.modifierIds.join()}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 text-sm font-bold">{lineLabel(l)}</span>
                    <Stepper
                      value={l.qty}
                      min={0}
                      max={50}
                      onChange={(n) => setLines((ls) => setQty(ls, i, n))}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('noItems')}</p>
            )}
          </Panel>

          <Panel className="grid gap-4">
            {!walkIn && (
              <SegmentedToggle
                label={ts('fulfilment.label')}
                value={fulfilment}
                onChange={setFulfilment}
                options={[
                  { value: 'pickup', label: ts('fulfilment.pickup') },
                  { value: 'delivery', label: ts('fulfilment.delivery') },
                ]}
              />
            )}
            {effectiveFulfilment === 'delivery' && (
              <>
                {!!known?.addresses.length && (
                  <RadioCards
                    legend={t('address')}
                    value={addressId}
                    onChange={setAddressId}
                    options={[
                      ...known.addresses.map((a) => ({
                        value: a.id,
                        label: `${a.line1}, ${a.area}`,
                        description: a.landmark ?? undefined,
                      })),
                      { value: 'new' as const, label: t('newAddress') },
                    ]}
                  />
                )}
                {(addressId === 'new' || !known?.addresses.length) && (
                  <div className="grid gap-3">
                    <Input
                      label={t('line1')}
                      value={draft.line1}
                      onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
                      required
                      minLength={3}
                    />
                    <Input
                      label={t('area')}
                      value={draft.area}
                      onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                    />
                    <Input
                      label={t('landmark')}
                      value={draft.landmark ?? ''}
                      onChange={(e) => setDraft({ ...draft, landmark: e.target.value || null })}
                    />
                    <MapPinPicker
                      value={pin}
                      onChange={(p) => {
                        setPin(p);
                        if (addressId === null) setAddressId('new');
                      }}
                      message={
                        zone.data
                          ? t('zone', {
                              name: zone.data.zoneName,
                              fee: formatAmount(zone.data.fee),
                              eta: zone.data.etaMinutes,
                            })
                          : zone.error
                            ? message(zone.error)
                            : undefined
                      }
                    />
                  </div>
                )}
              </>
            )}
            <SegmentedToggle
              label={t('when')}
              value={when}
              onChange={setWhen}
              options={[
                { value: 'asap', label: t('asap') },
                { value: 'later', label: t('later') },
              ]}
            />
            {when === 'later' && (
              <Input
                type="datetime-local"
                label={t('scheduledFor')}
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
                required
              />
            )}
            <RadioCards
              legend={t('payment')}
              value="cod"
              onChange={() => {}}
              options={[{ value: 'cod', label: t('cash'), description: t('cashHint') }]}
            />
            <TextArea
              label={t('note')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
            />
          </Panel>

          <Panel className="grid gap-2" aria-live="polite">
            {quote.isError ? (
              <p className="font-bold">{message(quote.error)}</p>
            ) : q ? (
              <>
                <p className="flex justify-between text-sm">
                  <span>{t('subtotal')}</span>
                  <Money value={q.subtotal} className="text-lg" />
                </p>
                {q.deliveryFee > 0 && (
                  <p className="flex justify-between text-sm">
                    <span>{t('deliveryFee')}</span>
                    <Money value={q.deliveryFee} className="text-lg" />
                  </p>
                )}
                <p className="flex items-end justify-between">
                  <span className="font-bold">{t('total')}</span>
                  <Money
                    value={q.total}
                    className={clsx('text-4xl', quote.isFetching && 'opacity-50')}
                  />
                </p>
                {!q.cod.allowed && (
                  <p className="text-sm font-bold">
                    {message({ code: 'COD_NOT_ALLOWED', details: { reason: q.cod.reason } })}
                  </p>
                )}
                <p className="text-xs text-muted">{t('serverTotal')}</p>
              </>
            ) : (
              <p className="text-sm text-muted">{t('quoteHint')}</p>
            )}
            <Button type="submit" size="lg" block disabled={!canPlace} loading={place.isPending}>
              {t('place')}
            </Button>
          </Panel>
        </form>
      </div>

      {m && configure && (
        <ConfigureSheet
          key={configure.id}
          menu={m}
          item={configure}
          onClose={() => setConfigure(null)}
          onAdd={(l) => setLines((ls) => addLine(ls, l))}
        />
      )}
      <SuccessSheet result={result} customerName={name} onNext={reset} />
    </AdminPage>
  );
}
