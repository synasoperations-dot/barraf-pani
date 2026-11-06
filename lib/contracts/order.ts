import { z } from 'zod';
import {
  CodBlockReason,
  GeoPoint,
  Id,
  IsoDateTime,
  LocalizedText,
  PhoneE164,
  PublicToken,
  Rupees,
} from './common';
import { VariantOption, VariantSize } from './menu';
import { AddressInput, AddressSnapshot } from './store';

/* ------------------------------------------------------------------ */
/* Enums (ARCHITECTURE §5.1, copied exactly) + ADDITION order_source    */
/* ------------------------------------------------------------------ */

/** order_status */
export const OrderStatus = z.enum([
  'pending_payment',
  'placed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'picked_up',
  'cancelled',
  'rejected',
  'payment_failed',
  'expired',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

/** fulfilment */
export const Fulfilment = z.enum(['delivery', 'pickup']);
export type Fulfilment = z.infer<typeof Fulfilment>;

/** pay_method */
export const PaymentMethod = z.enum(['cod', 'jazzcash', 'easypaisa']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

/** pay_status */
export const PaymentState = z.enum([
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
]);
export type PaymentState = z.infer<typeof PaymentState>;

/** promo_kind */
export const PromoKind = z.enum(['percent', 'flat', 'free_delivery']);
export type PromoKind = z.infer<typeof PromoKind>;

/** ADDITION order_source (orders.source becomes this enum; docs/ARCHITECTURE_ADDITIONS.md §A1). */
export const OrderSource = z.enum(['website', 'whatsapp', 'phone', 'walk_in', 'foodpanda']);
export type OrderSource = z.infer<typeof OrderSource>;

/** Allowed moves (§4.2). Shared by admin UI and mocks; the backend enforces it in transition_order. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ['placed', 'payment_failed', 'expired'],
  expired: ['placed'],
  placed: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['out_for_delivery', 'picked_up'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  picked_up: [],
  cancelled: [],
  rejected: [],
  payment_failed: [],
};

/** The six stages a customer sees on the tracking page. `pending_payment` → null (payment UI). */
export const CustomerStage = z.enum([
  'received',
  'preparing',
  'out_for_delivery',
  'ready_for_pickup',
  'delivered',
  'cancelled',
]);
export type CustomerStage = z.infer<typeof CustomerStage>;

export function toCustomerStage(status: OrderStatus, fulfilment: Fulfilment): CustomerStage | null {
  switch (status) {
    case 'pending_payment':
      return null;
    case 'placed':
    case 'accepted':
      return 'received';
    case 'preparing':
      return 'preparing';
    case 'ready':
      return fulfilment === 'pickup' ? 'ready_for_pickup' : 'preparing';
    case 'out_for_delivery':
      return 'out_for_delivery';
    case 'delivered':
    case 'picked_up':
      return 'delivered';
    case 'cancelled':
    case 'rejected':
    case 'payment_failed':
    case 'expired':
      return 'cancelled';
  }
}

/* ------------------------------------------------------------------ */
/* Cart & quote                                                        */
/* ------------------------------------------------------------------ */

/** Intent only: ids and quantities. Never prices (§0.1). */
export const CartLine = z.object({
  itemId: Id,
  variantId: Id,
  modifierIds: z.array(Id).max(20),
  qty: z.number().int().min(1).max(50), // order_items.qty (1–50)
  note: z.string().trim().max(200).nullable(), // order_items.note
});
export type CartLine = z.infer<typeof CartLine>;

/** POST /api/cart/quote */
export const QuoteRequest = z
  .object({
    lines: z.array(CartLine).min(1).max(50),
    fulfilment: Fulfilment,
    addressId: Id.nullable(), // saved address
    location: GeoPoint.nullable(), // or a pin (guest / new address)
    promoCode: z.string().trim().toUpperCase().max(32).nullable(),
    scheduledFor: IsoDateTime.nullable(),
    tip: Rupees,
    /** Lets the server answer requiresOtp / cod for a guest before they verify. */
    phone: PhoneE164.nullable(),
  })
  .refine((q) => q.fulfilment === 'pickup' || q.addressId !== null || q.location !== null, {
    message: 'delivery needs addressId or location',
    path: ['addressId'],
  });
export type QuoteRequest = z.infer<typeof QuoteRequest>;

export const QuotedModifier = z.object({ id: Id, name: LocalizedText, price: Rupees });
export type QuotedModifier = z.infer<typeof QuotedModifier>;

/** order_items (+ order_item_modifiers) */
export const QuotedLine = z.object({
  itemId: Id, // item_id
  variantId: Id, // variant_id
  name: LocalizedText, // name_snapshot
  variantName: z.string(), // variant_snapshot
  size: VariantSize.nullable(),
  option: VariantOption.nullable(),
  modifiers: z.array(QuotedModifier), // order_item_modifiers
  unitPrice: Rupees, // unit_price (variant + modifiers)
  qty: z.number().int().min(1).max(50), // qty
  lineTotal: Rupees, // line_total = unit_price × qty
  note: z.string().nullable(), // note
});
export type QuotedLine = z.infer<typeof QuotedLine>;

/** Money block shared by Quote and Order; the total formula is enforced (§4.1, §5.5 check). */
const totalsOk = (t: {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
}) => t.total === t.subtotal + t.deliveryFee + t.tax + t.tip - t.discount;
const TOTAL_MSG = {
  message: 'total must equal subtotal + deliveryFee + tax + tip − discount',
  path: ['total'],
};

/** Server-calculated totals. The only total checkout may show as final (§2.4). */
export const Quote = z
  .object({
    lines: z.array(QuotedLine),
    subtotal: Rupees,
    deliveryFee: Rupees,
    discount: Rupees,
    tax: Rupees, // 0 in v1
    tip: Rupees, // 0 in v1
    total: Rupees,
    minOrder: Rupees, // larger of store and zone minimum
    etaMinutes: z.number().int().positive(),
    zone: z.object({ id: Id, name: z.string() }).nullable(),
    promo: z.object({ code: z.string(), discount: Rupees }).nullable(),
    /** True for an unverified phone's first COD order (§7). */
    requiresOtp: z.boolean(),
    cod: z.object({ allowed: z.boolean(), reason: CodBlockReason.nullable() }),
    cartHash: z.string(),
    quotedAt: IsoDateTime,
  })
  .refine(totalsOk, TOTAL_MSG);
export type Quote = z.infer<typeof Quote>;

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

/** order_events (customer view: no actor). */
export const TrackingEvent = z.object({
  status: OrderStatus, // to_status
  at: IsoDateTime, // created_at
  note: z.string().nullable(), // note
});
export type TrackingEvent = z.infer<typeof TrackingEvent>;

const OrderBase = z.object({
  publicToken: PublicToken, // public_token (URLs use this, never the number)
  number: z.string().regex(/^BP-\d+$/), // order_number, shown as BP-1042
  status: OrderStatus, // status
  source: OrderSource, // source (ADDITION enum)
  fulfilment: Fulfilment, // fulfilment
  paymentMethod: PaymentMethod, // payment_method
  paymentStatus: PaymentState, // payment_status (trigger-maintained projection)
  lines: z.array(QuotedLine), // order_items
  subtotal: Rupees, // subtotal
  deliveryFee: Rupees, // delivery_fee
  discount: Rupees, // discount
  tax: Rupees, // tax
  tip: Rupees, // tip
  total: Rupees, // total
  address: AddressSnapshot.nullable(), // address_snapshot
  customerNote: z.string().nullable(), // customer_note
  scheduledFor: IsoDateTime.nullable(), // scheduled_for
  estimatedReadyAt: IsoDateTime.nullable(), // estimated_ready_at
  estimatedDeliveryAt: IsoDateTime.nullable(), // estimated_delivery_at
  canCancel: z.boolean(), // derived: status = 'placed'
  createdAt: IsoDateTime, // created_at
});

/** Customer view of an order (tracking page, my orders). */
export const Order = OrderBase.extend({ events: z.array(TrackingEvent) }).refine(
  totalsOk,
  TOTAL_MSG,
);
export type Order = z.infer<typeof Order>;
/** Unrefined shape for extension (admin view). */
export const OrderShape = OrderBase;

export const CustomerDetails = z.object({
  name: z.string().trim().min(1).max(80),
  phone: PhoneE164,
});
export type CustomerDetails = z.infer<typeof CustomerDetails>;

/** POST /api/orders (Idempotency-Key header, Turnstile). */
export const PlaceOrderRequest = z
  .object({
    lines: z.array(CartLine).min(1).max(50),
    fulfilment: Fulfilment,
    addressId: Id.nullable(),
    /** New address (pin + landmark); saved to the customer by create_order. */
    newAddress: AddressInput.nullable(),
    paymentMethod: PaymentMethod,
    promoCode: z.string().trim().toUpperCase().max(32).nullable(),
    scheduledFor: IsoDateTime.nullable(),
    customerNote: z.string().trim().max(300).nullable(),
    tip: Rupees,
    customer: CustomerDetails,
    /** Unchecked by default in the UI (§2.4). */
    whatsappOptIn: z.boolean(),
    /** Set after the user confirms "place again?" on DUPLICATE_ORDER_SUSPECTED (§6 cart_hash). */
    confirmDuplicate: z.boolean(),
    /** Injected by lib/api; excluded from the idempotency request hash (§4.1). */
    turnstileToken: z.string(),
  })
  .refine((o) => o.fulfilment === 'pickup' || o.addressId !== null || o.newAddress !== null, {
    message: 'delivery needs addressId or newAddress',
    path: ['addressId'],
  });
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequest>;

export const PlaceOrderResponse = z.object({ order: Order });
export type PlaceOrderResponse = z.infer<typeof PlaceOrderResponse>;

export const CancelOrderRequest = z.object({ reason: z.string().trim().max(200).nullable() });
export type CancelOrderRequest = z.infer<typeof CancelOrderRequest>;

/** Per-token realtime channel payload: status and ETA only (§4.6). */
export const OrderRealtimeEvent = z.object({
  publicToken: PublicToken,
  status: OrderStatus,
  paymentStatus: PaymentState,
  estimatedReadyAt: IsoDateTime.nullable(),
  estimatedDeliveryAt: IsoDateTime.nullable(),
  at: IsoDateTime,
});
export type OrderRealtimeEvent = z.infer<typeof OrderRealtimeEvent>;

/* ------------------------------------------------------------------ */
/* Payments (§4.3)                                                     */
/* ------------------------------------------------------------------ */

export const OnlineProvider = z.enum(['jazzcash', 'easypaisa']);
export type OnlineProvider = z.infer<typeof OnlineProvider>;

export const PaymentInitiateRequest = z.object({ orderToken: PublicToken });
export type PaymentInitiateRequest = z.infer<typeof PaymentInitiateRequest>;

/** Signed form the browser auto-submits to the gateway. */
export const PaymentInitiation = z.object({
  provider: OnlineProvider,
  status: PaymentState,
  redirect: z.object({
    url: z.string(),
    method: z.enum(['GET', 'POST']),
    fields: z.record(z.string(), z.string()),
  }),
  expiresAt: IsoDateTime, // payments.expires_at (15 min)
});
export type PaymentInitiation = z.infer<typeof PaymentInitiation>;

/* ------------------------------------------------------------------ */
/* Promos & reviews                                                    */
/* ------------------------------------------------------------------ */

/** promo_codes */
export const Promo = z.object({
  id: Id, // id
  code: z.string().regex(/^[A-Z0-9_-]{2,32}$/), // code (unique, uppercase)
  kind: PromoKind, // kind
  value: z.number().int().nonnegative(), // value (percent points or rupees)
  minOrder: Rupees, // min_order
  maxUses: z.number().int().positive().nullable(), // max_uses
  maxUsesPerCustomer: z.number().int().positive(), // max_uses_per_customer (1)
  usedCount: z.number().int().nonnegative(), // derived from promo_redemptions
  validFrom: IsoDateTime.nullable(), // valid_from
  validUntil: IsoDateTime.nullable(), // valid_until
  isActive: z.boolean(), // is_active
});
export type Promo = z.infer<typeof Promo>;

/** reviews */
export const Review = z.object({
  id: Id, // id
  orderNumber: z.string(), // via order_id
  customerName: z.string().nullable(), // via customer_id (masked/first name)
  rating: z.number().int().min(1).max(5), // rating 1–5
  comment: z.string().nullable(), // comment
  isPublished: z.boolean(), // is_published
  createdAt: IsoDateTime, // created_at
});
export type Review = z.infer<typeof Review>;
