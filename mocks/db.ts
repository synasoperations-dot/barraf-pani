/**
 * In-memory mock backend. Persisted to localStorage so reloads and other tabs (customer +
 * kitchen side by side) see the same orders. Status progression is time-based (`tick`), so
 * it catches up after a reload instead of relying on long-lived timers.
 */
import * as C from '@/lib/contracts';
import { FILLET_FURY_ID, menuFixture } from './fixtures/menu';
import {
  promosFixture,
  ridersFixture,
  storeInfoFixture,
  storeSettingsFixture,
  zonesFixture,
} from './fixtures/store';
import { is } from './scenario';

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
export const MOCK_STAFF_PASSWORD = 'barraf123';

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
  outcome: 'success' | 'fail' | 'stuck';
  startedAt: number;
  expiresAt: number;
}

export interface OrderRec {
  order: C.AdminOrder;
  customerId: string;
  autoAdvance: boolean;
  lastChangeAt: number;
  cartHash: string;
  payment: PaymentRec | null;
  settled: boolean;
}

interface IdemRec {
  hash: string;
  state: 'processing' | 'done';
  status?: number;
  body?: unknown;
}

interface StaffRec extends C.AdminUser {
  password: string;
}

interface State {
  menu: C.Menu;
  settings: C.StoreSettings;
  zones: C.DeliveryZone[];
  promos: C.AdminPromo[];
  riders: C.Rider[];
  staff: StaffRec[];
  refunds: C.Refund[];
  notifications: C.FailedNotification[];
  customers: CustomerRec[];
  orders: OrderRec[];
  nextOrderNumber: number;
  session: { customerId: string | null; staffId: string | null; staff2faPending: boolean };
  otps: Record<string, { code: string; expiresAt: number; sentAt: number[] }>;
  idem: Record<string, IdemRec>;
  stats: { ordersCreated: number; replays: number; inProgress: number };
  soldOutTriggered: boolean;
}

const STORAGE_KEY = 'bp-mock-db-v1';
const clone = <T>(v: T): T => structuredClone(v);

