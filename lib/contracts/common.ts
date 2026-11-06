import { z } from 'zod';

/** Whole rupees. Never floats (ARCHITECTURE §0.2). */
export const Rupees = z.number().int().nonnegative();
export type Rupees = z.infer<typeof Rupees>;

/** Opaque id. UUID in production (§5 conventions); mocks use readable ids. */
export const Id = z.string().min(1);
export type Id = z.infer<typeof Id>;

/** 32-character random public token used in URLs (orders.public_token, bookings.public_token). */
export const PublicToken = z.string().length(32);
export type PublicToken = z.infer<typeof PublicToken>;

export const IsoDateTime = z.iso.datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTime>;

/** Pakistani mobile in E.164 (+923xxxxxxxxx). UI input goes through lib/phone normalizePkPhone. */
export const PhoneE164 = z.string().regex(/^\+923\d{9}$/, 'phone.invalid');
export type PhoneE164 = z.infer<typeof PhoneE164>;

/** `*_en` / `*_ur` column pair. `ur` is null until translated; UI falls back to `en`. */
export const LocalizedText = z.object({ en: z.string().min(1), ur: z.string().min(1).nullable() });
export type LocalizedText = z.infer<typeof LocalizedText>;

export const Locale = z.enum(['en', 'ur']);
export type Locale = z.infer<typeof Locale>;

/** [lng, lat] like GeoJSON. */
export const LngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export type LngLat = z.infer<typeof LngLat>;

/** geography point. */
export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPoint>;

/* ------------------------------------------------------------------ */
/* Errors (ARCHITECTURE §3.5)                                          */
/* ------------------------------------------------------------------ */

export const ErrorCode = z.enum([
  // §3.5
  'STORE_CLOSED',
  'ITEM_SOLD_OUT',
  'OUTSIDE_ZONE',
  'BELOW_MIN_ORDER',
  'ADDRESS_NOT_FOUND',
  'COD_NOT_ALLOWED',
  'PREORDER_INVALID',
  'PROMO_INVALID',
  'PROMO_EXPIRED',
  'PROMO_LIMIT',
  'TOO_LATE_TO_CANCEL',
  'RATE_LIMITED',
  'IDEMPOTENCY_CONFLICT',
  'IN_PROGRESS',
  'PAYMENT_PENDING',
  // ADDITION: needed by real flows (docs/ARCHITECTURE_ADDITIONS.md §A5)
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'OTP_INVALID',
  'OTP_EXPIRED',
  'TURNSTILE_FAILED',
  'DUPLICATE_ORDER_SUSPECTED',
  'VERSION_CONFLICT',
  'INVALID_TRANSITION',
  'EVENT_FULL',
  'INTERNAL_ERROR',
  // Client-only: produced by lib/api when the request never got a response
  'NETWORK_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const CodBlockReason = z.enum(['blocked', 'over_cap', 'preorder_too_far']);
export type CodBlockReason = z.infer<typeof CodBlockReason>;

/** Typed `details` per code (codes not listed carry no details). */
export const ErrorDetails = {
  STORE_CLOSED: z.object({ opensAt: IsoDateTime.nullable() }),
  ITEM_SOLD_OUT: z.object({ itemId: Id }),
  BELOW_MIN_ORDER: z.object({ minOrder: Rupees, shortBy: Rupees }),
  COD_NOT_ALLOWED: z.object({ reason: CodBlockReason }),
  TOO_LATE_TO_CANCEL: z.object({ shopPhone: z.string() }),
  RATE_LIMITED: z.object({ retryAfter: z.number().int().positive() }),
  IN_PROGRESS: z.object({ retryAfter: z.number().int().positive() }),
  DUPLICATE_ORDER_SUSPECTED: z.object({ existingToken: PublicToken }),
  UNAUTHENTICATED: z.object({ reason: z.enum(['session', 'otp_required']) }),
  VERSION_CONFLICT: z.object({ currentVersion: z.number().int() }),
} satisfies Partial<Record<ErrorCode, z.ZodType>>;

export const ApiErrorBody = z.object({
  code: ErrorCode,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

/** HTTP status for each code. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  STORE_CLOSED: 409,
  ITEM_SOLD_OUT: 409,
  OUTSIDE_ZONE: 422,
  BELOW_MIN_ORDER: 422,
  ADDRESS_NOT_FOUND: 404,
  COD_NOT_ALLOWED: 403,
  PREORDER_INVALID: 422,
  PROMO_INVALID: 422,
  PROMO_EXPIRED: 422,
  PROMO_LIMIT: 422,
  TOO_LATE_TO_CANCEL: 409,
  RATE_LIMITED: 429,
  IDEMPOTENCY_CONFLICT: 422,
  IN_PROGRESS: 409,
  PAYMENT_PENDING: 402,
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  OTP_INVALID: 422,
  OTP_EXPIRED: 410,
  TURNSTILE_FAILED: 403,
  DUPLICATE_ORDER_SUSPECTED: 409,
  VERSION_CONFLICT: 409,
  INVALID_TRANSITION: 422,
  EVENT_FULL: 409,
  INTERNAL_ERROR: 500,
  NETWORK_ERROR: 0,
};

/** Header names shared by client, mocks and backend. */
export const HEADERS = {
  idempotencyKey: 'Idempotency-Key',
  retryAfter: 'Retry-After',
} as const;
