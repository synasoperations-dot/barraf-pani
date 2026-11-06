import { z } from 'zod';
import { Id, IsoDateTime, PublicToken, Rupees } from './common';
import { Category, Item } from './menu';
import {
  CartLine,
  CustomerDetails,
  Fulfilment,
  OrderShape,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  Promo,
} from './order';
import { AddressInput, DeliveryZone, OpeningHours } from './store';

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

export const TwoFactorEnrolResponse = z.object({ otpauthUrl: z.string(), secret: z.string() });
export type TwoFactorEnrolResponse = z.infer<typeof TwoFactorEnrolResponse>;

export const TwoFactorVerifyRequest = z.object({ code: z.string().regex(/^\d{6}$/) });
export type TwoFactorVerifyRequest = z.infer<typeof TwoFactorVerifyRequest>;

/* ---------- Orders ---------- */

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
    /** Masked except for the rider's active order (§7). */
    phone: z.string(),
    orderCount: z.number().int().nonnegative(),
  }),
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
  status: z.array(OrderStatus).optional(),
  source: z.array(OrderSource).optional(),
  from: IsoDateTime.optional(),
  to: IsoDateTime.optional(),
});
export type AdminOrderQuery = z.infer<typeof AdminOrderQuery>;

export const TransitionRequest = z.object({
  to: OrderStatus,
  version: z.number().int().nonnegative(),
  note: z.string().trim().max(200).nullable(),
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
  createdAt: IsoDateTime,
});
export type AdminCustomer = z.infer<typeof AdminCustomer>;

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

export const SalesReport = z.object({
  from: IsoDateTime,
  to: IsoDateTime,
  orderCount: z.number().int().nonnegative(),
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
