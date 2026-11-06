import { z } from 'zod';
import { Id, IsoDateTime, PublicToken, Rupees } from './common';
import { Category, Item } from './menu';
import {
  CartLine,
  CustomerDetails,
  Fulfilment,
  ORDER_TRANSITIONS,
  OrderShape,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  Promo,
} from './order';
import { Address, AddressInput, DeliveryZone, OpeningHours } from './store';

/* ---------- Staff & auth (§5.4, §7) ---------- */

/** staff_role */
export const StaffRole = z.enum(['owner', 'manager', 'kitchen', 'cashier', 'rider']);
export type StaffRole = z.infer<typeof StaffRole>;

/** staff */
export const Staff = z.object({
  id: Id, // user_id
  name: z.string(), // name
  email: z.email(), // auth email
  role: StaffRole, // role
  phone: z.string().nullable(), // phone
  isActive: z.boolean(), // is_active
  /** TOTP enrolled. Required for owner and manager (§5.4). */
  twoFactorEnabled: z.boolean(),
});
export type Staff = z.infer<typeof Staff>;

export const StaffLoginRequest = z.object({ email: z.email(), password: z.string().min(8) });
export type StaffLoginRequest = z.infer<typeof StaffLoginRequest>;

/** `next`: what the client must do before the session is usable. */
export const StaffLoginResponse = z.object({
  staff: Staff,
  next: z.enum(['ok', 'verify_2fa', 'enrol_2fa']),
});
export type StaffLoginResponse = z.infer<typeof StaffLoginResponse>;

export const TwoFactorEnrolResponse = z.object({
  otpauthUrl: z.string(),
  secret: z.string(),
  /** ADDITION: one-time recovery codes. Shown once after the first code verifies; the server keeps hashes only. */
  recoveryCodes: z.array(z.string()).length(8),
});
export type TwoFactorEnrolResponse = z.infer<typeof TwoFactorEnrolResponse>;

export const TwoFactorVerifyRequest = z.object({ code: z.string().regex(/^\d{6}$/) });
export type TwoFactorVerifyRequest = z.infer<typeof TwoFactorVerifyRequest>;

/* ---------- Orders ---------- */

/** Front of house: sees full customer phones (Call / WhatsApp). The kitchen sees them masked (§7). */
export const FRONT_ROLES: readonly StaffRole[] = ['owner', 'manager', 'cashier'];
export const MANAGER_ROLES: readonly StaffRole[] = ['owner', 'manager'];

/**
 * Role check on top of ORDER_TRANSITIONS (§4.2). Shared by the admin UI (button gating) and the
 * mocks; the backend enforces the same table inside transition_order.
 * - owner / manager: every allowed move (so cancelling from `accepted` is manager-only).
 * - cashier: front-of-house moves; cancel only while `placed`, or a failed delivery.
 * - kitchen: accept / reject / preparing / ready. Never cancels.
 * - rider: picked up (→ out_for_delivery), delivered, failed delivery.
 */
const ROLE_MOVES: Record<StaffRole, (from: OrderStatus, to: OrderStatus) => boolean> = {
  owner: () => true,
  manager: () => true,
  cashier: (from, to) => to !== 'cancelled' || from === 'placed' || from === 'out_for_delivery',
  kitchen: (_from, to) => ['accepted', 'rejected', 'preparing', 'ready'].includes(to),
  rider: (from, to) =>
    to === 'out_for_delivery' ||
    to === 'delivered' ||
    (from === 'out_for_delivery' && to === 'cancelled'),
};

export function canRoleMove(
  role: StaffRole,
  order: { status: OrderStatus; fulfilment: Fulfilment },
  to: OrderStatus,
) {
  if (!ORDER_TRANSITIONS[order.status].includes(to)) return false;
  if (to === 'out_for_delivery' && order.fulfilment === 'pickup') return false;
  if (to === 'picked_up' && order.fulfilment === 'delivery') return false;
  return ROLE_MOVES[role](order.status, to);
}

