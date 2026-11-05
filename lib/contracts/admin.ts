import { z } from 'zod';
import { Id, IsoDateTime, LocalizedText, Rupees } from './common';
import { Category, Item } from './menu';
import { Order, OrderStatus, PaymentMethod, PromoKind } from './order';
import { DeliveryZone, OpeningHours } from './store';

export const StaffRole = z.enum(['owner', 'manager', 'kitchen', 'cashier', 'rider']);
export type StaffRole = z.infer<typeof StaffRole>;

export const AdminUser = z.object({
  id: Id,
  name: z.string(),
  email: z.email(),
  role: StaffRole,
  twoFactorEnabled: z.boolean(),
  isActive: z.boolean(),
});
export type AdminUser = z.infer<typeof AdminUser>;

export const AdminLoginRequest = z.object({ email: z.email(), password: z.string().min(8) });
export type AdminLoginRequest = z.infer<typeof AdminLoginRequest>;

export const AdminLoginResponse = z.object({ user: AdminUser, requires2fa: z.boolean() });
export type AdminLoginResponse = z.infer<typeof AdminLoginResponse>;

export const Admin2faRequest = z.object({ code: z.string().regex(/^\d{6}$/) });
export type Admin2faRequest = z.infer<typeof Admin2faRequest>;

/* ---------- Orders ---------- */

export const ActorType = z.enum(['customer', 'staff', 'system', 'payment', 'mcp']);
export type ActorType = z.infer<typeof ActorType>;

export const AdminOrder = Order.extend({
  id: Id,
  version: z.number().int().nonnegative(),
  customer: z.object({
    id: Id,
    name: z.string().nullable(),
    /** Masked (e.g. +92 3•• •••• 567) except for the rider's active order. */
    phone: z.string(),
    orderCount: z.number().int().nonnegative(),
  }),
  rider: z.object({ id: Id, name: z.string() }).nullable(),
  source: z.enum(['web', 'foodpanda', 'phone', 'walk_in']),
  acceptedAt: IsoDateTime.nullable(),
  readyAt: IsoDateTime.nullable(),
  completedAt: IsoDateTime.nullable(),
  cancelReason: z.string().nullable(),
  events: z.array(
    z.object({
      status: OrderStatus,
      at: IsoDateTime,
      note: z.string().nullable(),
      actorType: ActorType,
      actorName: z.string().nullable(),
    }),
  ),
});
export type AdminOrder = z.infer<typeof AdminOrder>;

export const AdminOrderQuery = z.object({
  status: z.array(OrderStatus).optional(),
  from: IsoDateTime.optional(),
  to: IsoDateTime.optional(),
});
export type AdminOrderQuery = z.infer<typeof AdminOrderQuery>;

export const TransitionRequest = z.object({
  to: OrderStatus,
  /** Optimistic lock: the version the client last saw. */
  version: z.number().int().nonnegative(),
  note: z.string().trim().max(200).nullable(),
});
export type TransitionRequest = z.infer<typeof TransitionRequest>;

export const AssignRiderRequest = z.object({ riderId: Id });
export type AssignRiderRequest = z.infer<typeof AssignRiderRequest>;

/** Pushed on the staff realtime channel. */
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

/* ---------- Store settings ---------- */

export const StoreSettings = z.object({
  isAcceptingOrders: z.boolean(),
  pauseReason: z.string().nullable(),
  minOrderValue: Rupees,
  maxCodValue: Rupees,
  autoRejectMinutes: z.number().int().positive(),
  managerAlertMinutes: z.number().int().positive(),
  allowPreorders: z.boolean(),
  preorderMaxDays: z.number().int().positive(),
  preorderCodMaxHours: z.number().int().nonnegative(),
  shopPhone: z.string(),
  hours: z.array(OpeningHours),
  holidays: z.array(z.object({ date: z.iso.date(), note: z.string().nullable() })),
});
export type StoreSettings = z.infer<typeof StoreSettings>;

