import { z } from 'zod';
import { GeoPoint, Id, IsoDateTime, LngLat, PhoneE164, Rupees } from './common';

/** Local "HH:MM" in the store timezone (Asia/Karachi). */
export const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** opening_hours: closes < opens means the window runs past midnight. weekday 0 = Sunday. */
export const OpeningHours = z.object({
  weekday: z.number().int().min(0).max(6), // weekday
  opens: LocalTime, // opens
  closes: LocalTime, // closes
});
export type OpeningHours = z.infer<typeof OpeningHours>;

/** holidays */
export const Holiday = z.object({
  date: z.iso.date(), // date (local)
  note: z.string().nullable(), // note
});
export type Holiday = z.infer<typeof Holiday>;

export const StoreState = z.enum(['open', 'closed', 'opening_soon', 'paused']);
export type StoreState = z.infer<typeof StoreState>;

/** GET /api/store/status: short cache (~30 s). Includes the public facts the shell needs. */
export const StoreStatus = z.object({
  state: StoreState,
  isAcceptingOrders: z.boolean(), // store_settings.is_accepting_orders && is_store_open(now)
  pauseReason: z.string().nullable(), // store_settings.pause_reason
  opensAt: IsoDateTime.nullable(), // next opening when not open
  closesAt: IsoDateTime.nullable(), // end of the current window when open
  allowPreorders: z.boolean(), // store_settings.allow_preorders
  minOrderValue: Rupees, // store_settings.min_order_value
  shopPhone: z.string(), // store_settings.shop_phone
  /** ADDITION: public opening hours (Home "Find us", checkout slot picker). */
  openingHours: z.array(OpeningHours), // opening_hours
  /** ADDITION: store_settings.preorder_max_days (7) and preorder_cod_max_hours (2). */
  preorderMaxDays: z.number().int().positive(),
  preorderCodMaxHours: z.number().int().nonnegative(),
  /** ADDITION: upcoming holidays (today and later), for the hours table and date pickers. */
  holidays: z.array(Holiday),
  checkedAt: IsoDateTime,
});
export type StoreStatus = z.infer<typeof StoreStatus>;

/** delivery_zones */
export const DeliveryZone = z.object({
  id: Id, // id
  name: z.string(), // name
  polygon: z.array(LngLat).min(4), // area (geography polygon, closed ring)
  fee: Rupees, // fee
  minOrder: Rupees, // min_order
  etaMinutes: z.number().int().positive(), // eta_minutes
  priority: z.number().int(), // priority
  isActive: z.boolean(), // is_active
});
export type DeliveryZone = z.infer<typeof DeliveryZone>;

/** POST /api/delivery/quote: pin → zone, fee, ETA. */
export const DeliveryQuoteRequest = z.object({ location: GeoPoint });
export type DeliveryQuoteRequest = z.infer<typeof DeliveryQuoteRequest>;

export const DeliveryQuote = z.object({
  zoneId: Id,
  zoneName: z.string(),
  fee: Rupees,
  /** Larger of the store and zone minimum (§4.1). */
  minOrder: Rupees,
  etaMinutes: z.number().int().positive(),
});
export type DeliveryQuote = z.infer<typeof DeliveryQuote>;

/** addresses */
export const Address = z.object({
  id: Id, // id
  label: z.string().max(40), // label
  line1: z.string().min(3).max(200), // line1
  area: z.string().max(100), // area
  landmark: z.string().max(200).nullable(), // landmark
  location: GeoPoint, // location (geography point)
  isDefault: z.boolean(), // is_default
});
export type Address = z.infer<typeof Address>;

/** A new address sent with a quote/order (saved to the customer by the server). */
export const AddressInput = Address.omit({ id: true, isDefault: true });
export type AddressInput = z.infer<typeof AddressInput>;

/** ADDITION: PATCH /api/me/addresses/[id]. `isDefault: true` clears the old default (one per customer). */
export const AddressPatch = AddressInput.partial().extend({
  isDefault: z.literal(true).optional(),
});
export type AddressPatch = z.infer<typeof AddressPatch>;

/** Address labels the UI offers (stored as text in addresses.label). */
export const ADDRESS_LABELS = ['home', 'work', 'other'] as const;

/** orders.address_snapshot */
export const AddressSnapshot = AddressInput.extend({
  recipientName: z.string().nullable(),
  recipientPhone: PhoneE164.nullable(),
});
export type AddressSnapshot = z.infer<typeof AddressSnapshot>;