/** Every move this role may make on this order, in state-machine order. */
export const allowedMoves = (
  role: StaffRole,
  order: { status: OrderStatus; fulfilment: Fulfilment },
) => ORDER_TRANSITIONS[order.status].filter((to) => canRoleMove(role, order, to));

/** Prep times staff pick when accepting (sets estimated_ready_at). */
export const PREP_MINUTES = [10, 15, 20, 30] as const;

/** order_events.actor_type */
export const ActorType = z.enum(['customer', 'staff', 'system', 'payment', 'mcp']);
export type ActorType = z.infer<typeof ActorType>;

/** Staff view of an order. */
export const AdminOrder = OrderShape.extend({
  id: Id, // id
  version: z.number().int().nonnegative(), // version (optimistic lock)
  customer: z.object({
    id: Id,
    name: z.string().nullable(),
    /**
     * Full E.164 for owner / manager / cashier (Call, WhatsApp) and on the rider's active order;
     * masked for the kitchen and everyone else (§7). "—" once anonymised.
     */
    phone: z.string(),
    orderCount: z.number().int().nonnegative(),
  }),
  /**
   * ADDITION: server-computed COD fraud flag (§7 "flag orders far above the customer's usual size
   * for a call-back"). Mock rule: total ≥ 2.5 × the customer's average earlier order, or a first
   * order ≥ Rs 5,000.
   */
  callBack: z.boolean(),
  rider: z.object({ id: Id, name: z.string() }).nullable(), // rider_assignments.rider_id
  acceptedAt: IsoDateTime.nullable(), // accepted_at
  readyAt: IsoDateTime.nullable(), // ready_at
  completedAt: IsoDateTime.nullable(), // completed_at
  cashCollectedAt: IsoDateTime.nullable(), // cash_collected_at
  cancelReason: z.string().nullable(), // cancel_reason
  releasedAt: IsoDateTime.nullable(), // released_at (pre-orders)
  events: z.array(
    z.object({
      status: OrderStatus, // to_status
      at: IsoDateTime, // created_at
      note: z.string().nullable(),
      actorType: ActorType, // actor_type
      actorName: z.string().nullable(),
    }),
  ),
});
export type AdminOrder = z.infer<typeof AdminOrder>;

export const AdminOrderQuery = z.object({
  /** ADDITION: BP number ("1042" or "BP-1042") or phone digits. */
  q: z.string().trim().max(40).optional(),
  /** ADDITION: one customer's history (admin customers page). */
  customerId: Id.optional(),
  status: z.array(OrderStatus).optional(),
  source: z.array(OrderSource).optional(),
  from: IsoDateTime.optional(),
  to: IsoDateTime.optional(),
});
export type AdminOrderQuery = z.infer<typeof AdminOrderQuery>;

export const TransitionRequest = z
  .object({
    to: OrderStatus,
    version: z.number().int().nonnegative(),
    note: z.string().trim().max(200).nullable(),
    /** ADDITION: on `accepted`, the prep time staff picked; sets estimated_ready_at (+ delivery ETA). */
    prepMinutes: z
      .number()
      .int()
      .refine((m) => (PREP_MINUTES as readonly number[]).includes(m))
      .optional(),
  })
  // Reject and cancel need a reason: the customer and the audit trail see it.
  .refine((t) => (t.to !== 'rejected' && t.to !== 'cancelled') || !!t.note, {
    message: 'reason required',
    path: ['note'],
  });
export type TransitionRequest = z.infer<typeof TransitionRequest>;

export const AssignRiderRequest = z.object({ riderId: Id });
export type AssignRiderRequest = z.infer<typeof AssignRiderRequest>;

