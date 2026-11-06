/**
 * In-memory mock backend that follows the backend rules (§4.1–4.3, §6, §7). Persisted to
 * localStorage so reloads and other tabs (customer + kitchen side by side) share it.
 * Progression is time-based (`tick`), so it catches up after a reload.
 */
import * as C from '@/lib/contracts';
import { computeTotals, effectiveMinOrder, lineTotal, promoDiscount, shortBy } from '@/lib/money';
import { FILLET_FURY_ID, menuFixture } from './fixtures/menu';
import {
  holidaysFixture,
  hoursFixture,
  promosFixture,
  reviewsFixture,
  staffFixture,
  storeSettingsFixture,
  zonesFixture,
  type StaffRec,
} from './fixtures/store';
import { is, scenarioElapsed } from './scenario';

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class MockError extends Error {
  constructor(
    readonly code: C.ErrorCode,
    message?: string,
    readonly details?: Record<string, unknown>,
    readonly headers?: Record<string, string>,
  ) {
    super(message ?? code);
  }
}
export const fail = (
  code: C.ErrorCode,
  message?: string,
  details?: Record<string, unknown>,
  headers?: Record<string, string>,
): never => {
  throw new MockError(code, message, details, headers);
};

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export const MOCK_OTP = '123456';

export interface CustomerRec extends C.Customer {
  isBlocked: boolean;
  blockReason: string | null;
  failedCodCount: number;
  anonymizedAt: string | null;
  addresses: C.Address[];
}

export interface PaymentRec {
  provider: C.OnlineProvider;
  status: C.PaymentState;
  outcome: 'success' | 'fail' | 'stuck' | 'expire' | 'late_success';
  startedAt: number;
  expiresAt: number;
}

export interface AssignmentRec {
  riderId: string;
  assignedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cashInHand: number;
  settled: boolean;
}

export interface OrderRec {
  order: C.AdminOrder;
  customerId: string;
  autoAdvance: boolean;
  lastChangeAt: number;
  cartHash: string;
  payment: PaymentRec | null;
  assignment: AssignmentRec | null;
  /** Scenario hook: reject this order at this time (order_rejected / auto_rejected). */
  rejectAt: number | null;
  versionConflictServed: boolean;
}

interface IdemRec {
  hash: string;
  state: 'processing' | 'done';
  status?: number;
  body?: unknown;
}

export interface BookingRec extends C.Booking {
  resolveAt: number | null;
}

interface State {
  menu: C.Menu;
  settings: C.StoreSettings;
  hours: C.OpeningHours[];
  holidays: C.Holiday[];
  zones: C.DeliveryZone[];
  promos: C.Promo[];
  redemptions: { promoId: string; customerId: string; orderId: string }[];
  staff: StaffRec[];
  refunds: C.Refund[];
  reviews: C.Review[];
  outbox: C.OutboxItem[];
  deals: C.Deal[];
  events: C.Event[];
  bookings: BookingRec[];
  customers: CustomerRec[];
  orders: OrderRec[];
  nextOrderNumber: number;
  session: {
    customerId: string | null;
    staffId: string | null;
    staffPending: 'verify_2fa' | 'enrol_2fa' | null;
  };
  otps: Record<string, { code: string; expiresAt: number; sentAt: number[] }>;
  bookingAttempts: Record<string, number[]>;
  idem: Record<string, IdemRec>;
  /** in_progress scenario: IN_PROGRESS answers served per key. */
  inProgressServed: Record<string, number>;
  stats: { ordersCreated: number; replays: number; inProgress: number };
  soldOutTriggered: boolean;
  liveSoldOutDone: boolean;
  lastInjectedAt: number;
}

const STORAGE_KEY = 'bp-mock-db-v3';
const clone = <T>(v: T): T => structuredClone(v);
export const now = () => new Date().toISOString();

function fresh(): State {
  return {
    menu: clone(menuFixture),
    settings: clone(storeSettingsFixture),
    hours: clone(hoursFixture),
    holidays: clone(holidaysFixture),
    zones: clone(zonesFixture),
    promos: clone(promosFixture),
    redemptions: [],
    staff: clone(staffFixture),
    refunds: [],
    reviews: clone(reviewsFixture),
    outbox: [
      {
        id: 'obx_seed',
        topic: 'whatsapp.order_placed',
        dedupKey: 'order:BP-1041:placed',
        status: 'dead',
        attempts: 6,
        nextAttemptAt: null,
        lastError: 'Template not approved (mock)',
        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
      },
    ],
    deals: [],
    events: [],
    bookings: [],
    customers: [],
    orders: [],
    nextOrderNumber: 1042,
    session: { customerId: null, staffId: null, staffPending: null },
    otps: {},
    bookingAttempts: {},
    idem: {},
    inProgressServed: {},
    stats: { ordersCreated: 0, replays: 0, inProgress: 0 },
    soldOutTriggered: false,
    liveSoldOutDone: false,
    lastInjectedAt: 0,
  };
}

function load(): State {
  if (typeof window === 'undefined') return fresh();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...fresh(), ...(JSON.parse(raw) as Partial<State>) } : fresh();
  } catch {
    return fresh();
  }
}

export let db: State = load();

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {}
}