export const StoreSettingsPatch = StoreSettings.partial();
export type StoreSettingsPatch = z.infer<typeof StoreSettingsPatch>;

export const PauseRequest = z.object({
  paused: z.boolean(),
  reason: z.string().trim().max(200).nullable(),
});
export type PauseRequest = z.infer<typeof PauseRequest>;

export const ZoneInput = DeliveryZone.omit({ id: true });
export type ZoneInput = z.infer<typeof ZoneInput>;

/* ---------- Promos ---------- */

export const AdminPromo = z.object({
  id: Id,
  code: z.string().regex(/^[A-Z0-9_-]{2,32}$/),
  kind: PromoKind,
  value: z.number().int().nonnegative(),
  minOrder: Rupees,
  maxUses: z.number().int().positive().nullable(),
  maxUsesPerCustomer: z.number().int().positive(),
  usedCount: z.number().int().nonnegative(),
  validFrom: IsoDateTime.nullable(),
  validUntil: IsoDateTime.nullable(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  description: LocalizedText.nullable(),
});
export type AdminPromo = z.infer<typeof AdminPromo>;

export const PromoInput = AdminPromo.omit({ id: true, usedCount: true });
export type PromoInput = z.infer<typeof PromoInput>;

/* ---------- Customers ---------- */

export const AdminCustomer = z.object({
  id: Id,
  name: z.string().nullable(),
  /** Masked. */
  phone: z.string(),
  isBlocked: z.boolean(),
  blockReason: z.string().nullable(),
  codAllowed: z.boolean(),
  failedCodCount: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  totalSpent: Rupees,
  whatsappOptIn: z.boolean(),
  anonymizedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type AdminCustomer = z.infer<typeof AdminCustomer>;

export const BlockRequest = z.object({ reason: z.string().trim().min(3).max(200) });
export type BlockRequest = z.infer<typeof BlockRequest>;

/* ---------- Refunds ---------- */

export const RefundStatus = z.enum(['requested', 'approved', 'processed', 'rejected']);
export type RefundStatus = z.infer<typeof RefundStatus>;

export const Refund = z.object({
  id: Id,
  orderNumber: z.string(),
  orderToken: z.string(),
  provider: PaymentMethod,
  amount: Rupees,
  paidAmount: Rupees,
  reason: z.string(),
  status: RefundStatus,
  requestedBy: z.string(),
  processedBy: z.string().nullable(),
  processedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type Refund = z.infer<typeof Refund>;

export const RefundRequest = z.object({
  orderToken: z.string(),
  amount: z.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
});
export type RefundRequest = z.infer<typeof RefundRequest>;

/* ---------- Riders ---------- */

export const Rider = z.object({
  id: Id,
  name: z.string(),
  phone: z.string(),
  isActive: z.boolean(),
});
export type Rider = z.infer<typeof Rider>;

export const RiderSettlement = z.object({
  rider: Rider,
  openCash: Rupees,
  orders: z.array(
    z.object({
      token: z.string(),
      number: z.string(),
      cashInHand: Rupees,
      deliveredAt: IsoDateTime.nullable(),
    }),
  ),
});
export type RiderSettlement = z.infer<typeof RiderSettlement>;

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
  byDay: z.array(z.object({ date: z.iso.date(), orders: z.number().int(), total: Rupees })),
  topItems: z.array(
    z.object({ itemId: Id, name: z.string(), qty: z.number().int(), total: Rupees }),
  ),
});
export type SalesReport = z.infer<typeof SalesReport>;

/* ---------- Notifications (outbox) ---------- */

export const FailedNotification = z.object({
  id: Id,
  topic: z.string(),
  orderNumber: z.string().nullable(),
  status: z.enum(['failed', 'dead']),
  attempts: z.number().int(),
  lastError: z.string().nullable(),
  nextAttemptAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type FailedNotification = z.infer<typeof FailedNotification>;
