/**
 * ADDITION (docs/ARCHITECTURE_ADDITIONS.md §A2): Deals & Events with booking.
 * Deals are display cards: "Order" adds normal menu items at normal prices (no combo pricing,
 * FEATURE_COMBOS stays false). Events are cards with a Book button.
 */
import { z } from 'zod';
import { Id, IsoDateTime, LocalizedText, PhoneE164, PublicToken } from './common';
import { CartLine } from './order';
import { LocalTime } from './store';

/** deals */
export const Deal = z.object({
  id: Id, // id
  title: LocalizedText, // title_en / title_ur
  description: LocalizedText.nullable(), // description_en / description_ur
  imagePath: z.string().nullable(), // image_path
  /** Display text only (e.g. "Rs 795"). NEVER used for charging. */
  priceLabel: z.string().max(40).nullable(), // price_label
  /** Added to the cart as normal lines at normal prices. */
  items: z.array(CartLine.omit({ note: true })).min(1), // deal_items (item_id, variant_id, modifier_ids, qty)
  validFrom: IsoDateTime.nullable(), // valid_from
  validUntil: IsoDateTime.nullable(), // valid_until
  isActive: z.boolean(), // is_active
  sortOrder: z.number().int(), // sort_order
});
export type Deal = z.infer<typeof Deal>;

/** events */
export const Event = z.object({
  id: Id, // id
  title: LocalizedText, // title_en / title_ur
  description: LocalizedText.nullable(), // description_en / description_ur
  imagePath: z.string().nullable(), // image_path
  startsAt: IsoDateTime, // starts_at
  endsAt: IsoDateTime, // ends_at
  bookable: z.boolean(), // bookable
  capacity: z.number().int().positive().nullable(), // capacity (null = unlimited)
  /** Derived: capacity − confirmed/requested guests. Null when unlimited. */
  spotsLeft: z.number().int().nonnegative().nullable(),
  isActive: z.boolean(), // is_active
});
export type Event = z.infer<typeof Event>;

/** GET /api/deals-events (cached with tag `menu`). */
export const DealsEvents = z.object({ deals: z.array(Deal), events: z.array(Event) });
export type DealsEvents = z.infer<typeof DealsEvents>;

export const BookingType = z.enum(['table', 'event', 'private_event']);
export type BookingType = z.infer<typeof BookingType>;

export const BookingStatus = z.enum([
  'requested',
  'confirmed',
  'declined',
  'cancelled',
  'completed',
  'no_show',
]);
export type BookingStatus = z.infer<typeof BookingStatus>;

/** Allowed booking moves (staff). */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  declined: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

/** bookings */
export const Booking = z.object({
  publicToken: PublicToken, // public_token
  type: BookingType, // type
  eventId: Id.nullable(), // event_id
  date: z.iso.date(), // date (local)
  time: LocalTime, // time (local)
  guests: z.number().int().min(1).max(200), // guests
  name: z.string().min(1).max(80), // name
  phone: PhoneE164, // phone_e164
  note: z.string().max(500).nullable(), // note
  status: BookingStatus, // status
  declineReason: z.string().nullable(), // decline_reason
  createdAt: IsoDateTime, // created_at
});
export type Booking = z.infer<typeof Booking>;

/** POST /api/bookings (Idempotency-Key, Turnstile, rate-limited per phone + IP). Intent only. */
export const BookingRequest = z
  .object({
    type: BookingType,
    eventId: Id.nullable(),
    date: z.iso.date(),
    time: LocalTime,
    guests: z.number().int().min(1).max(200),
    name: z.string().trim().min(1).max(80),
    phone: PhoneE164,
    note: z.string().trim().max(500).nullable(),
    turnstileToken: z.string(),
  })
  .refine((b) => (b.type === 'event') === (b.eventId !== null), {
    message: 'eventId is required for event bookings only',
    path: ['eventId'],
  });
export type BookingRequest = z.infer<typeof BookingRequest>;

/** PATCH /api/admin/bookings/[token] */
export const BookingAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm') }),
  z.object({ action: z.literal('decline'), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal('complete') }),
  z.object({ action: z.literal('no_show') }),
  z.object({ action: z.literal('cancel') }),
]);
export type BookingAction = z.infer<typeof BookingAction>;

export const DealInput = Deal.omit({ id: true });
export type DealInput = z.infer<typeof DealInput>;
export const EventInput = Event.omit({ id: true, spotsLeft: true });
export type EventInput = z.infer<typeof EventInput>;