function fresh(): State {
  return {
    menu: clone(menuFixture),
    settings: clone(storeSettingsFixture),
    zones: clone(zonesFixture),
    promos: clone(promosFixture),
    riders: clone(ridersFixture),
    staff: [
      {
        id: 'staff_owner',
        name: 'Owner (mock)',
        email: 'owner@barrafpaani.test',
        role: 'owner',
        twoFactorEnabled: true,
        isActive: true,
        password: MOCK_STAFF_PASSWORD,
      },
      {
        id: 'staff_manager',
        name: 'Manager (mock)',
        email: 'manager@barrafpaani.test',
        role: 'manager',
        twoFactorEnabled: true,
        isActive: true,
        password: MOCK_STAFF_PASSWORD,
      },
      {
        id: 'staff_kitchen',
        name: 'Kitchen tablet (mock)',
        email: 'kitchen@barrafpaani.test',
        role: 'kitchen',
        twoFactorEnabled: false,
        isActive: true,
        password: MOCK_STAFF_PASSWORD,
      },
    ],
    refunds: [],
    notifications: [
      {
        id: 'ntf_1',
        topic: 'whatsapp.order_placed',
        orderNumber: 'BP-1041',
        status: 'dead',
        attempts: 6,
        lastError: 'Template not approved (mock)',
        nextAttemptAt: null,
        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
      },
    ],
    customers: [],
    orders: [],
    nextOrderNumber: 1042,
    session: { customerId: null, staffId: null, staff2faPending: false },
    otps: {},
    idem: {},
    stats: { ordersCreated: 0, replays: 0, inProgress: 0 },
    soldOutTriggered: false,
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

/** Leaving the sold-out scenario puts Fillet Fury back on sale. */
export function restoreSoldOutScenario() {
  const item = db.menu.items.find((i) => i.id === FILLET_FURY_ID);
  if (item) item.isSoldOut = false;
  db.soldOutTriggered = false;
  save();
}

export function resetDb() {
  db = fresh();
  save();
}

/* ------------------------------------------------------------------ */
/* Change feeds (consumed by the SSE handlers)                          */
/* ------------------------------------------------------------------ */

type OrderListener = (rec: OrderRec, kind: 'created' | 'updated') => void;
const orderListeners = new Set<OrderListener>();
export const onOrderChange = (l: OrderListener) => (
  orderListeners.add(l),
  () => void orderListeners.delete(l)
);
export const emitOrder = (rec: OrderRec, kind: 'created' | 'updated') =>
  orderListeners.forEach((l) => l(rec, kind));

type SoldOutListener = (e: C.SoldOutEvent) => void;
const soldOutListeners = new Set<SoldOutListener>();
export const onSoldOut = (l: SoldOutListener) => (
  soldOutListeners.add(l),
  () => void soldOutListeners.delete(l)
);
export const emitSoldOut = (e: C.SoldOutEvent) => soldOutListeners.forEach((l) => l(e));

// Another tab changed the mock DB: reload and re-emit what changed.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const before = new Map(db.orders.map((r) => [r.order.token, r.order.version]));
    db = load();
    for (const rec of db.orders) {
      const v = before.get(rec.order.token);
      if (v === undefined) emitOrder(rec, 'created');
      else if (v !== rec.order.version) emitOrder(rec, 'updated');
    }
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const now = () => new Date().toISOString();

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Deterministic JSON for hashing (sorted keys). */
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

export function resolveZone(point: C.GeoPoint) {
  if (is('outside_zone')) return fail('OUTSIDE_ZONE', 'That pin is outside our delivery area.');
  const zone = db.zones
    .filter((z) => z.isActive && inPolygon(point, z.polygon))
    .sort((a, b) => b.priority - a.priority)[0];
  return zone ?? fail('OUTSIDE_ZONE', 'That pin is outside our delivery area.');
}

export const currentCustomer = () =>
  db.customers.find((c) => c.id === db.session.customerId) ?? null;
export const requireCustomer = () =>
  currentCustomer() ?? fail('UNAUTHENTICATED', 'Please verify your phone number.');

export function requireStaff(roles?: C.StaffRole[]) {
  const staff = db.session.staff2faPending
    ? null
    : db.staff.find((s) => s.id === db.session.staffId);
  if (!staff) return fail('UNAUTHENTICATED', 'Staff login required.');
  if (roles && !roles.includes(staff.role)) return fail('FORBIDDEN', 'Your role cannot do that.');
  return staff;
}

export const publicStaff = ({ password: _password, ...s }: StaffRec): C.AdminUser => s;

/* ------------------------------------------------------------------ */
/* Store status                                                        */
/* ------------------------------------------------------------------ */

/** Next opening time from the placeholder hours, in Asia/Karachi (UTC+5, no DST). */
function nextOpening(from = new Date()): string | null {
  const PKT = 5 * 3_600_000;
  for (let d = 0; d < 8; d++) {
    const local = new Date(from.getTime() + PKT + d * 86_400_000);
    const h = db.settings.hours.find((x) => x.weekday === local.getUTCDay());
    if (!h) continue;
    const [hh, mm] = h.opens.split(':').map(Number);
    const opens =
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hh, mm) - PKT;
    if (opens > from.getTime()) return new Date(opens).toISOString();
  }
  return null;
}

export function storeStatus(): C.StoreStatus {
  const paused = !db.settings.isAcceptingOrders;
  // ponytail: happy path is always open so dev works at any hour; store_closed forces closed.
  const closed = is('store_closed');
  const opensAt = closed ? nextOpening() : null;
  const soon = opensAt !== null && new Date(opensAt).getTime() - Date.now() < 60 * 60_000;
  return {
    state: paused ? 'paused' : closed ? (soon ? 'opening_soon' : 'closed') : 'open',
    isAcceptingOrders: !paused && !closed,
    pauseReason: db.settings.pauseReason,
    opensAt,
    closesAt: null,
    allowPreorders: db.settings.allowPreorders,
    checkedAt: now(),
  };
}

/* ------------------------------------------------------------------ */
/* Pricing (server-side quote)                                         */
/* ------------------------------------------------------------------ */

interface PriceInput {
  lines: C.CartLine[];
  fulfilment: C.Fulfilment;
  addressId: string | null;
  location: C.GeoPoint | null;
  promoCode: string | null;
  scheduledFor: string | null;
  tip: number;
}

export function priceCart(
  input: PriceInput,
  customer: CustomerRec | null,
): C.Quote & { address: C.Address | null } {
  // Store open, or a valid pre-order.
  if (input.scheduledFor) {
    const at = new Date(input.scheduledFor).getTime();
    if (
      !db.settings.allowPreorders ||
      at <= Date.now() ||
      at > Date.now() + db.settings.preorderMaxDays * 86_400_000
    )
      fail('PREORDER_INVALID', 'Pick a time in the next 7 days while we are open.');
  } else if (!storeStatus().isAcceptingOrders) {
    fail('STORE_CLOSED', 'We are closed right now.', { opensAt: storeStatus().opensAt });
  }

  // Items, variants, modifiers.
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
      size: variant.size,
      option: variant.option,
      modifiers,
      unitPrice,
      qty: line.qty,
      lineTotal: unitPrice * line.qty,
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
    const item = db.menu.items.find((i) => i.id === FILLET_FURY_ID)!;
    item.isSoldOut = true;
    emitSoldOut({ itemId: item.id, isSoldOut: true, soldOutUntil: null });
    save();
  }

  // Delivery zone.
  let zone: C.DeliveryZone | null = null;
  let address: C.Address | null = null;
  if (input.fulfilment === 'delivery') {
    if (input.addressId) {
      address =
        customer?.addresses.find((a) => a.id === input.addressId) ??
        fail('ADDRESS_NOT_FOUND', 'Address not found.');
      zone = resolveZone(address.location);
    } else if (input.location) {
      zone = resolveZone(input.location);
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const minOrder = Math.max(db.settings.minOrderValue, zone?.minOrder ?? 0);
  if (subtotal < minOrder)
    fail('BELOW_MIN_ORDER', `Minimum order is Rs ${minOrder}.`, { minOrder, subtotal });

  const deliveryFee = input.fulfilment === 'pickup' ? 0 : (zone?.fee ?? 0);
  let discount = 0;
  let promo: C.Quote['promo'] = null;
  if (input.promoCode) {
    const p = db.promos.find((x) => x.code === input.promoCode && x.isActive);
    if (!p) return fail('PROMO_INVALID', 'That code is not valid.');
    if (p.validUntil && new Date(p.validUntil).getTime() < Date.now())
      fail('PROMO_EXPIRED', 'That code has expired.');
    if (p.validFrom && new Date(p.validFrom).getTime() > Date.now())
      fail('PROMO_INVALID', 'That code is not active yet.');
    if (p.maxUses !== null && p.usedCount >= p.maxUses)
      fail('PROMO_LIMIT', 'That code has been fully used.');
    if (subtotal < p.minOrder)
      fail('PROMO_INVALID', `Spend Rs ${p.minOrder} to use this code.`, { minOrder: p.minOrder });
    if (p.kind === 'percent') discount = Math.floor((subtotal * p.value) / 100);
    if (p.kind === 'flat') discount = Math.min(p.value, subtotal);
    if (p.kind === 'free_delivery') discount = deliveryFee;
    promo = { code: p.code, discount };
  }

  const tax = 0;
  const total = subtotal + deliveryFee + tax + input.tip - discount;
  return {
    lines,
    subtotal,
    deliveryFee,
    discount,
    tax,
    tip: input.tip,
    total,
    minOrder,
    etaMinutes: 20 + (zone?.etaMinutes ?? 0),
    zone: zone ? { id: zone.id, name: zone.name } : null,
    promo,
    cartHash: hash(stableStringify(input.lines)),
    quotedAt: now(),
    address,
  };
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function toCustomerOrder(rec: OrderRec): C.Order {
  const {
    id: _id,
    version: _v,
    customer: _c,
    rider: _r,
    source: _s,
    acceptedAt: _a,
    readyAt: _rd,
    completedAt: _cm,
    cancelReason: _cr,
    events,
    ...rest
  } = rec.order;
  return { ...rest, events: events.map(({ status, at, note }) => ({ status, at, note })) };
}

export function transition(
  rec: OrderRec,
  to: C.OrderStatus,
  actorType: C.ActorType,
  actorName: string | null,
  note: string | null = null,
) {
  const o = rec.order;
  if (o.status === to) return; // idempotent
  const at = now();
  o.status = to;
  o.version += 1;
  o.canCancel = to === 'placed';
  o.events.push({ status: to, at, note, actorType, actorName });
  if (to === 'accepted') o.acceptedAt = at;
  if (to === 'ready') o.readyAt = at;
  if (to === 'delivered' || to === 'picked_up') {
    o.completedAt = at;
    if (o.paymentMethod === 'cod') o.paymentStatus = 'paid';
  }
  rec.lastChangeAt = Date.now();
  save();
  emitOrder(rec, 'updated');
}

// Auto-progression for mock orders: [next status, ms after the last change].
const FLOW: Record<C.Fulfilment, Partial<Record<C.OrderStatus, [C.OrderStatus, number]>>> = {
  delivery: {
    placed: ['accepted', 6000],
    accepted: ['preparing', 2000],
    preparing: ['ready', 6000],
    ready: ['out_for_delivery', 2000],
    out_for_delivery: ['delivered', 8000],
  },
  pickup: {
    placed: ['accepted', 6000],
    accepted: ['preparing', 2000],
    preparing: ['ready', 8000],
    ready: ['picked_up', 8000],
  },
};

/** Advance timers. Called on every request and once a second by the worker bootstrap. */
export function tick() {
  for (const rec of db.orders) {
    const p = rec.payment;
    if (p?.status === 'pending') {
      const elapsed = Date.now() - p.startedAt;
      if (p.outcome === 'success' && elapsed > 4000) {
        p.status = 'paid';
        rec.order.paymentStatus = 'paid';
        rec.autoAdvance = true;
        transition(rec, 'placed', 'payment', p.provider);
      } else if (p.outcome === 'fail' && elapsed > 4000) {
        p.status = 'failed';
        rec.order.paymentStatus = 'failed';
        transition(rec, 'payment_failed', 'payment', p.provider);
      } else if (Date.now() > p.expiresAt) {
        p.status = 'failed';
        rec.order.paymentStatus = 'failed';
        transition(rec, 'expired', 'system', 'reconciler');
      }
    }
    if (!rec.autoAdvance) continue;
    // Loop so a reload catches up through several steps at once.
    for (
      let step = FLOW[rec.order.fulfilment][rec.order.status];
      step;
      step = FLOW[rec.order.fulfilment][rec.order.status]
    ) {
      if (Date.now() - rec.lastChangeAt < step[1]) break;
      transition(rec, step[0], 'system', 'mock timer');
    }
  }
}

export function newOrder(
  input: C.PlaceOrderRequest,
  quote: ReturnType<typeof priceCart>,
  customer: CustomerRec,
): OrderRec {
  const at = now();
  const online = input.paymentMethod !== 'cod';
  const status: C.OrderStatus = online ? 'pending_payment' : 'placed';
  const readyAt = new Date(Date.now() + 20 * 60_000).toISOString();
  const rec: OrderRec = {
    customerId: customer.id,
    autoAdvance: !online,
    lastChangeAt: Date.now(),
    cartHash: quote.cartHash,
    payment: null,
    settled: false,
    order: {
      id: `ord_${randomToken().slice(0, 12)}`,
      token: randomToken(),
      number: `BP-${db.nextOrderNumber++}`,
      status,
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
      address: quote.address
        ? {
            label: quote.address.label,
            line1: quote.address.line1,
            area: quote.address.area,
            landmark: quote.address.landmark,
            location: quote.address.location,
            recipientName: customer.name,
            recipientPhone: customer.phone,
          }
        : null,
      customerNote: input.customerNote,
      scheduledFor: input.scheduledFor,
      estimatedReadyAt: readyAt,
      estimatedDeliveryAt:
        input.fulfilment === 'delivery'
          ? new Date(Date.now() + quote.etaMinutes * 60_000).toISOString()
          : null,
      canCancel: status === 'placed',
      events: [{ status, at, note: null, actorType: 'customer', actorName: customer.name }],
      createdAt: at,
      version: 0,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: maskPhone(customer.phone),
        orderCount: db.orders.filter((o) => o.customerId === customer.id).length + 1,
      },
      rider: null,
      source: 'web',
      acceptedAt: null,
      readyAt: null,
      completedAt: null,
      cancelReason: null,
    },
  };
  if (quote.promo) {
    const p = db.promos.find((x) => x.code === quote.promo!.code);
    if (p) p.usedCount += 1;
  }
  db.orders.unshift(rec);
  db.stats.ordersCreated += 1;
  customer.whatsappOptIn ||= input.whatsappOptIn;
  save();
  emitOrder(rec, 'created');
  return rec;
}

export const findOrderByToken = (token: string) =>
  db.orders.find((r) => r.order.token === token) ?? fail('NOT_FOUND', 'Order not found.');
export const findOrderById = (id: string) =>
  db.orders.find((r) => r.order.id === id) ?? fail('NOT_FOUND', 'Order not found.');

/* ------------------------------------------------------------------ */
/* Idempotency                                                          */
/* ------------------------------------------------------------------ */

/**
 * Mirrors ARCHITECTURE §4.1: lookup → 409 while processing → 422 on hash mismatch →
 * replay stored response when done → otherwise claim and run.
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
      fail('IN_PROGRESS', 'Still working on it.', undefined, { [C.HEADERS.retryAfter]: '2' });
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

/** Seed info for the store endpoints. */
export const storeInfo = () => storeInfoFixture;