/** ADDITION: POST /api/admin/orders/manual (cashier+). Same rules as create_order. */
export const ManualOrderRequest = z
  .object({
    source: OrderSource.exclude(['website']),
    customer: CustomerDetails,
    lines: z.array(CartLine).min(1).max(50),
    fulfilment: Fulfilment,
    addressId: Id.nullable(),
    newAddress: AddressInput.nullable(),
    paymentMethod: PaymentMethod,
    promoCode: z.string().trim().toUpperCase().max(32).nullable(),
    customerNote: z.string().trim().max(300).nullable(),
    scheduledFor: IsoDateTime.nullable(),
  })
  .refine((o) => o.fulfilment === 'pickup' || o.addressId !== null || o.newAddress !== null, {
    message: 'delivery needs addressId or newAddress',
    path: ['addressId'],
  });
export type ManualOrderRequest = z.infer<typeof ManualOrderRequest>;

/** Same order shape plus the public token so staff can send the customer a tracking link. */
export const ManualOrderResponse = z.object({
  order: AdminOrder,
  publicToken: PublicToken,
  trackingPath: z.string(),
});
export type ManualOrderResponse = z.infer<typeof ManualOrderResponse>;

/** ADDITION: GET /api/admin/customers/lookup?phone= (manual order entry). 404 = new customer. */
export const CustomerLookup = z.object({
  customer: z.object({
    id: Id,
    name: z.string().nullable(),
    phone: z.string(), // full E.164: staff typed it
    isBlocked: z.boolean(),
    blockReason: z.string().nullable(),
    codAllowed: z.boolean(),
    orderCount: z.number().int().nonnegative(),
    addresses: z.array(Address),
  }),
  /** Newest first, up to 3, for "Repeat last order". */
  recentOrders: z.array(AdminOrder),
});
export type CustomerLookup = z.infer<typeof CustomerLookup>;

/** Staff realtime channel payload (§4.6). */
export const KitchenEvent = z.object({
  type: z.enum(['order.created', 'order.updated']),
  order: AdminOrder,
});
export type KitchenEvent = z.infer<typeof KitchenEvent>;

/* ---------- Menu admin ---------- */

export const ItemInput = Item.omit({ id: true });
export type ItemInput = z.infer<typeof ItemInput>;
export const ItemPatch = ItemInput.partial();
export type ItemPatch = z.infer<typeof ItemPatch>;
export const CategoryInput = Category.omit({ id: true });
export type CategoryInput = z.infer<typeof CategoryInput>;
export const CategoryPatch = CategoryInput.partial();
export type CategoryPatch = z.infer<typeof CategoryPatch>;

export const SoldOutRequest = z.object({
  isSoldOut: z.boolean(),
  soldOutUntil: IsoDateTime.nullable(),
});
export type SoldOutRequest = z.infer<typeof SoldOutRequest>;

/** ADDITION: PATCH /api/admin/menu/modifier-groups/[id]. */
export const ModifierGroupPatch = z
  .object({ minSelect: z.number().int().nonnegative(), maxSelect: z.number().int().positive() })
  .refine((g) => g.minSelect <= g.maxSelect, { message: 'min ≤ max', path: ['minSelect'] });
export type ModifierGroupPatch = z.infer<typeof ModifierGroupPatch>;

/** Uploads: a client-side pre-check only; the server checks MIME + signature and re-encodes (§7). */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UploadResponse = z.object({ path: z.string() });
export type UploadResponse = z.infer<typeof UploadResponse>;

/* ---------- Store settings, hours, zones ---------- */

/** store_settings (single row) */
export const StoreSettings = z.object({
  isAcceptingOrders: z.boolean(), // is_accepting_orders
  pauseReason: z.string().nullable(), // pause_reason
  timezone: z.literal('Asia/Karachi'), // timezone
  minOrderValue: Rupees, // min_order_value
  maxCodValue: Rupees, // max_cod_value
  autoRejectMinutes: z.number().int().positive(), // auto_reject_minutes (8)
  managerAlertMinutes: z.number().int().positive(), // manager_alert_minutes (6)
  allowPreorders: z.boolean(), // allow_preorders
  preorderMaxDays: z.number().int().positive(), // preorder_max_days (7)
  preorderCodMaxHours: z.number().int().nonnegative(), // preorder_cod_max_hours (2)
  preorderReleaseMinutes: z.number().int().positive(), // preorder_release_minutes (60)
  shopPhone: z.string(), // shop_phone
  /** ADDITION: payment methods offered at checkout (online ones still need ALLOW_ONLINE_PAYMENTS). */
  enabledPaymentMethods: z.array(PaymentMethod).min(1),
  /** ADDITION: public links (footer, contact). null = not set yet (shown as TBC). */
  links: z.object({
    whatsapp: z.string().nullable(),
    instagram: z.url().nullable(),
    facebook: z.url().nullable(),
    tiktok: z.url().nullable(),
  }),
  /** ADDITION: maintenance page on every customer page (backend feeds proxy.ts, e.g. via Edge Config). */
  maintenanceMode: z.boolean(),
});
export type StoreSettings = z.infer<typeof StoreSettings>;