export function resetDb() {
  db = fresh();
  save();
}

/** Leaving the sold-out scenarios puts Fillet Fury back on sale. */
export function restoreSoldOut() {
  const item = db.menu.items.find((i) => i.id === FILLET_FURY_ID);
  if (item) item.isSoldOut = false;
  db.soldOutTriggered = false;
  db.liveSoldOutDone = false;
  save();
}

/* ------------------------------------------------------------------ */
/* Change feeds (SSE handlers subscribe)                                */
/* ------------------------------------------------------------------ */

type Listener<T> = (v: T) => void;
function feed<T>() {
  const ls = new Set<Listener<T>>();
  return {
    on: (l: Listener<T>) => (ls.add(l), () => void ls.delete(l)),
    emit: (v: T) => ls.forEach((l) => l(v)),
  };
}
export const orderFeed = feed<{ rec: OrderRec; kind: 'created' | 'updated' }>();
export const soldOutFeed = feed<C.SoldOutEvent>();
export const bookingFeed = feed<C.Booking>();

// Another tab changed the mock DB: reload and re-emit what changed.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const before = new Map(db.orders.map((r) => [r.order.publicToken, r.order.version]));
    db = load();
    for (const rec of db.orders) {
      const v = before.get(rec.order.publicToken);
      if (v === undefined) orderFeed.emit({ rec, kind: 'created' });
      else if (v !== rec.order.version) orderFeed.emit({ rec, kind: 'updated' });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Deterministic JSON (sorted keys) for request hashes and cart hashes. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(v);
}

export function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export const maskPhone = (p: string) => `${p.slice(0, 3)} ${p.slice(3, 4)}•• •••${p.slice(-4)}`;

