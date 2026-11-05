import { z } from 'zod';
import { GeoPoint, Id, IsoDateTime, LngLat, PhoneE164, Rupees } from './common';

/** Local time "HH:MM" in the store timezone (Asia/Karachi). */
export const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** `closes < opens` means the window runs past midnight. weekday: 0 = Sunday. */
export const OpeningHours = z.object({
  weekday: z.number().int().min(0).max(6),
  opens: LocalTime,
  closes: LocalTime,
});
export type OpeningHours = z.infer<typeof OpeningHours>;

export const StoreInfo = z.object({
  name: z.string(),
  address: z.string(),
  location: GeoPoint,
  phone: z.string(),
  whatsapp: z.string(),
  timezone: z.literal('Asia/Karachi'),
  hours: z.array(OpeningHours),
  minOrder: Rupees,
  socials: z.object({
    instagram: z.string().nullable(),
    facebook: z.string().nullable(),
    tiktok: z.string().nullable(),
  }),
});
export type StoreInfo = z.infer<typeof StoreInfo>;

export const StoreState = z.enum(['open', 'closed', 'opening_soon', 'paused']);
export type StoreState = z.infer<typeof StoreState>;

/** GET /api/store/status. Cached ~30s. */
export const StoreStatus = z.object({
  state: StoreState,
  isAcceptingOrders: z.boolean(),
  pauseReason: z.string().nullable(),
  /** Next opening time when not open. */
  opensAt: IsoDateTime.nullable(),
  /** Closing time of the current window when open. */
  closesAt: IsoDateTime.nullable(),
  allowPreorders: z.boolean(),
  checkedAt: IsoDateTime,
});
export type StoreStatus = z.infer<typeof StoreStatus>;

export const DeliveryZone = z.object({
  id: Id,
  name: z.string(),
  /** Closed ring of [lng, lat]. */
  polygon: z.array(LngLat).min(4),
  fee: Rupees,
  minOrder: Rupees,
  etaMinutes: z.number().int().positive(),
  priority: z.number().int(),
  isActive: z.boolean(),
});
export type DeliveryZone = z.infer<typeof DeliveryZone>;

export const DeliveryQuoteRequest = z.object({ location: GeoPoint });
export type DeliveryQuoteRequest = z.infer<typeof DeliveryQuoteRequest>;

export const DeliveryQuote = z.object({
  zoneId: Id,
  zoneName: z.string(),
  fee: Rupees,
  /** Larger of store and zone minimum. */
  minOrder: Rupees,
  etaMinutes: z.number().int().positive(),
});
export type DeliveryQuote = z.infer<typeof DeliveryQuote>;

export const Address = z.object({
  id: Id,
  label: z.string().max(40),
  line1: z.string().min(3).max(200),
  area: z.string().max(100),
  landmark: z.string().max(200).nullable(),
  location: GeoPoint,
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof Address>;

export const AddressInput = Address.omit({ id: true });
export type AddressInput = z.infer<typeof AddressInput>;

/** Copy of the address stored on the order. */
export const AddressSnapshot = AddressInput.omit({ isDefault: true }).extend({
  recipientName: z.string().nullable(),
  recipientPhone: PhoneE164.nullable(),
});
export type AddressSnapshot = z.infer<typeof AddressSnapshot>;