export const StoreSettingsPatch = StoreSettings.omit({ timezone: true }).partial();
export type StoreSettingsPatch = z.infer<typeof StoreSettingsPatch>;

export const PauseRequest = z.object({
  paused: z.boolean(),
  reason: z.string().trim().max(200).nullable(),
});
export type PauseRequest = z.infer<typeof PauseRequest>;

export const HoursRequest = z.object({ hours: z.array(OpeningHours) });
export type HoursRequest = z.infer<typeof HoursRequest>;

export const ZoneInput = DeliveryZone.omit({ id: true });
export type ZoneInput = z.infer<typeof ZoneInput>;

/* ---------- Promos ---------- */

export const PromoInput = Promo.omit({ id: true, usedCount: true });
export type PromoInput = z.infer<typeof PromoInput>;

/* ---------- Customers ---------- */

export const AdminCustomer = z.object({
  id: Id,
  name: z.string().nullable(), // name
  phone: z.string(), // phone_e164, masked
  isBlocked: z.boolean(), // is_blocked
  blockReason: z.string().nullable(), // block_reason
  codAllowed: z.boolean(), // cod_allowed
  failedCodCount: z.number().int().nonnegative(), // failed_cod_count
  orderCount: z.number().int().nonnegative(),
  totalSpent: Rupees,
  whatsappOptIn: z.boolean(), // whatsapp_opt_in
  anonymizedAt: IsoDateTime.nullable(), // anonymized_at
  /** ADDITION */
  lastOrderAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type AdminCustomer = z.infer<typeof AdminCustomer>;

/** ADDITION: POST /api/admin/customers/[id]/cod */
export const CodAllowedRequest = z.object({ codAllowed: z.boolean() });
export type CodAllowedRequest = z.infer<typeof CodAllowedRequest>;

export const BlockRequest = z.object({ reason: z.string().trim().min(3).max(200) });
export type BlockRequest = z.infer<typeof BlockRequest>;

/* ---------- Refunds (§4.3, §5.6) ---------- */

/** refund_status */
export const RefundStatus = z.enum(['requested', 'approved', 'processed', 'rejected']);
export type RefundStatus = z.infer<typeof RefundStatus>;

/** refunds */
export const Refund = z.object({
  id: Id, // id
  orderNumber: z.string(),
  orderToken: PublicToken,
  provider: PaymentMethod, // payments.provider
  amount: z.number().int().positive(), // amount (> 0, ≤ paid)
  paidAmount: Rupees,
  reason: z.string(), // reason
  status: RefundStatus, // status
  requestedBy: z.string(), // requested_by
  processedBy: z.string().nullable(), // processed_by
  processedAt: IsoDateTime.nullable(), // processed_at
  createdAt: IsoDateTime,
});
export type Refund = z.infer<typeof Refund>;

export const RefundRequest = z.object({
  orderToken: PublicToken,
  amount: z.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
});
export type RefundRequest = z.infer<typeof RefundRequest>;

/* ---------- Riders (§5.7) ---------- */

/** rider_assignments (+ the order a rider needs on the road) */
export const RiderAssignment = z.object({
  orderId: Id, // order_id
  riderId: Id, // rider_id
  assignedAt: IsoDateTime, // assigned_at
  pickedUpAt: IsoDateTime.nullable(), // picked_up_at
  deliveredAt: IsoDateTime.nullable(), // delivered_at
  cashInHand: Rupees, // cash_in_hand
  /** Full customer phone is visible to the rider only for this active order. */
  order: AdminOrder,
});
export type RiderAssignment = z.infer<typeof RiderAssignment>;

export const DeliveredRequest = z.object({ cashCollected: Rupees });

/** ADDITION: PATCH /api/admin/riders/[id] */
export const RiderPatch = z.object({ isActive: z.boolean() });
export type RiderPatch = z.infer<typeof RiderPatch>;
export type DeliveredRequest = z.infer<typeof DeliveredRequest>;

export const RiderSettlement = z.object({
  rider: Staff,
  openCash: Rupees, // sum of cash_in_hand on unsettled orders
  orders: z.array(
    z.object({
      publicToken: PublicToken,
      number: z.string(),
      cashInHand: Rupees,
      deliveredAt: IsoDateTime.nullable(),
    }),
  ),
});
export type RiderSettlement = z.infer<typeof RiderSettlement>;

/* ---------- Reviews moderation ---------- */

export const ReviewPatch = z.object({ isPublished: z.boolean() });
export type ReviewPatch = z.infer<typeof ReviewPatch>;

/* ---------- Reports ---------- */

const Count = z.number().int().nonnegative();

/**
 * Money and item figures count completed orders (delivered / picked_up); `allOrders` and the
 * cancel / reject counts cover every order created in the range. Hours and days are Asia/Karachi.
 */
export const SalesReport = z.object({
  from: IsoDateTime,
  to: IsoDateTime,
  orderCount: z.number().int().nonnegative(),
  /** ADDITION fields below, up to `byDay`. */
  allOrders: Count,
  cancelledCount: Count, // cancelled (incl. failed deliveries)
  rejectedCount: Count, // rejected by staff or the auto-reject job
  autoRejectedCount: Count, // rejected by the auto-reject job (actor_type = system)
  bookingsConfirmed: Count,
  byFulfilment: z.array(z.object({ fulfilment: Fulfilment, count: Count, total: Rupees })),
  byHour: z.array(z.object({ hour: z.number().int().min(0).max(23), orders: Count })),
  byCategory: z.array(z.object({ categoryId: Id, name: z.string(), qty: Count, total: Rupees })),
  bySourceByDay: z.array(z.object({ date: z.iso.date(), source: OrderSource, count: Count })),
  grossSales: Rupees,
  discounts: Rupees,
  deliveryFees: Rupees,
  averageOrder: Rupees,
  byPaymentMethod: z.array(
    z.object({ method: PaymentMethod, count: z.number().int(), total: Rupees }),
  ),
  bySource: z.array(z.object({ source: OrderSource, count: z.number().int(), total: Rupees })),
  byDay: z.array(z.object({ date: z.iso.date(), orders: z.number().int(), total: Rupees })),
  topItems: z.array(
    z.object({ itemId: Id, name: z.string(), qty: z.number().int(), total: Rupees }),
  ),
});
export type SalesReport = z.infer<typeof SalesReport>;

/* ---------- Outbox (§4.5) ---------- */

/** outbox_status */
export const OutboxStatus = z.enum(['pending', 'sending', 'sent', 'failed', 'dead']);
export type OutboxStatus = z.infer<typeof OutboxStatus>;

/** outbox */
export const OutboxItem = z.object({
  id: Id, // id
  topic: z.string(), // topic (whatsapp.*, sms.*, printer.kot, …)
  dedupKey: z.string(), // dedup_key (unique)
  status: OutboxStatus, // status
  attempts: z.number().int().nonnegative(), // attempts
  nextAttemptAt: IsoDateTime.nullable(), // next_attempt_at
  lastError: z.string().nullable(), // last_error
  createdAt: IsoDateTime, // created_at
});
export type OutboxItem = z.infer<typeof OutboxItem>;