/** Ray-casting point-in-polygon on [lng, lat] rings. */
export function inPolygon({ lat, lng }: C.GeoPoint, ring: C.LngLat[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** resolve_zone: covers → priority desc → smallest area (§4.1). */
export function resolveZone(point: C.GeoPoint) {
  if (is('outside_zone')) return fail('OUTSIDE_ZONE', 'That pin is outside our delivery area.');
  const area = (z: C.DeliveryZone) => {
    const xs = z.polygon.map((p) => p[0]);
    const ys = z.polygon.map((p) => p[1]);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  };
  const zone = db.zones
    .filter((z) => z.isActive && inPolygon(point, z.polygon))
    .sort((a, b) => b.priority - a.priority || area(a) - area(b))[0];
  return zone ?? fail('OUTSIDE_ZONE', 'That pin is outside our delivery area.');
}

export const currentCustomer = () =>
  db.customers.find((c) => c.id === db.session.customerId) ?? null;
export const requireCustomer = () =>
  currentCustomer() ??
  fail('UNAUTHENTICATED', 'Please verify your phone number.', { reason: 'session' });
export const customerByPhone = (phone: string) =>
  db.customers.find((c) => c.phone === phone) ?? null;

export function upsertCustomer(phone: string, name: string | null): CustomerRec {
  const existing = customerByPhone(phone);
  if (existing) {
    if (name && !existing.name) existing.name = name;
    return existing;
  }
  const c: CustomerRec = {
    id: `cus_${randomToken().slice(0, 12)}`,
    phone,
    name,
    phoneVerifiedAt: null,
    preferredLang: 'en',
    whatsappOptIn: false,
    whatsappOptInAt: null,
    whatsappOptInSource: null,
    codAllowed: true,
    createdAt: now(),
    isBlocked: false,
    blockReason: null,
    failedCodCount: 0,
    anonymizedAt: null,
    addresses: [],
  };
  db.customers.push(c);
  return c;
}

/** whatsapp_opt_in + whatsapp_opt_in_at + whatsapp_opt_in_source, always together (§5.4, §7). */
export function setOptIn(c: CustomerRec, on: boolean, source: C.OptInSource | null) {
  c.whatsappOptIn = on;
  c.whatsappOptInAt = on ? now() : null;
  c.whatsappOptInSource = on ? source : null;
}

export function requireStaff(roles?: C.StaffRole[]) {
  const staff = db.session.staffPending
    ? null
    : db.staff.find((s) => s.id === db.session.staffId && s.isActive);
  if (!staff) return fail('UNAUTHENTICATED', 'Staff login required.', { reason: 'session' });
  if (roles && !roles.includes(staff.role)) return fail('FORBIDDEN', 'Your role cannot do that.');
  return staff;
}

export const publicStaff = ({ password: _password, ...s }: StaffRec): C.Staff => s;

/** Outbox rows are written with the data change; `dedup_key` is unique (§4.5). */
export function addOutbox(topic: string, dedupKey: string) {
  if (db.outbox.some((o) => o.dedupKey === dedupKey)) return;
  db.outbox.unshift({
    id: `obx_${randomToken().slice(0, 10)}`,
    topic,
    dedupKey,
    status: 'sent',
    attempts: 1,
    nextAttemptAt: null,
    lastError: null,
    createdAt: now(),
  });
}

/* ------------------------------------------------------------------ */
/* Store status (is_store_open)                                         */
/* ------------------------------------------------------------------ */

const PKT = 5 * 3_600_000; // Asia/Karachi, UTC+5, no DST
export const localToday = () => new Date(Date.now() + PKT).toISOString().slice(0, 10);

/** Next opening from opening_hours, skipping holidays. */
function nextOpening(from = Date.now()): string | null {
  for (let d = 0; d < 9; d++) {
    const local = new Date(from + PKT + d * 86_400_000);
    if (db.holidays.some((h) => h.date === local.toISOString().slice(0, 10))) continue;
    for (const h of db.hours.filter((x) => x.weekday === local.getUTCDay())) {
      const [hh = 0, mm = 0] = h.opens.split(':').map(Number);
      const opens =
        Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hh, mm) - PKT;
      if (opens > from) return new Date(opens).toISOString();
    }
  }
  return null;
}

const storeMin = () => (is('below_min') ? 5000 : db.settings.minOrderValue);
const codCap = () => (is('cod_not_allowed') ? 300 : db.settings.maxCodValue);

export function storeStatus(): C.StoreStatus {
  // ponytail: the happy path is always open so dev works at any hour; store_closed forces closed.
  const paused = is('paused') || !db.settings.isAcceptingOrders;
  const closed = is('store_closed');
  const opensAt = closed ? nextOpening() : null;
  const soon = opensAt !== null && new Date(opensAt).getTime() - Date.now() < 60 * 60_000;
  return {
    state: paused ? 'paused' : closed ? (soon ? 'opening_soon' : 'closed') : 'open',
    isAcceptingOrders: !paused && !closed,
    pauseReason: is('paused')
      ? 'Kitchen is catching up, back in 20 minutes (mock)'
      : db.settings.pauseReason,
    opensAt,
    closesAt: null,
    allowPreorders: db.settings.allowPreorders,
    minOrderValue: storeMin(),
    shopPhone: db.settings.shopPhone,
    openingHours: db.hours,
    preorderMaxDays: db.settings.preorderMaxDays,
    preorderCodMaxHours: db.settings.preorderCodMaxHours,
    holidays: db.holidays
      .filter((h) => h.date >= localToday())
      .sort((a, b) => a.date.localeCompare(b.date)),
    checkedAt: now(),
  };
}

/* ------------------------------------------------------------------ */
/* Pricing (mirrors create_order, §4.1)                                 */
/* ------------------------------------------------------------------ */

export interface PriceInput {
  lines: C.CartLine[];
  fulfilment: C.Fulfilment;
  location: C.GeoPoint | null;
  promoCode: string | null;
  scheduledFor: string | null;
  tip: number;
}

export type PricedCart = Omit<C.Quote, 'requiresOtp' | 'cod'>;

function checkOpenOrPreorder(scheduledFor: string | null) {
  if (scheduledFor) {
    const at = new Date(scheduledFor).getTime();
    const tooFar = at > Date.now() + db.settings.preorderMaxDays * 86_400_000;
    if (is('preorder_invalid') || !db.settings.allowPreorders || at <= Date.now() || tooFar)
      fail('PREORDER_INVALID', 'Pick a time in the next 7 days while we are open.');
    return;
  }
  const s = storeStatus();
  if (!s.isAcceptingOrders)
    fail('STORE_CLOSED', s.pauseReason ?? 'We are closed right now.', { opensAt: s.opensAt });
}

export function priceCart(input: PriceInput, customer: CustomerRec | null): PricedCart {
  checkOpenOrPreorder(input.scheduledFor);

  const lines: C.QuotedLine[] = input.lines.map((line) => {
    const item = db.menu.items.find((i) => i.id === line.itemId && i.isActive);
    if (!item) return fail('VALIDATION_FAILED', 'Unknown item', { itemId: line.itemId });
    if (item.isSoldOut)
      return fail('ITEM_SOLD_OUT', `${item.name.en} just sold out.`, { itemId: item.id });
    const variant = item.variants.find((v) => v.id === line.variantId);
    if (!variant?.isAvailable)
      return fail('ITEM_SOLD_OUT', `${item.name.en} is unavailable.`, { itemId: item.id });

    const groups = db.menu.modifierGroups.filter((g) => item.modifierGroupIds.includes(g.id));
    const modifiers = line.modifierIds.map((id) => {
      const mod = groups.flatMap((g) => g.modifiers).find((m) => m.id === id);
      if (!mod?.isAvailable) return fail('VALIDATION_FAILED', 'Unknown add-on', { modifierId: id });
      return { id: mod.id, name: mod.name, price: mod.price };
    });
    for (const g of groups) {
      const n = g.modifiers.filter((m) => line.modifierIds.includes(m.id)).length;
      if (n < g.minSelect || n > g.maxSelect)
        fail('VALIDATION_FAILED', `Choose ${g.minSelect}–${g.maxSelect} for ${g.name.en}`, {
          groupId: g.id,
          itemId: item.id,
        });
    }
    const unitPrice = variant.price + modifiers.reduce((s, m) => s + m.price, 0);
    return {
      itemId: item.id,
      variantId: variant.id,
      name: item.name,
      variantName: variant.name,
      size: variant.size,
      option: variant.option,
      modifiers,
      unitPrice,
      qty: line.qty,
      lineTotal: lineTotal(unitPrice, line.qty),
      note: line.note,
    };
  });

  // item_sold_out_mid_checkout: the first quote with Fillet Fury succeeds, then it sells out.
  if (
    is('item_sold_out_mid_checkout') &&
    !db.soldOutTriggered &&
    lines.some((l) => l.itemId === FILLET_FURY_ID)
  ) {
    db.soldOutTriggered = true;
    setSoldOut(FILLET_FURY_ID, true);
  }

  const zone =
    input.fulfilment === 'delivery' && input.location ? resolveZone(input.location) : null;
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const minOrder = effectiveMinOrder(storeMin(), zone?.minOrder ?? null);
  if (subtotal < minOrder)
    fail('BELOW_MIN_ORDER', `Minimum order is Rs ${minOrder}.`, {
      minOrder,
      shortBy: shortBy(subtotal, minOrder),
    });

  const deliveryFee = input.fulfilment === 'pickup' ? 0 : (zone?.fee ?? 0);
  let discount = 0;
  let promo: C.Quote['promo'] = null;
  if (input.promoCode) {
    const p =
      db.promos.find((x) => x.code === input.promoCode && x.isActive) ??
      fail('PROMO_INVALID', 'That code is not valid.');
    if (p.validUntil && new Date(p.validUntil).getTime() < Date.now())
      fail('PROMO_EXPIRED', 'That code has expired.');
    if (p.validFrom && new Date(p.validFrom).getTime() > Date.now())
      fail('PROMO_INVALID', 'That code is not active yet.');
    if (p.maxUses !== null && p.usedCount >= p.maxUses)
      fail('PROMO_LIMIT', 'That code has been fully used.');
    const mine = customer
      ? db.redemptions.filter((r) => r.promoId === p.id && r.customerId === customer.id).length
      : 0;
    if (mine >= p.maxUsesPerCustomer) fail('PROMO_LIMIT', 'You have already used this code.');
    if (subtotal < p.minOrder)
      fail('PROMO_INVALID', `Spend Rs ${p.minOrder} to use this code.`, { minOrder: p.minOrder });
    discount = promoDiscount(p.kind, p.value, subtotal, deliveryFee);
    promo = { code: p.code, discount };
  }

  return {
    ...computeTotals({ subtotal, deliveryFee, discount, tax: 0, tip: input.tip }),
    lines,
    minOrder,
    etaMinutes: 20 + (zone?.etaMinutes ?? 0),
    zone: zone ? { id: zone.id, name: zone.name } : null,
    promo,
    cartHash: hash(stableStringify(input.lines)),
    quotedAt: now(),
  };
}

/** COD rules (§4.1, §7): blocked, over the cap, or a pre-order more than 2 h out. */
export function codCheck(
  customer: CustomerRec | null,
  total: number,
  scheduledFor: string | null,
): C.Quote['cod'] {
  if (customer && (customer.isBlocked || !customer.codAllowed))
    return { allowed: false, reason: 'blocked' };
  if (total > codCap()) return { allowed: false, reason: 'over_cap' };
  if (
    scheduledFor &&
    new Date(scheduledFor).getTime() - Date.now() > db.settings.preorderCodMaxHours * 3_600_000
  )
    return { allowed: false, reason: 'preorder_too_far' };
  return { allowed: true, reason: null };
}

/** OTP on the first COD order from an unverified phone (§7). */
export function requiresOtp(customer: CustomerRec | null) {
  const sessionMatches = customer !== null && db.session.customerId === customer.id;
  if (is('requires_otp')) return !sessionMatches;
  return !customer?.phoneVerifiedAt && !sessionMatches;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function toCustomerOrder(rec: OrderRec): C.Order {
  const {
    id: _i,
    version: _v,
    customer: _c,
    rider: _r,
    acceptedAt: _a,
    readyAt: _rd,
    completedAt: _cm,
    cashCollectedAt: _cc,
    cancelReason: _cr,
    releasedAt,
    rider,
    events,
    ...rest
  } = rec.order;
  const riderStaff =
    rider && rec.order.status === 'out_for_delivery'
      ? db.staff.find((s) => s.id === rider.id)
      : undefined;
  const review = db.reviews.find((r) => r.orderNumber === rec.order.number);
  return {
    ...rest,
    events: events.map(({ status, at, note }) => ({ status, at, note })),
    rider: riderStaff
      ? { name: riderStaff.name, phone: riderStaff.phone ?? db.settings.shopPhone }
      : null,
    releasesAt:
      preorderReleaseAt(rec) !== null && !releasedAt
        ? new Date(preorderReleaseAt(rec)!).toISOString()
        : null,
    review: review ? { rating: review.rating, comment: review.comment } : null,
  };
}

/** Pre-orders reach the kitchen `preorder_release_minutes` before their time (§9). */
export function preorderReleaseAt(rec: OrderRec): number | null {
  if (!rec.order.scheduledFor) return null;
  return new Date(rec.order.scheduledFor).getTime() - db.settings.preorderReleaseMinutes * 60_000;
}

/** Staff view; the rider sees the full phone only on their active order (§7). */
export function toAdminOrder(
  rec: OrderRec,
  viewer?: { id: string; role: C.StaffRole },
): C.AdminOrder {
  const c = db.customers.find((x) => x.id === rec.customerId);
  const riderActive =
    viewer?.role === 'rider' &&
    rec.assignment?.riderId === viewer.id &&
    rec.order.status === 'out_for_delivery';
  const phone = c && riderActive && !c.anonymizedAt ? c.phone : rec.order.customer.phone;
  return { ...rec.order, customer: { ...rec.order.customer, phone } };
}

export function setSoldOut(itemId: string, isSoldOut: boolean, soldOutUntil: string | null = null) {
  const item = db.menu.items.find((i) => i.id === itemId);
  if (!item) return;
  item.isSoldOut = isSoldOut;
  item.soldOutUntil = isSoldOut ? soldOutUntil : null;
  db.menu.updatedAt = now();
  save();
  soldOutFeed.emit({ itemId, isSoldOut, soldOutUntil: item.soldOutUntil });
}

/** transition_order: idempotent on the current status; bumps version; event; broadcast (§4.2). */
export function transition(
  rec: OrderRec,
  to: C.OrderStatus,
  actorType: C.ActorType,
  actorName: string | null,
  note: string | null = null,
) {
  const o = rec.order;
  if (o.status === to) return;
  const at = now();
  o.status = to;
  o.version += 1;
  o.canCancel = to === 'placed';
  o.events.push({ status: to, at, note, actorType, actorName });
  if (to === 'accepted') o.acceptedAt = at;
  if (to === 'ready') o.readyAt = at;
  // Mock timer: nobody assigned a rider from the admin board, so the first rider takes it.
  if (to === 'out_for_delivery' && !o.rider) {
    const rider = db.staff.find((s) => s.role === 'rider' && s.isActive);
    if (rider) o.rider = { id: rider.id, name: rider.name };
  }
  if (to === 'delivered' || to === 'picked_up') {
    o.completedAt = at;
    if (o.paymentMethod === 'cod') {
      o.paymentStatus = 'paid';
      o.cashCollectedAt = at;
    }
  }
  rec.lastChangeAt = Date.now();
  save();
  orderFeed.emit({ rec, kind: 'updated' });
}

// Auto-progression through the §4.2 state machine, ~8 s per step.
const STEP = 8000;
const FLOW: Record<C.Fulfilment, Partial<Record<C.OrderStatus, C.OrderStatus>>> = {
  delivery: {
    placed: 'accepted',
    accepted: 'preparing',
    preparing: 'ready',
    ready: 'out_for_delivery',
    out_for_delivery: 'delivered',
  },
  pickup: { placed: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'picked_up' },
};

function advancePayment(rec: OrderRec) {
  const p = rec.payment;
  if (!p) return;
  const elapsed = Date.now() - p.startedAt;
  const markPaid = () => {
    p.status = 'paid';
    rec.order.paymentStatus = 'paid';
    rec.autoAdvance = true;
    transition(rec, 'placed', 'payment', p.provider, 'Payment confirmed via inquiry API');
  };
  if (p.status === 'pending') {
    if (p.outcome === 'success' && elapsed > 4000) markPaid();
    else if (p.outcome === 'fail' && elapsed > 4000) {
      p.status = 'failed';
      rec.order.paymentStatus = 'failed';
      transition(rec, 'payment_failed', 'payment', p.provider);
    } else if (Date.now() > p.expiresAt) {
      p.status = 'failed';
      rec.order.paymentStatus = 'failed';
      transition(rec, 'expired', 'system', 'reconciler', 'Payment not confirmed in time');
    }
  } else if (p.outcome === 'late_success' && rec.order.status === 'expired' && elapsed > 16_000) {
    // §4.3 step 8: late success after expiry → back to placed if the items are still available.
    const available = rec.order.lines.every(
      (l) => !db.menu.items.find((i) => i.id === l.itemId)?.isSoldOut,
    );
    if (available) markPaid();
  }
}

/** Advance timers. Called on every request and once a second by the worker bootstrap. */
export function tick() {
  for (const rec of db.orders) {
    advancePayment(rec);
    if (rec.rejectAt && rec.order.status === 'placed' && Date.now() >= rec.rejectAt) {
      const auto = is('auto_rejected');
      rec.autoAdvance = false;
      rec.rejectAt = null;
      transition(
        rec,
        'rejected',
        auto ? 'system' : 'staff',
        auto ? 'auto-reject job' : 'Kitchen (mock)',
        auto
          ? 'Auto-rejected: not accepted within 8 minutes'
          : 'Kitchen is too busy right now (mock)',
      );
      continue;
    }
    if (!rec.autoAdvance || rec.rejectAt) continue;
    // §9: pre-orders wait until their release time, then the normal flow starts.
    const releaseAt = preorderReleaseAt(rec);
    if (releaseAt !== null && !rec.order.releasedAt) {
      if (Date.now() < releaseAt) continue;
      rec.order.releasedAt = now();
      rec.lastChangeAt = Date.now();
      save();
    }
    for (
      let next = FLOW[rec.order.fulfilment][rec.order.status];
      next;
      next = FLOW[rec.order.fulfilment][rec.order.status]
    ) {
      if (Date.now() - rec.lastChangeAt < STEP) break;
      transition(rec, next, 'system', 'mock timer');
    }
  }
  for (const b of db.bookings) {
    if (b.status === 'requested' && b.resolveAt && Date.now() >= b.resolveAt) {
      if (is('booking_declined'))
        applyBookingAction(b, { action: 'decline', reason: 'Fully booked that evening (mock)' });
      else applyBookingAction(b, { action: 'confirm' });
    }
  }
  if (is('live_sold_out') && !db.liveSoldOutDone && scenarioElapsed() > 8000) {
    db.liveSoldOutDone = true;
    setSoldOut(FILLET_FURY_ID, true);
  }
  if (is('mixed_sources') && Date.now() - db.lastInjectedAt > 12_000) injectMixedOrder();
}

export interface NewOrderInput {
  lines: C.CartLine[];
  fulfilment: C.Fulfilment;
  paymentMethod: C.PaymentMethod;
  scheduledFor: string | null;
  customerNote: string | null;
  whatsappOptIn: boolean;
  source: C.OrderSource;
}

export function newOrder(
  input: NewOrderInput,
  quote: PricedCart,
  customer: CustomerRec,
  address: C.Address | null,
): OrderRec {
  const at = now();
  const online = input.paymentMethod !== 'cod';
  const status: C.OrderStatus = online ? 'pending_payment' : 'placed';
  const prior = db.orders.filter((o) => o.customerId === customer.id).length;
  const rejectDelay = is('order_rejected') ? 8000 : is('auto_rejected') ? 12_000 : null;
  const rec: OrderRec = {
    customerId: customer.id,
    autoAdvance: !online,
    lastChangeAt: Date.now(),
    cartHash: quote.cartHash,
    payment: null,
    assignment: null,
    rejectAt: status === 'placed' && rejectDelay ? Date.now() + rejectDelay : null,
    versionConflictServed: false,
    order: {
      id: `ord_${randomToken().slice(0, 12)}`,
      publicToken: randomToken(),
      number: `BP-${db.nextOrderNumber++}`,
      status,
      source: input.source,
      fulfilment: input.fulfilment,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'unpaid',
      lines: quote.lines,
      subtotal: quote.subtotal,
      deliveryFee: quote.deliveryFee,
      discount: quote.discount,
      tax: quote.tax,
      tip: quote.tip,
      total: quote.total,
      address: address
        ? {
            label: address.label,
            line1: address.line1,
            area: address.area,
            landmark: address.landmark,
            location: address.location,
            recipientName: customer.name,
            recipientPhone: customer.phone,
          }
        : null,
      customerNote: input.customerNote,
      scheduledFor: input.scheduledFor,
      estimatedReadyAt: new Date(Date.now() + 20 * 60_000).toISOString(),
      estimatedDeliveryAt:
        input.fulfilment === 'delivery'
          ? new Date(Date.now() + quote.etaMinutes * 60_000).toISOString()
          : null,
      canCancel: status === 'placed',
      createdAt: at,
      events: [
        {
          status,
          at,
          note: null,
          actorType: input.source === 'website' ? 'customer' : 'staff',
          actorName: customer.name,
        },
      ],
      version: 0,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: maskPhone(customer.phone),
        orderCount: prior + 1,
      },
      rider: null,
      acceptedAt: null,
      readyAt: null,
      completedAt: null,
      cashCollectedAt: null,
      cancelReason: null,
      releasedAt: null,
    },
  };
  if (quote.promo) {
    const p = db.promos.find((x) => x.code === quote.promo!.code);
    if (p) {
      p.usedCount += 1;
      db.redemptions.push({ promoId: p.id, customerId: customer.id, orderId: rec.order.id });
    }
  }
  // Consent is recorded with time and source (§5.4); a manual order never opts in (§A1.3).
  if (input.whatsappOptIn && !customer.whatsappOptIn) setOptIn(customer, true, 'checkout');
  db.orders.unshift(rec);
  db.stats.ordersCreated += 1;
  addOutbox('kitchen.new_order', `order:${rec.order.number}:kitchen`);
  if (customer.whatsappOptIn)
    addOutbox('whatsapp.order_placed', `order:${rec.order.number}:placed`);
  save();
  orderFeed.emit({ rec, kind: 'created' });
  return rec;
}

export const findOrderByToken = (token: string) =>
  db.orders.find((r) => r.order.publicToken === token) ?? fail('NOT_FOUND', 'Order not found.');
export const findOrderById = (id: string) =>
  db.orders.find((r) => r.order.id === id) ?? fail('NOT_FOUND', 'Order not found.');

const SOURCE_NAME: Record<C.OrderSource, string> = {
  website: 'Web',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
  walk_in: 'Walk-in',
  foodpanda: 'Foodpanda',
};

/** mixed_sources: a new order from a rotating source every ~12 s. */
function injectMixedOrder() {
  db.lastInjectedAt = Date.now();
  const sources: C.OrderSource[] = ['whatsapp', 'phone', 'website', 'walk_in'];
  const n = db.orders.length;
  const source = sources[n % sources.length]!;
  const pick = db.menu.items.filter((i) => !i.isSoldOut && i.basePrice >= 450);
  const item = pick[n % pick.length]!;
  const lines: C.CartLine[] = [
    { itemId: item.id, variantId: item.variants[0]!.id, modifierIds: [], qty: 2, note: null },
  ];
  const customer = upsertCustomer(
    `+92300${String(1_000_000 + n).slice(-7)}`,
    `${SOURCE_NAME[source]} customer (mock)`,
  );
  try {
    const priced = priceCart(
      { lines, fulfilment: 'pickup', location: null, promoCode: null, scheduledFor: null, tip: 0 },
      customer,
    );
    newOrder(
      {
        lines,
        fulfilment: 'pickup',
        paymentMethod: 'cod',
        scheduledFor: null,
        customerNote: null,
        whatsappOptIn: false,
        source,
      },
      priced,
      customer,
      null,
    );
  } catch {
    /* store closed etc.: skip this round */
  }
}

/* ------------------------------------------------------------------ */
/* Deals, events, bookings (ADDITION)                                   */
/* ------------------------------------------------------------------ */

export function eventsWithSpots(events: C.Event[]): C.Event[] {
  return events.map((e) => {
    if (e.capacity === null) return { ...e, spotsLeft: null };
    if (is('event_full')) return { ...e, spotsLeft: 0 };
    const taken = db.bookings
      .filter((b) => b.eventId === e.id && (b.status === 'requested' || b.status === 'confirmed'))
      .reduce((s, b) => s + b.guests, 0);
    return { ...e, spotsLeft: Math.max(0, e.capacity - taken) };
  });
}

export const toBooking = ({ resolveAt: _r, ...b }: BookingRec): C.Booking => b;

const ACTION_STATUS: Record<C.BookingAction['action'], C.BookingStatus> = {
  confirm: 'confirmed',
  decline: 'declined',
  complete: 'completed',
  no_show: 'no_show',
  cancel: 'cancelled',
};

export function applyBookingAction(b: BookingRec, a: C.BookingAction) {
  const to = ACTION_STATUS[a.action];
  if (b.status === to) return;
  if (!C.BOOKING_TRANSITIONS[b.status].includes(to))
    fail('INVALID_TRANSITION', `Cannot move a ${b.status} booking to ${to}.`);
  b.status = to;
  b.resolveAt = null;
  if (a.action === 'decline') b.declineReason = a.reason;
  // Customer gets a WhatsApp/SMS confirmation via the outbox.
  if (to === 'confirmed' || to === 'declined')
    addOutbox(`whatsapp.booking_${to}`, `booking:${b.publicToken}:${to}`);
  save();
  bookingFeed.emit(toBooking(b));
}

/** Plug point for the deals_demo scenario (handlers swap in the DEMO set). */
type DealsEventsSource = () => { deals: C.Deal[]; events: C.Event[] } | null;
let dealsEventsOverride: DealsEventsSource | null = null;
export const setDealsEventsOverride = (fn: DealsEventsSource) => {
  dealsEventsOverride = fn;
};

export function publicDealsEvents(): C.DealsEvents {
  const t = Date.now();
  const live = (from: string | null, until: string | null) =>
    (!from || new Date(from).getTime() <= t) && (!until || new Date(until).getTime() >= t);
  const src = dealsEventsOverride?.() ?? { deals: db.deals, events: db.events };
  return {
    deals: src.deals
      .filter((d) => d.isActive && live(d.validFrom, d.validUntil))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    events: eventsWithSpots(
      src.events.filter((e) => e.isActive && new Date(e.endsAt).getTime() >= t),
    ).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  };
}

export function createBooking(input: Omit<C.BookingRequest, 'turnstileToken'>): C.Booking {
  if (input.date < localToday())
    fail('VALIDATION_FAILED', 'Pick today or a later date.', { field: 'date' });
  if (db.holidays.some((h) => h.date === input.date))
    fail('VALIDATION_FAILED', 'We are closed that day.', { field: 'date' });
  if (input.type !== 'event' && !withinHours(input.date, input.time))
    fail('VALIDATION_FAILED', 'Pick a time while we are open.', { field: 'time' });
  if (input.type === 'event') {
    const event = publicDealsEvents().events.find((e) => e.id === input.eventId);
    if (!event?.bookable) return fail('NOT_FOUND', 'That event is not open for booking.');
    if (event.spotsLeft !== null && event.spotsLeft < input.guests)
      fail('EVENT_FULL', 'That event is full.', { spotsLeft: event.spotsLeft });
  }
  const auto = is('booking_confirmed') || is('booking_declined');
  const b: BookingRec = {
    ...input,
    publicToken: randomToken(),
    status: 'requested',
    declineReason: null,
    createdAt: now(),
    resolveAt: auto ? Date.now() + 10_000 : null,
  };
  db.bookings.unshift(b);
  addOutbox('whatsapp.booking_received', `booking:${b.publicToken}:requested`);
  save();
  return toBooking(b);
}

/** Is local `date` + `time` inside an opening window (past-midnight windows belong to the day they open)? */
function withinHours(date: string, time: string) {
  const mins = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const t = mins(time);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return db.hours.some((h) => {
    if (h.weekday !== weekday) return false;
    const open = mins(h.opens);
    const close = mins(h.closes) <= open ? mins(h.closes) + 1440 : mins(h.closes);
    return (t >= open && t < close) || (t + 1440 >= open && t + 1440 < close);
  });
}

export const findBooking = (token: string) =>
  db.bookings.find((b) => b.publicToken === token) ?? fail('NOT_FOUND', 'Booking not found.');

/* ------------------------------------------------------------------ */
/* Idempotency (§4.1 steps 2–8)                                         */
/* ------------------------------------------------------------------ */

/**
 * lookup → 409 while processing → 422 on hash mismatch → replay when done → claim and run.
 * The request hash excludes `turnstileToken`.
 */
export async function idempotent(
  key: string | null,
  body: unknown,
  run: () => Promise<{ status: number; body: unknown }>,
): Promise<{ status: number; body: unknown }> {
  if (!key) return fail('VALIDATION_FAILED', 'Idempotency-Key header is required.');
  const { turnstileToken: _t, ...hashed } = (body ?? {}) as Record<string, unknown>;
  const h = hash(stableStringify(hashed));
  const existing = db.idem[key];
  if (existing) {
    if (existing.hash !== h)
      fail('IDEMPOTENCY_CONFLICT', 'This request key was already used with a different body.');
    if (existing.state === 'processing') {
      db.stats.inProgress += 1;
      fail('IN_PROGRESS', 'Still working on it.', { retryAfter: 2 }, { 'Retry-After': '2' });
    }
    db.stats.replays += 1;
    save();
    return { status: existing.status!, body: existing.body };
  }
  db.idem[key] = { hash: h, state: 'processing' };
  try {
    const result = await run();
    db.idem[key] = { hash: h, state: 'done', ...result };
    save();
    return result;
  } catch (e) {
    delete db.idem[key]; // failed → may be retried with the same key
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* account_demo: a returning customer (history, reorder review, addresses) */
/* ------------------------------------------------------------------ */

// Each order clears the Rs 500 minimum.
const DEMO_LINES: C.CartLine[][] = [
  [
    {
      itemId: FILLET_FURY_ID,
      variantId: `${FILLET_FURY_ID}__std`,
      modifierIds: [],
      qty: 2,
      note: null,
    },
  ],
  [
    {
      itemId: 'itm_crunch-kick',
      variantId: 'itm_crunch-kick__std',
      modifierIds: [],
      qty: 2,
      note: null,
    },
    {
      itemId: 'itm_masala-fries',
      variantId: 'itm_masala-fries__regular',
      modifierIds: [],
      qty: 1,
      note: null,
    },
  ],
  [
    {
      itemId: 'itm_hot-wings',
      variantId: 'itm_hot-wings__std',
      modifierIds: [],
      qty: 2,
      note: null,
    },
  ],
];

/**
 * Seeds 12 past orders (2 pages) and 2 addresses the first time a customer logs in under
 * `account_demo`. Order 1 has Fillet Fury (sold out in this scenario), order 2 was cheaper
 * back then (price changed), order 3 has an item that left the menu (inactive).
 */
export function seedAccountDemo(c: CustomerRec) {
  if (db.orders.some((o) => o.customerId === c.id)) return;
  c.name ??= 'Demo Customer';
  if (!c.addresses.length)
    c.addresses.push(
      {
        id: 'adr_demo_home',
        label: 'home',
        line1: 'House 12, Street 4',
        area: 'Paradise City',
        landmark: 'Opposite the mosque',
        location: { lat: 31.27, lng: 72.318 },
        isDefault: true,
      },
      {
        id: 'adr_demo_work',
        label: 'work',
        line1: 'Shop 3, Main Bazaar',
        area: 'Jhang Sadar',
        landmark: null,
        location: { lat: 31.266, lng: 72.32 },
        isDefault: false,
      },
    );
  for (let i = 11; i >= 0; i--) {
    const lines = DEMO_LINES[i % DEMO_LINES.length]!;
    let priced: PricedCart;
    try {
      priced = priceCart(
        {
          lines,
          fulfilment: 'pickup',
          location: null,
          promoCode: null,
          scheduledFor: null,
          tip: 0,
        },
        c,
      );
    } catch {
      continue; // store closed etc.
    }
    const rec = newOrder(
      {
        lines,
        fulfilment: 'pickup',
        paymentMethod: 'cod',
        scheduledFor: null,
        customerNote: null,
        whatsappOptIn: false,
        source: 'website',
      },
      priced,
      c,
      null,
    );
    const at = new Date(Date.now() - (i + 1) * 3 * 86_400_000).toISOString();
    rec.autoAdvance = false;
    rec.rejectAt = null;
    rec.order.status = 'picked_up';
    rec.order.canCancel = false;
    rec.order.createdAt = at;
    rec.order.events = [
      { status: 'picked_up', at, note: null, actorType: 'system', actorName: 'seed' },
    ];
    if (i === 1) {
      // Paid Rs 50 less per unit back then.
      const l = rec.order.lines[0]!;
      const diff = 50 * l.qty;
      l.unitPrice -= 50;
      l.lineTotal -= diff;
      rec.order.subtotal -= diff;
      rec.order.total -= diff;
    }
    if (i === 2) {
      const l = rec.order.lines[0]!;
      l.itemId = 'itm_retired-classic';
      l.variantId = 'itm_retired-classic__std';
      l.name = { en: 'Retired Classic', ur: null };
    }
  }
  setSoldOut(FILLET_FURY_ID, true);
  save();
}
