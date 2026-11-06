'use client';

import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Countdown } from '@/components/ui/Countdown';
import { Sheet } from '@/components/ui/Dialog';
import { Checkbox, Input, RadioCards, TextArea, type RadioCardOption } from '@/components/ui/form';
import { MapPinPicker } from '@/components/ui/MapPinPicker';
import { Odometer } from '@/components/ui/Odometer';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { useOtpFlow } from '@/features/auth/useOtpFlow';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { useDebounced, useQuote } from '@/features/cart/useQuote';
import { buildPlaceOrderBody } from '@/features/checkout/buildPlaceOrderBody';
import { useDeliveryQuote } from '@/features/checkout/useDeliveryQuote';
import { usePlaceOrder } from '@/features/checkout/usePlaceOrder';
import { useAddresses, useMe } from '@/features/checkout/useProfile';
import {
  categoryOf,
  defaultVariant,
  findItemById,
  hasRequiredChoice,
  isOrderable,
  itemImage,
} from '@/features/menu/helpers';
import { refetchMenu, useMenu } from '@/features/menu/useMenu';
import { codAllowedFor, localDate, preorderSlots } from '@/features/store/hours';
import { orderingMode, STORE_STATUS_KEY, useStoreStatus } from '@/features/store/useStore';
import { track } from '@/lib/analytics';
import { isApiError, type ApiError } from '@/lib/api';
import {
  CustomerDetails,
  type ErrorCode,
  type GeoPoint,
  type Menu,
  type PaymentMethod,
  type QuoteRequest,
  type StoreStatus,
} from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { ALLOW_ONLINE_PAYMENTS } from '@/lib/flags';
import { formatAmount } from '@/lib/format';
import { formatPkPhone } from '@/lib/phone';
import { SITE } from '@/lib/site';
import { toCartLines, useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';
import { BelowMin, QuotePanel } from './QuotePanel';
import {
  Notice,
  OtpPanel,
  OutsideZoneCard,
  PickupCard,
  PromoField,
  SlotPicker,
  StepCard,
} from './parts';
import { Turnstile } from './Turnstile';

type Field = 'name' | 'phone' | 'pin' | 'line1' | 'area' | 'otp' | 'slot' | 'payment';
type FieldErrors = Partial<Record<Field, string>>;

const DAY_MS = 86_400_000;
const PROMO_CODES: ErrorCode[] = ['PROMO_INVALID', 'PROMO_EXPIRED', 'PROMO_LIMIT'];
/** Codes shown inside a specific step (or a sheet). Everything else shows by the Place button. */
const STEP_CODES = new Set<ErrorCode>([
  'OUTSIDE_ZONE',
  'ADDRESS_NOT_FOUND',
  'STORE_CLOSED',
  'PREORDER_INVALID',
  'COD_NOT_ALLOWED',
  'BELOW_MIN_ORDER',
  'ITEM_SOLD_OUT',
  'DUPLICATE_ORDER_SUSPECTED',
  'IDEMPOTENCY_CONFLICT',
  ...PROMO_CODES,
]);

const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

const onHydrated = (cb: () => void) => useCart.persist.onFinishHydration(cb);
const onOnline = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

interface CheckoutScreenProps {
  initialStore?: StoreStatus;
  initialMenu?: Menu;
  /** ?schedule=1: open with Schedule selected. */
  schedule?: boolean;
  /** ?payment=cod: preselect cash on delivery. */
  payCod?: boolean;
}

/**
 * /checkout: one screen, five numbered steps (Contact · Delivery · When · Payment · Review).
 * The server quote is the only total shown; the request sends intent only (buildPlaceOrderBody).
 */
export function CheckoutScreen({
  initialStore,
  initialMenu,
  schedule,
  payCod,
}: CheckoutScreenProps) {
  const t = useTranslations('checkout');
  const tr = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const qc = useQueryClient();
  const message = useErrorMessage();
  // The idempotency key is created here, once, when the checkout screen mounts (§2.4).
  const place = usePlaceOrder();
  const otp = useOtpFlow();
  const addToCart = useAddToCart();
  const setCartOpen = useUi((s) => s.setCartOpen);
  const hydrated = useSyncExternalStore(
    onHydrated,
    () => useCart.persist.hasHydrated(),
    () => false,
  );
  const online = useSyncExternalStore(
    onOnline,
    () => navigator.onLine,
    () => true,
  );

  const lines = useCart((s) => s.lines);
  const fulfilment = useCart((s) => s.fulfilment);
  const promoCode = useCart((s) => s.promoCode);
  const soldOutIds = useCart((s) => s.soldOutItemIds);
  const storeQ = useStoreStatus(initialStore);
  const store = storeQ.data;
  const menu = useMenu(initialMenu).data;
  const me = useMe().data ?? null;
  const addresses = useAddresses(me !== null).data ?? [];
  // Slots and the COD window follow the clock; refreshed each minute (no render-time Date.now()).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  /* ---------- Form state (drafts fall back to the profile until edited) ---------- */
  const [nameDraft, setName] = useState<string | null>(null);
  const [phoneDraft, setPhone] = useState<string | null | undefined>(undefined);
  const name = nameDraft ?? me?.name ?? '';
  const phone = phoneDraft === undefined ? (me?.phone ?? null) : phoneDraft;
  const [whatsapp, setWhatsapp] = useState(false);
  const [note, setNote] = useState('');

  const [choiceDraft, setChoice] = useState<string | null>(null);
  const [pin, setPin] = useState<GeoPoint | null>(null);
  // A pin already dropped wins: addresses loading after OTP verify must not switch it away.
  const fallbackChoice = pin
    ? 'new'
    : ((addresses.find((a) => a.isDefault) ?? addresses[0])?.id ?? 'new');
  const choice =
    choiceDraft !== null && (choiceDraft === 'new' || addresses.some((a) => a.id === choiceDraft))
      ? choiceDraft
      : fallbackChoice;
  const [line1, setLine1] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const delivery = fulfilment === 'delivery';
  const addressId = delivery && choice !== 'new' ? choice : null;
  const location = delivery && choice === 'new' ? pin : null;

  const mode = orderingMode(store);
  const canSchedule = !!store?.allowPreorders;
  const days = useMemo(
    () =>
      store?.allowPreorders
        ? preorderSlots({ hours: store.openingHours, now, maxDays: store.preorderMaxDays })
        : [],
    [store, now],
  );
  const [whenDraft, setWhen] = useState<'asap' | 'schedule'>(schedule ? 'schedule' : 'asap');
  const when = mode === 'preorder' ? 'schedule' : canSchedule ? whenDraft : 'asap';
  const [slotDraft, setSlot] = useState<string | null>(null);
  const slot =
    slotDraft && days.some((d) => d.slots.includes(slotDraft))
      ? slotDraft
      : (days[0]?.slots[0] ?? null);
  const scheduledFor = when === 'schedule' ? slot : null;
  const codMaxHours = store?.preorderCodMaxHours ?? 2;

  const [payDraft, setPay] = useState<PaymentMethod | null>(
    payCod || !ALLOW_ONLINE_PAYMENTS ? 'cod' : null,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [rateUntil, setRateUntil] = useState<number | null>(null);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  // Same-tick double taps: block before React re-renders with isPending (one order_placed event).
  const sending = useRef(false);

  /* ---------- Server quote: re-fetched on every relevant change ---------- */
  const quoteReq = useMemo<QuoteRequest | null>(() => {
    if (!lines.length || (delivery && !addressId && !location)) return null;
    return {
      lines: toCartLines(lines),
      fulfilment,
      addressId,
      location,
      promoCode,
      scheduledFor,
      tip: 0,
      phone,
    };
  }, [lines, delivery, fulfilment, addressId, location, promoCode, scheduledFor, phone]);
  const quote = useQuote(quoteReq);
  // useQuote debounces: until the debounced request catches up, the shown quote is stale.
  const quoteSettled = useDebounced(quoteReq) === quoteReq;
  const quoting = quoteReq !== null && (quote.isFetching || !quoteSettled);
  const dq = useDeliveryQuote(location);

  /* ---------- Errors: quote, delivery quote and place order ---------- */
  const placeErr = isApiError(place.error) ? place.error : null;
  const quoteErr = quoteReq && isApiError(quote.error) ? quote.error : null;
  const dqErr = location && isApiError(dq.error) ? dq.error : null;
  const q = quoteReq && !quoteErr ? (quote.data ?? null) : null;
  const errs = [placeErr, quoteErr, dqErr].filter((e): e is ApiError => e !== null);
  const find = (...codes: ErrorCode[]) => errs.find((e) => codes.includes(e.code)) ?? null;

  const soldOutErr = find('ITEM_SOLD_OUT');
  const soldOutItem = str(soldOutErr?.details?.itemId);
  useEffect(() => {
    if (!soldOutItem) return;
    void refetchMenu(qc);
    const c = useCart.getState();
    if (!c.soldOutItemIds.includes(soldOutItem)) c.markSoldOut([...c.soldOutItemIds, soldOutItem]);
  }, [soldOutItem, qc]);

  const closedErr = find('STORE_CLOSED');
  useEffect(() => {
    if (closedErr) void qc.invalidateQueries({ queryKey: STORE_STATUS_KEY });
  }, [closedErr, qc]);

  const started = useRef(false);
  useEffect(() => {
    if (!hydrated || started.current || !lines.length) return;
    started.current = true;
    track('checkout_started', { lines: lines.length, fulfilment });
  }, [hydrated, lines.length, fulfilment]);

  const quickAdds = useMemo(
    () =>
      !menu
        ? []
        : menu.items
            .filter(
              (i) =>
                i.isActive &&
                isOrderable(i) &&
                !hasRequiredChoice(menu, i) &&
                !lines.some((l) => l.itemId === i.id),
            )
            .map((item) => ({ item, price: defaultVariant(item).price }))
            .sort((a, b) => a.price - b.price)
            .slice(0, 3),
    [menu, lines],
  );

  /* ---------- COD, OTP ---------- */
  const codPlaceErr = placeErr?.code === 'COD_NOT_ALLOWED' ? placeErr : null;
  const codReason: unknown = !codAllowedFor(scheduledFor, now, codMaxHours)
    ? 'preorder_too_far'
    : q && !q.cod.allowed
      ? (q.cod.reason ?? 'unknown')
      : codPlaceErr
        ? (codPlaceErr.details?.reason ?? 'unknown')
        : null;
  const payment = payDraft === 'cod' && codReason ? null : payDraft;
  const soonerSlot = days.flatMap((d) => d.slots).find((s) => codAllowedFor(s, now, codMaxHours));

  const otpRequired =
    placeErr?.code === 'UNAUTHENTICATED' && placeErr.details?.reason === 'otp_required';
  const otpVerified = !!phone && otp.verified?.phone === phone;
  const needOtp = payment === 'cod' && !!phone && !otpVerified && (!!q?.requiresOtp || otpRequired);
  const otpErrObj = otp.verify.error ?? otp.request.error;
  const otpError =
    otpErrObj && !(isApiError(otpErrObj) && otpErrObj.code === 'RATE_LIMITED')
      ? message(otpErrObj)
      : null;

  /* ---------- Editing clears a stale place-order error and that field's error ---------- */
  const clearPlaceError = () => {
    if (place.isError) place.reset();
  };
  const edited = (k?: Field) => {
    clearPlaceError();
    if (k && errors[k]) setErrors(({ [k]: _drop, ...rest }) => rest);
  };
  const setFulfilment = (f: 'delivery' | 'pickup') => {
    clearPlaceError();
    useCart.getState().setFulfilment(f);
  };

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!CustomerDetails.shape.name.safeParse(name).success) e.name = t('contact.nameError');
    if (!CustomerDetails.shape.phone.safeParse(phone).success) e.phone = t('contact.phoneError');
    if (needOtp) e.otp = t('otp.required');
    if (delivery && choice === 'new') {
      if (!pin) e.pin = t('delivery.pinError');
      if (line1.trim().length < 3) e.line1 = t('delivery.line1Error');
      if (!area.trim()) e.area = t('delivery.areaError');
    }
    if (when === 'schedule' && !slot) e.slot = t('when.pick');
    if (!payment) e.payment = t('payment.pick');
    return e;
  }

  const submit = (confirmDuplicate = false) => {
    if (sending.current || place.isPending || place.isSuccess || rateUntil !== null) return;
    if (place.conflicted) return setConflictDismissed(false);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]')
          ?.focus(),
      );
      return;
    }
    if (!q || quoting || !payment || !phone) return;
    sending.current = true;
    place.mutate(
      buildPlaceOrderBody({
        lines,
        fulfilment,
        addressId,
        newAddress: location && { location, line1, area, landmark },
        paymentMethod: payment,
        promoCode,
        scheduledFor,
        note,
        name,
        phone,
        whatsappOptIn: whatsapp,
        confirmDuplicate,
      }),
      {
        onSettled: () => {
          sending.current = false;
        },
        onSuccess: ({ order }) => {
          if (order.paymentMethod === 'cod') {
            useCart.getState().clear();
            router.replace(`/order/${order.publicToken}?placed=1`);
          } else
            router.replace(
              `/pay/redirect?token=${order.publicToken}&provider=${order.paymentMethod}`,
            );
        },
        onError: (err) => {
          if (isApiError(err) && err.code === 'RATE_LIMITED')
            setRateUntil(
              Date.now() + (err.retryAfter ?? (num(err.details?.retryAfter) || 30)) * 1000,
            );
        },
      },
    );
  };

  /* ---------- Whole-screen states ---------- */
  const frame = (children: ReactNode) => (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-40 md:pt-10 lg:pb-16">
      <StickerHeading as="h1" align="start" size="md" tilt={-2}>
        {t('title')}
      </StickerHeading>
      <div className="mt-8">{children}</div>
    </div>
  );
  const fmtTime = (iso: string) =>
    format.dateTime(new Date(iso), {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: SITE.timezone,
    });

  if (place.isSuccess)
    return frame(
      <Notice tone="info" title={t('place.placing')}>
        {t('place.placingBody')}
      </Notice>,
    );
  if (!store && storeQ.isError)
    return frame(<ErrorState offline={!online} onRetry={() => void storeQ.refetch()} />);
  if (!hydrated || !store)
    return frame(
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]" aria-busy="true">
        <span className="sr-only">{tr('common.loading')}</span>
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>,
    );
  if (!lines.length)
    return frame(
      <div className="rounded-panel border-3 border-ink bg-white shadow-hard-lg">
        <EmptyState
          title={t('empty.title')}
          body={t('empty.body')}
          action={
            <Link href="/menu" className={buttonClasses({ size: 'lg' })}>
              {t('empty.cta')}
            </Link>
          }
        />
      </div>,
    );
  if (mode === 'closed')
    return frame(
      <div className="rounded-panel border-3 border-ink bg-white shadow-hard-lg">
        <EmptyState
          title={t('closed.title')}
          body={
            <>
              {store.state === 'paused' && store.pauseReason
                ? t('closed.paused', { reason: store.pauseReason })
                : store.opensAt
                  ? t('closed.opensAt', { time: fmtTime(store.opensAt) })
                  : t('closed.noTime')}{' '}
              {t('closed.body')}
            </>
          }
          action={
            <Link href="/menu" className={buttonClasses({ size: 'lg', variant: 'secondary' })}>
              {t('closed.cta')}
            </Link>
          }
        />
      </div>,
    );

  /* ---------- Derived UI ---------- */
  const busy = place.isPending;
  const blocked = quoteReq !== null && (!q || quoting);
  const placeDisabled = busy || rateUntil !== null || blocked;
  const placeHint = busy
    ? null
    : quoting
      ? t('place.waitQuote')
      : quoteErr
        ? t('place.fixFirst')
        : Object.keys(errors).length
          ? t('place.fixFields')
          : null;
  const generalErr =
    placeErr &&
    !STEP_CODES.has(placeErr.code) &&
    !(placeErr.code === 'UNAUTHENTICATED' && otpRequired)
      ? placeErr
      : null;
  const quoteGeneral = quoteErr && !STEP_CODES.has(quoteErr.code) ? quoteErr : null;
  const belowMin = find('BELOW_MIN_ORDER');
  const promoErr = find(...PROMO_CODES);
  const outsideZone = find('OUTSIDE_ZONE');
  const addrErr = find('ADDRESS_NOT_FOUND');
  const preErr = find('PREORDER_INVALID');

  const problem: ReactNode = belowMin ? (
    <BelowMin
      shortBy={num(belowMin.details?.shortBy)}
      minOrder={num(belowMin.details?.minOrder)}
      items={quickAdds}
      onAdd={(item, el) => {
        clearPlaceError();
        if (menu)
          addToCart({
            item,
            variant: defaultVariant(item),
            image: itemImage(menu, item),
            from: el,
            source: 'menu',
          });
      }}
    />
  ) : soldOutErr ? (
    <Notice>{message(soldOutErr)}</Notice>
  ) : quoteGeneral ? (
    <ErrorState
      className="py-4"
      offline={quoteGeneral.code === 'NETWORK_ERROR' || !online}
      body={quoteGeneral.code === 'NETWORK_ERROR' ? undefined : message(quoteGeneral)}
      onRetry={() => void quote.refetch()}
    />
  ) : quoteErr ? (
    <Notice tone="info">{t('place.fixFirst')}</Notice>
  ) : !quoteReq && delivery ? (
    <Notice tone="info">{t('summary.pinFirst')}</Notice>
  ) : null;

  const replaceHref = (itemId: string) => {
    const item = menu && findItemById(menu, itemId);
    const cat = menu && item ? categoryOf(menu, item) : null;
    const top = cat?.parentId ? menu?.categories.find((c) => c.id === cat.parentId) : cat;
    return top ? `/menu#${top.slug}` : '/menu';
  };

  const payOptions: RadioCardOption<PaymentMethod>[] = [
    {
      value: 'cod',
      label: delivery ? t('payment.cod') : t('payment.codPickup'),
      description: codReason
        ? message({ code: 'COD_NOT_ALLOWED', details: { reason: codReason } })
        : t('payment.codHint'),
      disabled: !!codReason,
    },
    ...(ALLOW_ONLINE_PAYMENTS
      ? (['jazzcash', 'easypaisa'] as const).map((p) => ({
          value: p,
          label: t(`payment.${p}`),
          description: t('payment.onlineHint'),
        }))
      : []),
  ];

  const zoneMsg = dq.isFetching
    ? t('delivery.checking')
    : dq.data && !dqErr
      ? t('delivery.zone', {
          zone: dq.data.zoneName,
          fee: tr('price.rs', { amount: formatAmount(dq.data.fee) }),
          minutes: dq.data.etaMinutes,
        })
      : undefined;

  const placeLabel = busy ? t('place.placing') : t('place.cta');
  const invalid = (k: Field) => (errors[k] ? '' : undefined);

  return (
    <>
      {frame(
        <>
          {!online && (
            <Notice title={t('offline.title')} className="mb-6">
              {t('offline.body')}
            </Notice>
          )}
          <div
            ref={formRef}
            inert={busy}
            aria-busy={busy || undefined}
            className={clsx(
              'grid gap-6 transition-opacity lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start',
              busy && 'opacity-60',
            )}
          >
            <div className="space-y-6">
              {/* 1 · Contact */}
              <StepCard n={1} title={t('steps.contact')}>
                <Input
                  label={t('contact.name')}
                  placeholder={t('contact.namePlaceholder')}
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  error={errors.name}
                  onChange={(e) => {
                    edited('name');
                    setName(e.target.value);
                  }}
                />
                <PhoneInput
                  value={phone}
                  error={errors.phone}
                  onChange={(v) => {
                    edited('phone');
                    setPhone(v);
                  }}
                />
                {phone && payment === 'cod' && (needOtp || otpVerified) && (
                  <div tabIndex={-1} data-invalid={invalid('otp')}>
                    <OtpPanel
                      phone={formatPkPhone(phone)}
                      sent={otp.sentTo === phone}
                      verified={otpVerified}
                      sending={otp.request.isPending}
                      verifying={otp.verify.isPending}
                      resendIn={otp.resendIn}
                      lockedFor={otp.lockedFor}
                      error={otpError ?? errors.otp ?? null}
                      onSend={() => {
                        otp.verify.reset();
                        otp.request.mutate({ phone });
                      }}
                      onVerify={(code) =>
                        otp.verify.mutate(code, {
                          onSuccess: () => {
                            edited('otp');
                            void qc.invalidateQueries({ queryKey: ['quote'] });
                          },
                        })
                      }
                    />
                  </div>
                )}
                <Checkbox
                  label={t('contact.whatsapp')}
                  hint={t('contact.whatsappHint')}
                  checked={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.checked)}
                />
              </StepCard>

              {/* 2 · Delivery / Pickup */}
              <StepCard n={2} title={delivery ? t('steps.delivery') : t('steps.pickup')}>
                <SegmentedToggle
                  label={tr('fulfilment.label')}
                  value={fulfilment}
                  onChange={setFulfilment}
                  options={[
                    { value: 'delivery', label: tr('fulfilment.delivery') },
                    { value: 'pickup', label: tr('fulfilment.pickup') },
                  ]}
                />
                {delivery ? (
                  <>
                    {addresses.length > 0 && (
                      <RadioCards
                        legend={t('delivery.saved')}
                        value={choice}
                        onChange={(v) => {
                          edited();
                          setChoice(v);
                        }}
                        options={[
                          ...addresses.map((a) => ({
                            value: a.id,
                            label: a.label || a.line1,
                            description: [a.line1, a.area, a.landmark].filter(Boolean).join(' · '),
                          })),
                          {
                            value: 'new',
                            label: t('delivery.newAddress'),
                            description: t('delivery.newAddressHint'),
                          },
                        ]}
                      />
                    )}
                    {addressId && q?.zone && (
                      <p className="text-sm font-medium">
                        {t('delivery.zone', {
                          zone: q.zone.name,
                          fee: tr('price.rs', { amount: formatAmount(q.deliveryFee) }),
                          minutes: q.etaMinutes,
                        })}
                      </p>
                    )}
                    {choice === 'new' && (
                      <>
                        <div tabIndex={-1} data-invalid={invalid('pin')}>
                          <MapPinPicker
                            value={pin}
                            onChange={(p) => {
                              edited('pin');
                              setPin(p);
                            }}
                            message={zoneMsg}
                          />
                          {errors.pin && (
                            <p className="mt-2 text-sm font-medium" role="alert">
                              {errors.pin}
                            </p>
                          )}
                        </div>
                        <Input
                          label={t('delivery.line1')}
                          placeholder={t('delivery.line1Placeholder')}
                          autoComplete="address-line1"
                          maxLength={200}
                          value={line1}
                          error={errors.line1}
                          onChange={(e) => {
                            edited('line1');
                            setLine1(e.target.value);
                          }}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input
                            label={t('delivery.area')}
                            placeholder={t('delivery.areaPlaceholder')}
                            maxLength={100}
                            value={area}
                            error={errors.area}
                            onChange={(e) => {
                              edited('area');
                              setArea(e.target.value);
                            }}
                          />
                          <Input
                            label={t('delivery.landmark')}
                            placeholder={t('delivery.landmarkPlaceholder')}
                            hint={t('delivery.landmarkHint')}
                            maxLength={200}
                            value={landmark}
                            onChange={(e) => {
                              edited();
                              setLandmark(e.target.value);
                            }}
                          />
                        </div>
                      </>
                    )}
                    {outsideZone && <OutsideZoneCard onPickup={() => setFulfilment('pickup')} />}
                    {addrErr && (
                      <Notice
                        action={
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              edited();
                              setChoice('new');
                              void qc.invalidateQueries({ queryKey: ['me', 'addresses'] });
                            }}
                          >
                            {t('delivery.pickAgain')}
                          </Button>
                        }
                      >
                        {message(addrErr)}
                      </Notice>
                    )}
                  </>
                ) : (
                  <PickupCard
                    etaMinutes={q?.etaMinutes ?? null}
                    phone={store.shopPhone || SITE.phone}
                  />
                )}
              </StepCard>

              {/* 3 · When */}
              <StepCard n={3} title={t('steps.when')}>
                {mode === 'preorder' ? (
                  <Notice tone="info">
                    {store.state === 'paused' ? t('when.forcedPaused') : t('when.forced')}
                  </Notice>
                ) : canSchedule ? (
                  <RadioCards
                    legend={t('when.label')}
                    value={when}
                    onChange={(v) => {
                      edited('slot');
                      setWhen(v);
                    }}
                    options={[
                      { value: 'asap', label: t('when.asap'), description: t('when.asapHint') },
                      {
                        value: 'schedule',
                        label: t('when.schedule'),
                        description: t('when.scheduleHint'),
                      },
                    ]}
                  />
                ) : (
                  <p className="font-bold">{t('when.asap')}</p>
                )}
                {when === 'schedule' &&
                  (days.length ? (
                    <div tabIndex={-1} data-invalid={invalid('slot')}>
                      <SlotPicker
                        days={days}
                        value={slot}
                        today={localDate(now)}
                        tomorrow={localDate(now + DAY_MS)}
                        onChange={(s) => {
                          edited('slot');
                          setSlot(s);
                        }}
                      />
                      {errors.slot && <p className="mt-2 text-sm font-medium">{errors.slot}</p>}
                    </div>
                  ) : (
                    <Notice>{t('when.none', { days: store.preorderMaxDays })}</Notice>
                  ))}
                {preErr && <Notice>{message(preErr)}</Notice>}
                {closedErr && (
                  <Notice
                    action={
                      canSchedule &&
                      when !== 'schedule' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            edited();
                            setWhen('schedule');
                          }}
                        >
                          {t('when.scheduleInstead')}
                        </Button>
                      )
                    }
                  >
                    {message(closedErr)}
                  </Notice>
                )}
              </StepCard>

              {/* 4 · Payment */}
              <StepCard n={4} title={t('steps.payment')}>
                <div tabIndex={-1} data-invalid={invalid('payment')}>
                  <RadioCards
                    legend={t('payment.label')}
                    value={payment}
                    onChange={(v) => {
                      edited('payment');
                      setPay(v);
                    }}
                    options={payOptions}
                    error={errors.payment}
                  />
                </div>
                {codReason !== null &&
                  ((codReason === 'over_cap' && delivery) ||
                    (codReason === 'preorder_too_far' && soonerSlot)) && (
                    <div className="flex flex-wrap gap-2">
                      {codReason === 'over_cap' && delivery && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setFulfilment('pickup')}
                        >
                          {t('delivery.switchToPickup')}
                        </Button>
                      )}
                      {codReason === 'preorder_too_far' && soonerSlot && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            edited('slot');
                            setSlot(soonerSlot);
                          }}
                        >
                          {t('payment.sooner')}
                        </Button>
                      )}
                    </div>
                  )}
              </StepCard>
            </div>

            {/* 5 · Review (sticky side summary on desktop) */}
            {/* Capped to the viewport so the Place button stays reachable on long carts. */}
            <aside className="lg:sticky lg:top-24 lg:-m-2 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:p-2">
              <StepCard n={5} title={t('steps.review')}>
                <QuotePanel
                  lines={lines}
                  quote={q}
                  fetching={quoting}
                  fulfilment={fulfilment}
                  soldOutIds={soldOutIds}
                  replaceHref={replaceHref}
                  onRemove={(key) => {
                    edited();
                    useCart.getState().remove(key);
                  }}
                  onEditCart={() => setCartOpen(true)}
                  problem={problem}
                >
                  <PromoField
                    applied={promoCode}
                    discount={q?.promo?.discount ?? null}
                    error={promoErr ? message(promoErr) : null}
                    onApply={(code) => {
                      edited();
                      useCart.getState().setPromoCode(code);
                    }}
                    onRemove={() => {
                      edited();
                      useCart.getState().setPromoCode(null);
                    }}
                  />
                  <TextArea
                    label={t('notes.label')}
                    optionalLabel={tr('common.optional')}
                    placeholder={t('notes.placeholder')}
                    hint={t('notes.count', { count: note.length })}
                    maxLength={300}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Turnstile />
                  {generalErr && (
                    <Notice
                      title={generalErr.code === 'NETWORK_ERROR' ? t('offline.title') : undefined}
                      action={
                        generalErr.code !== 'RATE_LIMITED' && (
                          <Button size="sm" variant="secondary" onClick={() => submit()}>
                            {tr('common.retry')}
                          </Button>
                        )
                      }
                    >
                      {generalErr.code === 'NETWORK_ERROR'
                        ? t('offline.body')
                        : message(generalErr)}
                    </Notice>
                  )}
                  {rateUntil !== null && (
                    <p role="status" className="font-medium">
                      {t('place.retryIn')}{' '}
                      <Countdown
                        to={new Date(rateUntil)}
                        onExpire={() => setRateUntil(null)}
                        className="text-xl"
                      />
                    </p>
                  )}
                  <div className="hidden space-y-2 lg:block">
                    <Button
                      size="lg"
                      block
                      loading={busy}
                      disabled={placeDisabled}
                      onClick={() => submit()}
                    >
                      {placeLabel}
                    </Button>
                    {placeHint && <p className="text-center text-sm text-muted">{placeHint}</p>}
                  </div>
                </QuotePanel>
              </StepCard>
            </aside>
          </div>
        </>,
      )}

      {/* Mobile: sticky total + Place order (covers the shell's MobileCartBar) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-3 border-ink bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-muted uppercase">{t('summary.total')}</p>
            {q ? (
              <Odometer value={q.total} className={clsx('text-3xl', quoting && 'opacity-60')} />
            ) : (
              <Skeleton className="mt-1 h-7 w-24" />
            )}
          </div>
          <Button
            loading={busy}
            disabled={placeDisabled}
            onClick={() => submit()}
            className="shrink-0"
          >
            {placeLabel}
          </Button>
        </div>
        {placeHint && <p className="mt-1 text-xs text-muted">{placeHint}</p>}
      </div>

      {/* Locked loading state: the form above is inert until the order lands */}
      <div aria-live="assertive" className="sr-only">
        {busy ? t('place.placing') : ''}
      </div>
      {busy && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4">
          <div className="flex animate-pop items-center gap-3 rounded-button border-3 border-ink bg-ink px-5 py-3 text-white shadow-hard-orange">
            <span
              aria-hidden="true"
              className="size-5 animate-spin rounded-full border-3 border-yellow border-e-transparent"
            />
            <span>
              <span className="block font-display text-xl">{t('place.placing')}</span>
              <span className="block text-sm">{t('place.placingBody')}</span>
            </span>
          </div>
        </div>
      )}

      {/* IDEMPOTENCY_CONFLICT: a new key only after the customer confirms */}
      <Sheet
        open={place.conflicted && !conflictDismissed}
        onClose={() => setConflictDismissed(true)}
        title={t('conflict.title')}
        footer={
          <Button
            block
            onClick={() => {
              place.confirmNewSession();
              setConflictDismissed(false);
            }}
          >
            {t('conflict.confirm')}
          </Button>
        }
      >
        <p>{t('conflict.body')}</p>
      </Sheet>

      {/* DUPLICATE_ORDER_SUSPECTED: same cart + phone within 3 minutes (§6) */}
      <Sheet
        open={placeErr?.code === 'DUPLICATE_ORDER_SUSPECTED'}
        onClose={() => place.reset()}
        title={t('duplicate.title')}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button block onClick={() => submit(true)}>
              {t('duplicate.again')}
            </Button>
            {str(placeErr?.details?.existingToken) && (
              <Link
                href={`/track/${str(placeErr?.details?.existingToken)}`}
                className={buttonClasses({ variant: 'ghost', block: true })}
              >
                {t('duplicate.view')}
              </Link>
            )}
          </div>
        }
      >
        <p>{t('duplicate.body')}</p>
      </Sheet>
    </>
  );
}
