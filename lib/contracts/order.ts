import { z } from 'zod';
import { GeoPoint, Id, IsoDateTime, LocalizedText, Rupees } from './common';
import { VariantOption, VariantSize } from './menu';
import { AddressSnapshot } from './store';

/* ------------------------------------------------------------------ */
/* Cart & quote                                                        */
/* ------------------------------------------------------------------ */

export const Fulfilment = z.enum(['delivery', 'pickup']);
export type Fulfilment = z.infer<typeof Fulfilment>;

/** Intent only: ids and quantities. Never prices (ARCHITECTURE §0.1). */
export const CartLine = z.object({
  itemId: Id,
  variantId: Id,
  modifierIds: z.array(Id).max(20),
  qty: z.number().int().min(1).max(50),
  note: z.string().trim().max(200).nullable(),
});
export type CartLine = z.infer<typeof CartLine>;

export const QuoteRequest = z
  .object({
    lines: z.array(CartLine).min(1).max(50),
    fulfilment: Fulfilment,
    /** Saved address (logged-in). Either addressId or location for delivery. */
    addressId: Id.nullable(),
    /** Pin for guests who haven't saved an address yet. */
    location: GeoPoint.nullable(),
    promoCode: z.string().trim().toUpperCase().max(32).nullable(),
    scheduledFor: IsoDateTime.nullable(),
    tip: Rupees,
  })
  .refine((q) => q.fulfilment === 'pickup' || q.addressId !== null || q.location !== null, {
    message: 'delivery needs addressId or location',
    path: ['addressId'],
  });
export type QuoteRequest = z.infer<typeof QuoteRequest>;

export const QuotedModifier = z.object({ id: Id, name: LocalizedText, price: Rupees });
export type QuotedModifier = z.infer<typeof QuotedModifier>;

export const QuotedLine = z.object({
  itemId: Id,
  variantId: Id,
  name: LocalizedText,
  size: VariantSize.nullable(),
  option: VariantOption.nullable(),
  modifiers: z.array(QuotedModifier),
  /** Variant price + modifier prices. */
  unitPrice: Rupees,
  qty: z.number().int().min(1).max(50),
  /** unitPrice × qty. */
  lineTotal: Rupees,
  note: z.string().nullable(),
});
export type QuotedLine = z.infer<typeof QuotedLine>;

/** Server-calculated totals. The only total the checkout may show as final. */
export const Quote = z.object({
  lines: z.array(QuotedLine),
  subtotal: Rupees,
  deliveryFee: Rupees,
  discount: Rupees,
  tax: Rupees,
  tip: Rupees,
  /** subtotal + deliveryFee + tax + tip − discount */
  total: Rupees,
  minOrder: Rupees,
  etaMinutes: z.number().int().positive(),
  zone: z.object({ id: Id, name: z.string() }).nullable(),
  promo: z.object({ code: z.string(), discount: Rupees }).nullable(),
  cartHash: z.string(),
  quotedAt: IsoDateTime,
});
export type Quote = z.infer<typeof Quote>;

/* ------------------------------------------------------------------ */
/* Order lifecycle                                                     */
/* ------------------------------------------------------------------ */

/** Full backend status enum (ARCHITECTURE §5.1). */
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

/** The six stages a customer sees on the tracking page. */
export const CustomerStage = z.enum([
  'received',
  'preparing',
  'out_for_delivery',
  'ready_for_pickup',
  'delivered',
  'cancelled',
]);
export type CustomerStage = z.infer<typeof CustomerStage>;

/** Collapse the backend status into what the customer sees. `pending_payment` → null (payment UI). */
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

/** Allowed moves (ARCHITECTURE §4.2). Shared by admin UI and mocks. */
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

export const PaymentMethod = z.enum(['cod', 'jazzcash', 'easypaisa']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

/** pay_status (ARCHITECTURE §5.1). */
export const PaymentState = z.enum([
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
]);
export type PaymentState = z.infer<typeof PaymentState>;

export const TrackingEvent = z.object({
  status: OrderStatus,
  at: IsoDateTime,
  note: z.string().nullable(),
});
export type TrackingEvent = z.infer<typeof TrackingEvent>;

/** Customer view of an order. Addressed by `token`, never by number in URLs. */
export const Order = z.object({
  token: z.string().length(32),
  number: z.string().regex(/^BP-\d+$/),
  status: OrderStatus,
  fulfilment: Fulfilment,
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentState,
  lines: z.array(QuotedLine),
  subtotal: Rupees,
  deliveryFee: Rupees,
  discount: Rupees,
  tax: Rupees,
  tip: Rupees,
  total: Rupees,
  address: AddressSnapshot.nullable(),
  customerNote: z.string().nullable(),
  scheduledFor: IsoDateTime.nullable(),
  estimatedReadyAt: IsoDateTime.nullable(),
  estimatedDeliveryAt: IsoDateTime.nullable(),
  canCancel: z.boolean(),
  events: z.array(TrackingEvent),
  createdAt: IsoDateTime,
});
export type Order = z.infer<typeof Order>;

export const PlaceOrderRequest = z.object({
  lines: z.array(CartLine).min(1).max(50),
  fulfilment: Fulfilment,
  addressId: Id.nullable(),
  paymentMethod: PaymentMethod,
  promoCode: z.string().trim().toUpperCase().max(32).nullable(),
  scheduledFor: IsoDateTime.nullable(),
  customerNote: z.string().trim().max(300).nullable(),
  tip: Rupees,
  /** Unchecked by default in the UI (ARCHITECTURE §2.4). */
  whatsappOptIn: z.boolean(),
  /** Set after the user confirms "place again?" on DUPLICATE_ORDER_SUSPECTED. */
  confirmDuplicate: z.boolean(),
  /** Excluded from the idempotency request hash. */
  turnstileToken: z.string(),
});
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequest>;

export const PlaceOrderResponse = z.object({ order: Order });
export type PlaceOrderResponse = z.infer<typeof PlaceOrderResponse>;

export const CancelOrderRequest = z.object({ reason: z.string().trim().max(200).nullable() });
export type CancelOrderRequest = z.infer<typeof CancelOrderRequest>;

/** Pushed on the per-token realtime channel: status and ETA only. */
export const OrderRealtimeEvent = z.object({
  token: z.string(),
  status: OrderStatus,
  paymentStatus: PaymentState,
  estimatedReadyAt: IsoDateTime.nullable(),
  estimatedDeliveryAt: IsoDateTime.nullable(),
  at: IsoDateTime,
});
export type OrderRealtimeEvent = z.infer<typeof OrderRealtimeEvent>;

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export const OnlineProvider = z.enum(['jazzcash', 'easypaisa']);
export type OnlineProvider = z.infer<typeof OnlineProvider>;

export const PaymentInitiateRequest = z.object({ orderToken: z.string().length(32) });
export type PaymentInitiateRequest = z.infer<typeof PaymentInitiateRequest>;

/** The browser auto-submits this signed form to the gateway. */
export const PaymentInitiation = z.object({
  provider: OnlineProvider,
  status: PaymentState,
  redirect: z.object({
    url: z.string(),
    method: z.enum(['GET', 'POST']),
    fields: z.record(z.string(), z.string()),
  }),
  expiresAt: IsoDateTime,
});
export type PaymentInitiation = z.infer<typeof PaymentInitiation>;

/* ------------------------------------------------------------------ */
/* Promos                                                              */
/* ------------------------------------------------------------------ */

export const PromoKind = z.enum(['percent', 'flat', 'free_delivery']);
export type PromoKind = z.infer<typeof PromoKind>;

/** Public view of a promo (Deals page). */
export const Promo = z.object({
  code: z.string().min(2).max(32),
  kind: PromoKind,
  value: z.number().int().nonnegative(),
  minOrder: Rupees,
  validFrom: IsoDateTime.nullable(),
  validUntil: IsoDateTime.nullable(),
  description: LocalizedText.nullable(),
});
export type Promo = z.infer<typeof Promo>;
