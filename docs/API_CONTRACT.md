# Barraf Paani — API contract

The frontend and backend meet here (ARCHITECTURE §3). **Schemas are the source of truth:** `lib/contracts/*.ts` (Zod + inferred types). Each schema field has a comment with its snake_case column (§5).

This document lists every endpoint. The API client (`lib/api`) and the mocks (`mocks/handlers`) both implement each one. When the backend lands, any mismatch is fixed **in the backend** (§3.6 step 5). Entries marked **ADDITION** come from `docs/ARCHITECTURE_ADDITIONS.md`.

## Conventions

- JSON in, JSON out. **Money is whole rupees**: `z.number().int().nonnegative()`. Timestamps are ISO 8601 with an offset. Local dates and times are in Asia/Karachi.
- Clients send **intent only** (ids, quantities, codes, addresses). Never prices, totals, fees or statuses (§0.1).
- 🔑 **Idempotency-Key** header (UUID). Checkout generates it when the screen opens and reuses it on every retry (§2.4). The request hash excludes `turnstileToken`.
  - Same key + same body after success → the stored response is replayed (same status and body).
  - Same key + different body → `422 IDEMPOTENCY_CONFLICT`.
  - Same key still processing → `409 IN_PROGRESS` with `Retry-After: 2`. `lib/api` **retries automatically** after `Retry-After` with the same key (up to 5 times).
- 🤖 **Turnstile:** `lib/api` injects `turnstileToken` into the body (order, OTP, booking).
- **Auth:** customers use a Supabase session cookie after phone OTP. Staff use a session cookie after email + password, plus TOTP for owner and manager. Admin routes check the role on every call.
- **Tracking and booking URLs** use the 32-char `publicToken`, never the order number. The order number displays as `BP-1042`.
- **Caller:** `SC` = Server Component read (cached), `B` = browser (TanStack Query / mutation), `RT` = realtime subscription, `Staff` = admin/kitchen/rider PWA.

## Errors

Every error body has the same shape: `{ code, message, details? }` (`ApiErrorBody`). Typed details: `ErrorDetails` in `lib/contracts/common.ts`.

| Code                                              | HTTP | When                                                                                          | `details`                                               |
| ------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `STORE_CLOSED`                                    | 409  | Outside hours, holiday, or ordering paused                                                    | `opensAt`                                               |
| `ITEM_SOLD_OUT`                                   | 409  | Item or variant unavailable                                                                   | `itemId`                                                |
| `OUTSIDE_ZONE`                                    | 422  | Pin not covered by any active zone                                                            | —                                                       |
| `BELOW_MIN_ORDER`                                 | 422  | Below the larger of the store and zone minimum                                                | `minOrder`, `shortBy`                                   |
| `ADDRESS_NOT_FOUND`                               | 404  | Address missing or not the customer's own                                                     | —                                                       |
| `COD_NOT_ALLOWED`                                 | 403  | COD refused                                                                                   | `reason`: `blocked` \| `over_cap` \| `preorder_too_far` |
| `PREORDER_INVALID`                                | 422  | In the past, > 7 days out, or outside hours                                                   | —                                                       |
| `PROMO_INVALID` / `PROMO_EXPIRED` / `PROMO_LIMIT` | 422  | Promo checks failed (no stacking)                                                             | `minOrder` when relevant                                |
| `TOO_LATE_TO_CANCEL`                              | 409  | Order no longer `placed`                                                                      | `shopPhone`                                             |
| `RATE_LIMITED`                                    | 429  | Too many requests (`Retry-After` header)                                                      | `retryAfter`                                            |
| `IDEMPOTENCY_CONFLICT`                            | 422  | Same key, different body                                                                      | —                                                       |
| `IN_PROGRESS`                                     | 409  | Same key still processing (`Retry-After: 2`)                                                  | `retryAfter` (2)                                        |
| `PAYMENT_PENDING`                                 | 402  | Payment not yet confirmed                                                                     | —                                                       |
| **ADDITION codes**                                |      |                                                                                               |                                                         |
| `VALIDATION_FAILED`                               | 400  | Zod or business validation failed                                                             | `issues` / `field`                                      |
| `UNAUTHENTICATED`                                 | 401  | No session, or OTP needed for the first COD order                                             | `reason`: `session` \| `otp_required`                   |
| `FORBIDDEN`                                       | 403  | Role not allowed                                                                              | —                                                       |
| `NOT_FOUND`                                       | 404  | Unknown id or token                                                                           | —                                                       |
| `OTP_INVALID`                                     | 422  | Wrong code (customer OTP or staff TOTP)                                                       | —                                                       |
| `OTP_EXPIRED`                                     | 410  | OTP older than 5 minutes                                                                      | —                                                       |
| `TURNSTILE_FAILED`                                | 403  | Bot check failed                                                                              | —                                                       |
| `DUPLICATE_ORDER_SUSPECTED`                       | 409  | Same cart + phone within 3 minutes (§6): "place again?". Resend with `confirmDuplicate: true` | `existingToken`                                         |
| `VERSION_CONFLICT`                                | 409  | Optimistic lock failed (§4.2)                                                                 | `currentVersion`                                        |
| `INVALID_TRANSITION`                              | 422  | Move not allowed by the state machine                                                         | —                                                       |
| `EVENT_FULL`                                      | 409  | Event capacity reached                                                                        | `spotsLeft`                                             |
| `INTERNAL_ERROR`                                  | 500  | Unexpected failure                                                                            | —                                                       |
| `NETWORK_ERROR`                                   | —    | **Client-only**: no response arrived                                                          | —                                                       |

The UI has English and Urdu copy for every code under `errors.<CODE>` in `lib/i18n/messages`.

---

## Customer: public reads (§3.1)

| Method | Path                             | Caller | Request | Response                                                                 | Errors | Rate limit / cache |
| ------ | -------------------------------- | ------ | ------- | ------------------------------------------------------------------------ | ------ | ------------------ |
| GET    | `/api/menu`                      | SC, B  | —       | `Menu`                                                                   | —      | Cached, tag `menu` |
| GET    | `/api/store/status`              | SC, B  | —       | `StoreStatus` (state, pause reason, opens/closes, min order, shop phone) | —      | ~30 s cache        |
| GET    | `/api/deals-events` **ADDITION** | SC, B  | —       | `DealsEvents` `{ deals: Deal[], events: Event[] }`                       | —      | Cached, tag `menu` |

## Customer: quotes (§3.1)

| Method | Path                  | Caller | Request                                                                                    | Response                                                                                                                                                                                                                        | Errors                                                                                                                                      | Rate limit |
| ------ | --------------------- | ------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| POST   | `/api/delivery/quote` | B      | `DeliveryQuoteRequest` `{ location }`                                                      | `DeliveryQuote` (zone, fee, min order, ETA)                                                                                                                                                                                     | `OUTSIDE_ZONE`, `VALIDATION_FAILED`                                                                                                         | Per IP     |
| POST   | `/api/cart/quote`     | B      | `QuoteRequest` (lines, fulfilment, addressId \| location, promo, scheduledFor, tip, phone) | `Quote` (lines, subtotal, deliveryFee, discount, tax 0, tip 0, total, minOrder, eta, zone, promo, **requiresOtp**, **cod**, cartHash). `total = subtotal + deliveryFee + tax + tip − discount` is enforced by the schema refine | `STORE_CLOSED`, `PREORDER_INVALID`, `ITEM_SOLD_OUT`, `OUTSIDE_ZONE`, `ADDRESS_NOT_FOUND`, `BELOW_MIN_ORDER`, `PROMO_*`, `VALIDATION_FAILED` | Per IP     |

## Customer: auth and profile

| Method | Path                              | Caller | Request                           | Response                                                                             | Errors                                                  | Rate limit                               |
| ------ | --------------------------------- | ------ | --------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------- |
| POST   | `/api/auth/otp/request` 🤖        | B      | `OtpRequest` `{ phone, channel }` | `OtpRequestResponse`                                                                 | `RATE_LIMITED`, `TURNSTILE_FAILED`, `VALIDATION_FAILED` | **3 per phone per 10 min**, with lockout |
| POST   | `/api/auth/otp/verify`            | B      | `OtpVerify` `{ phone, code }`     | `OtpVerifyResponse` `{ customer, isNew }` + session cookie; sets `phone_verified_at` | `OTP_INVALID`, `OTP_EXPIRED`, `RATE_LIMITED`            | Per phone                                |
| POST   | `/api/auth/logout` ADDITION       | B      | —                                 | `{ ok: true }`                                                                       | —                                                       | —                                        |
| GET    | `/api/me` ADDITION                | B      | —                                 | `Customer`                                                                           | `UNAUTHENTICATED`                                       | —                                        |
| PATCH  | `/api/me` ADDITION                | B      | `UpdateCustomerRequest`           | `Customer`                                                                           | `UNAUTHENTICATED`, `VALIDATION_FAILED`                  | —                                        |
| GET    | `/api/me/addresses` ADDITION      | B      | —                                 | `Address[]`                                                                          | `UNAUTHENTICATED`                                       | —                                        |
| POST   | `/api/me/addresses` ADDITION      | B      | `AddressInput`                    | `Address` (201)                                                                      | `UNAUTHENTICATED`, `OUTSIDE_ZONE`                       | —                                        |
| DELETE | `/api/me/addresses/[id]` ADDITION | B      | —                                 | `{ ok: true }`                                                                       | `ADDRESS_NOT_FOUND`                                     | —                                        |

## Customer: orders (§3.1, §4.1)

| Method | Path                         | Caller          | Request                                                                                                                                                                                      | Response                                                                                                | Errors                                                                                                                                                                                                                                                                              | Rate limit                                           |
| ------ | ---------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| POST   | `/api/orders` 🔑🤖           | B               | `PlaceOrderRequest` (lines, fulfilment, addressId \| newAddress, paymentMethod, promo, scheduledFor, note, tip, customer `{ name, phone }`, whatsappOptIn (default false), confirmDuplicate) | `PlaceOrderResponse` `{ order }` (201; same body on replay). COD → `placed`; online → `pending_payment` | `UNAUTHENTICATED` (otp_required), `STORE_CLOSED`, `PREORDER_INVALID`, `ITEM_SOLD_OUT`, `OUTSIDE_ZONE`, `ADDRESS_NOT_FOUND`, `BELOW_MIN_ORDER`, `COD_NOT_ALLOWED`, `PROMO_*`, `DUPLICATE_ORDER_SUSPECTED`, `TURNSTILE_FAILED`, `RATE_LIMITED`, `IN_PROGRESS`, `IDEMPOTENCY_CONFLICT` | Per IP, phone and customer                           |
| GET    | `/api/orders/track/[token]`  | SC, then RT / B | —                                                                                                                                                                                            | `Order`                                                                                                 | `NOT_FOUND`, `RATE_LIMITED`                                                                                                                                                                                                                                                         | Per IP. `Referrer-Policy: no-referrer` on `/track/*` |
| POST   | `/api/orders/[token]/cancel` | B               | `CancelOrderRequest` `{ reason }`                                                                                                                                                            | `Order`                                                                                                 | `TOO_LATE_TO_CANCEL` (only while `placed`), `NOT_FOUND`, `RATE_LIMITED`                                                                                                                                                                                                             | Per IP + token                                       |
| GET    | `/api/orders/mine`           | B               | —                                                                                                                                                                                            | `Order[]`                                                                                               | `UNAUTHENTICATED`, `RATE_LIMITED`                                                                                                                                                                                                                                                   | Per customer                                         |

## Payments (§3.1, §4.3)

| Method   | Path                                   | Caller            | Request                                                                        | Response                                                                                                   | Errors                                                                   | Notes                                           |
| -------- | -------------------------------------- | ----------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| POST     | `/api/payments/[provider]/initiate` 🔑 | B                 | `PaymentInitiateRequest` `{ orderToken }`; provider: `jazzcash` \| `easypaisa` | `PaymentInitiation` (signed redirect form, `expiresAt` = 15 min). Reuses the pending payment if one exists | `INVALID_TRANSITION`, `NOT_FOUND`, `IN_PROGRESS`, `IDEMPOTENCY_CONFLICT` | Behind `ALLOW_ONLINE_PAYMENTS` (`lib/flags.ts`) |
| GET/POST | `/api/payments/[provider]/return`      | Gateway → browser | Gateway fields                                                                 | 302 → `/track/[token]?payment=return` ("confirming…"). **Never marks paid**                                | —                                                                        | —                                               |

The order becomes paid only via webhook → outbox `payment.verify` → inquiry API. Expired payments go to `expired`. A late success after expiry goes back to `placed` if the items are still available (§4.3 step 8).

## Bookings **ADDITION** (§A2)

| Method | Path                    | Caller | Request                                                                       | Response                     | Errors                                                                                                                            | Rate limit                        |
| ------ | ----------------------- | ------ | ----------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| POST   | `/api/bookings` 🔑🤖    | B      | `BookingRequest` (type, eventId, date, time, guests 1–200, name, phone, note) | `Booking` (201, `requested`) | `EVENT_FULL`, `NOT_FOUND` (event), `VALIDATION_FAILED`, `TURNSTILE_FAILED`, `RATE_LIMITED`, `IN_PROGRESS`, `IDEMPOTENCY_CONFLICT` | **Per phone (3/hour) and per IP** |
| GET    | `/api/bookings/[token]` | B, RT  | —                                                                             | `Booking`                    | `NOT_FOUND`                                                                                                                       | Per IP                            |

## Realtime (§2.3, §4.6)

Interface: `lib/realtime`. The transport today is Server-Sent Events (served by MSW); the backend phase moves to Supabase broadcast. Every subscription falls back to **polling every 12 s** and re-polls when the tab becomes visible.

| Stream                                    | Function             | Payload                                                          | Polling fallback                 |
| ----------------------------------------- | -------------------- | ---------------------------------------------------------------- | -------------------------------- |
| `/api/realtime/orders/[token]`            | `subscribeToOrder`   | `OrderRealtimeEvent` (status, payment status, ETAs only)         | `GET /api/orders/track/[token]`  |
| `/api/realtime/bookings/[token]` ADDITION | `subscribeToBooking` | `Booking`                                                        | `GET /api/bookings/[token]`      |
| `/api/realtime/kitchen`                   | `subscribeToKitchen` | `KitchenEvent` `{ type: order.created \| order.updated, order }` | `GET /api/admin/orders?status=…` |
| `/api/realtime/menu`                      | `subscribeToMenu`    | `SoldOutEvent`                                                   | `GET /api/menu`                  |

## Webhooks (§3.2): backend only, not mocked

`POST /api/webhooks/jazzcash` · `POST /api/webhooks/easypaisa` · `GET|POST /api/webhooks/whatsapp` · `POST /api/webhooks/supabase` (menu cache refresh, shared secret). Pipeline: §4.4.

---

## Staff auth (§7)

| Method | Path                         | Roles     | Request                                   | Response                                                                                                     | Errors            | Rate limit     |
| ------ | ---------------------------- | --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------- | -------------- |
| POST   | `/api/admin/auth/login`      | —         | `StaffLoginRequest` `{ email, password }` | `StaffLoginResponse` `{ staff, next: ok \| verify_2fa \| enrol_2fa }`. Owner/manager without TOTP must enrol | `UNAUTHENTICATED` | Per IP + email |
| POST   | `/api/admin/auth/2fa/enrol`  | logged in | —                                         | `TwoFactorEnrolResponse` `{ otpauthUrl, secret }`                                                            | `UNAUTHENTICATED` | —              |
| POST   | `/api/admin/auth/2fa/verify` | logged in | `TwoFactorVerifyRequest` `{ code }`       | `Staff` (session now usable)                                                                                 | `OTP_INVALID`     | Per staff      |
| POST   | `/api/admin/auth/logout`     | any       | —                                         | `{ ok: true }`                                                                                               | —                 | —              |
| GET    | `/api/admin/me`              | any       | —                                         | `Staff`                                                                                                      | `UNAUTHENTICATED` | —              |

"Mgr" = owner or manager · "Front" = owner, manager, cashier · "All" = every staff role.

## Admin: orders

| Method | Path                                          | Roles            | Request                                                                                                                                                                  | Response                                                           | Errors                                                |
| ------ | --------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------- |
| GET    | `/api/admin/orders?status=&source=&from=&to=` | All              | `AdminOrderQuery`                                                                                                                                                        | `AdminOrder[]` (masked phones; `source` label)                     | `UNAUTHENTICATED`, `FORBIDDEN`                        |
| GET    | `/api/admin/orders/[id]`                      | All              | —                                                                                                                                                                        | `AdminOrder`                                                       | `NOT_FOUND`                                           |
| POST   | `/api/admin/orders/[id]/transition` 🔑        | per move (§4.2)  | `TransitionRequest` `{ to, version, note }`                                                                                                                              | `AdminOrder`. Same-status move = no-op success                     | `VERSION_CONFLICT`, `INVALID_TRANSITION`, `FORBIDDEN` |
| POST   | `/api/admin/orders/[id]/assign-rider`         | Front            | `AssignRiderRequest`                                                                                                                                                     | `AdminOrder`                                                       | `NOT_FOUND`, `INVALID_TRANSITION` (pickup)            |
| POST   | `/api/admin/orders/manual` 🔑 **ADDITION**    | Front (cashier+) | `ManualOrderRequest` (source: whatsapp \| phone \| walk_in \| foodpanda, customer, lines, fulfilment, addressId \| newAddress, paymentMethod, promo, note, scheduledFor) | `ManualOrderResponse` `{ order, publicToken, trackingPath }` (201) | Same rules as `/api/orders` (minus OTP/Turnstile)     |

## Rider PWA

| Method | Path                                            | Roles | Request                                                                          | Response                                                                     | Errors                                    |
| ------ | ----------------------------------------------- | ----- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| GET    | `/api/rider/assignments`                        | rider | —                                                                                | `RiderAssignment[]` (full phone only on the active order)                    | `FORBIDDEN`                               |
| POST   | `/api/rider/assignments/[orderId]/picked-up` 🔑 | rider | —                                                                                | `RiderAssignment` (order → `out_for_delivery`)                               | `INVALID_TRANSITION`, `NOT_FOUND`         |
| POST   | `/api/rider/assignments/[orderId]/delivered` 🔑 | rider | `DeliveredRequest` `{ cashCollected }` (must equal the COD total; 0 for prepaid) | `RiderAssignment` (order → `delivered`, `cash_collected_at`, `cash_in_hand`) | `VALIDATION_FAILED`, `INVALID_TRANSITION` |

## Admin: menu

| Method | Path                                  | Roles        | Request                                                                                                         | Response                                               | Errors              |
| ------ | ------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------- |
| GET    | `/api/admin/menu`                     | All          | —                                                                                                               | `Menu` (includes inactive)                             | —                   |
| POST   | `/api/admin/menu/items`               | Mgr          | `ItemInput`                                                                                                     | `Item` (201)                                           | `VALIDATION_FAILED` |
| PATCH  | `/api/admin/menu/items/[id]`          | Mgr          | `ItemPatch`                                                                                                     | `Item`                                                 | `NOT_FOUND`         |
| DELETE | `/api/admin/menu/items/[id]`          | Mgr          | —                                                                                                               | `Item` (soft-deactivated)                              | `NOT_FOUND`         |
| POST   | `/api/admin/menu/items/[id]/sold-out` | Mgr, kitchen | `SoldOutRequest`                                                                                                | `Item` (+ realtime `SoldOutEvent`, `menu` tag refresh) | `NOT_FOUND`         |
| POST   | `/api/admin/menu/categories`          | Mgr          | `CategoryInput`                                                                                                 | `Category` (201)                                       | `VALIDATION_FAILED` |
| PATCH  | `/api/admin/menu/categories/[id]`     | Mgr          | `CategoryPatch`                                                                                                 | `Category`                                             | `NOT_FOUND`         |
| POST   | `/api/admin/uploads`                  | Mgr          | `{ fileName, dataUrl }` (mock transport; real: multipart, 5 MB, MIME + signature check, re-encode, random name) | `UploadResponse` `{ path }`                            | `VALIDATION_FAILED` |

## Admin: store settings, hours, holidays, zones

| Method | Path                         | Roles | Request                                                     | Response                     | Errors              |
| ------ | ---------------------------- | ----- | ----------------------------------------------------------- | ---------------------------- | ------------------- |
| GET    | `/api/admin/settings`        | Mgr   | —                                                           | `StoreSettings`              | —                   |
| PATCH  | `/api/admin/settings`        | Mgr   | `StoreSettingsPatch`                                        | `StoreSettings`              | `VALIDATION_FAILED` |
| POST   | `/api/admin/settings/pause`  | Mgr   | `PauseRequest` `{ paused, reason }`                         | `StoreSettings`              | —                   |
| GET    | `/api/admin/hours`           | Mgr   | —                                                           | `OpeningHours[]`             | —                   |
| PUT    | `/api/admin/hours`           | Mgr   | `HoursRequest` `{ hours }` (closes < opens = past midnight) | `OpeningHours[]`             | `VALIDATION_FAILED` |
| GET    | `/api/admin/holidays`        | Mgr   | —                                                           | `Holiday[]`                  | —                   |
| POST   | `/api/admin/holidays`        | Mgr   | `Holiday` `{ date, note }`                                  | `Holiday[]` (201)            | `VALIDATION_FAILED` |
| DELETE | `/api/admin/holidays/[date]` | Mgr   | —                                                           | `Holiday[]`                  | —                   |
| GET    | `/api/admin/zones`           | Mgr   | —                                                           | `DeliveryZone[]`             | —                   |
| POST   | `/api/admin/zones`           | Mgr   | `ZoneInput`                                                 | `DeliveryZone` (201)         | `VALIDATION_FAILED` |
| PATCH  | `/api/admin/zones/[id]`      | Mgr   | `Partial<ZoneInput>`                                        | `DeliveryZone`               | `NOT_FOUND`         |
| DELETE | `/api/admin/zones/[id]`      | Mgr   | —                                                           | `DeliveryZone` (deactivated) | `NOT_FOUND`         |

## Admin: promos, customers, refunds, riders, reviews, reports, outbox

| Method | Path                                          | Roles | Request                                          | Response                                                                      | Errors                                               |
| ------ | --------------------------------------------- | ----- | ------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/admin/promos`                           | Mgr   | —                                                | `Promo[]`                                                                     | —                                                    |
| POST   | `/api/admin/promos`                           | Mgr   | `PromoInput`                                     | `Promo` (201)                                                                 | `VALIDATION_FAILED`                                  |
| PATCH  | `/api/admin/promos/[id]`                      | Mgr   | `Partial<PromoInput>`                            | `Promo`                                                                       | `NOT_FOUND`                                          |
| GET    | `/api/admin/customers?q=`                     | Mgr   | —                                                | `AdminCustomer[]` (masked phones)                                             | —                                                    |
| POST   | `/api/admin/customers/[id]/block`             | Mgr   | `BlockRequest` `{ reason }`                      | `AdminCustomer`                                                               | `NOT_FOUND`                                          |
| POST   | `/api/admin/customers/[id]/unblock`           | Mgr   | —                                                | `AdminCustomer`                                                               | `NOT_FOUND`                                          |
| POST   | `/api/admin/customers/[id]/anonymize`         | owner | —                                                | `AdminCustomer`                                                               | `FORBIDDEN`                                          |
| GET    | `/api/admin/refunds`                          | Mgr   | —                                                | `Refund[]`                                                                    | —                                                    |
| POST   | `/api/admin/refunds` 🔑                       | Mgr   | `RefundRequest` `{ orderToken, amount, reason }` | `Refund` (201, `requested`)                                                   | `VALIDATION_FAILED` (not paid online, amount > paid) |
| POST   | `/api/admin/refunds/[id]/approve`             | owner | —                                                | `Refund` (`approved`)                                                         | `FORBIDDEN`, `INVALID_TRANSITION`                    |
| POST   | `/api/admin/refunds/[id]/reject`              | Mgr   | —                                                | `Refund` (`rejected`)                                                         | `INVALID_TRANSITION`                                 |
| POST   | `/api/admin/refunds/[id]/mark-processed`      | Mgr   | —                                                | `Refund` (`processed`; gateway reversal done manually in the merchant portal) | `INVALID_TRANSITION`                                 |
| GET    | `/api/admin/riders`                           | Front | —                                                | `Staff[]` (role rider)                                                        | —                                                    |
| GET    | `/api/admin/riders/settlement`                | Mgr   | —                                                | `RiderSettlement[]` (open cash per rider)                                     | —                                                    |
| POST   | `/api/admin/riders/[id]/settle`               | Mgr   | —                                                | `RiderSettlement` (after marking settled)                                     | `NOT_FOUND`                                          |
| GET    | `/api/admin/reviews`                          | Mgr   | —                                                | `Review[]`                                                                    | —                                                    |
| PATCH  | `/api/admin/reviews/[id]`                     | Mgr   | `ReviewPatch` `{ isPublished }`                  | `Review`                                                                      | `NOT_FOUND`                                          |
| GET    | `/api/admin/reports/sales?from=&to=`          | Mgr   | —                                                | `SalesReport` (incl. `bySource`)                                              | —                                                    |
| GET    | `/api/admin/outbox?status=failed&status=dead` | Mgr   | —                                                | `OutboxItem[]`                                                                | —                                                    |
| POST   | `/api/admin/outbox/[id]/retry`                | Mgr   | —                                                | `OutboxItem` (back to `pending`)                                              | `INVALID_TRANSITION`                                 |

## Admin: bookings, deals, events **ADDITION**

| Method         | Path                          | Roles | Request                                                                          | Response                                             | Errors                            |
| -------------- | ----------------------------- | ----- | -------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| GET            | `/api/admin/bookings?status=` | Front | —                                                                                | `Booking[]`                                          | —                                 |
| PATCH          | `/api/admin/bookings/[token]` | Front | `BookingAction` (`confirm`, `decline` + reason, `complete`, `no_show`, `cancel`) | `Booking` (+ outbox WhatsApp/SMS on confirm/decline) | `INVALID_TRANSITION`, `NOT_FOUND` |
| GET / POST     | `/api/admin/deals`            | Mgr   | `DealInput`                                                                      | `Deal[]` / `Deal` (201)                              | `VALIDATION_FAILED`               |
| PATCH / DELETE | `/api/admin/deals/[id]`       | Mgr   | `Partial<DealInput>`                                                             | `Deal` / `{ ok: true }`                              | `NOT_FOUND`                       |
| GET / POST     | `/api/admin/events`           | Mgr   | `EventInput`                                                                     | `Event[]` / `Event` (201)                            | `VALIDATION_FAILED`               |
| PATCH / DELETE | `/api/admin/events/[id]`      | Mgr   | `Partial<EventInput>`                                                            | `Event` / `{ ok: true }`                             | `NOT_FOUND`                       |

---

## Mocks (§3.6 steps 2–3)

`NEXT_PUBLIC_USE_MOCKS=true` (in `.env.development`) starts MSW in the browser. Every endpoint above except the webhooks is mocked, and the mocks follow the backend rules (§4.1–4.3, §6, §7). State is saved to localStorage, so reloads and multiple tabs share it.

- **Scenarios:** `?scenario=<name>` or the floating dev panel. All 31 are listed with descriptions in `mocks/scenario.ts`: `happy`, `store_closed`, `paused`, `item_sold_out_mid_checkout`, `live_sold_out`, `outside_zone`, `below_min`, `cod_not_allowed`, `requires_otp`, `otp_rate_limited`, `preorder_invalid`, `slow_3g`, `network_fail`, `double_tap`, `idempotency_conflict`, `in_progress`, `duplicate_cart`, `payment_success`, `payment_fail`, `payment_pending_stuck`, `payment_expired`, `late_payment_success`, `order_rejected`, `auto_rejected`, `too_late_to_cancel`, `version_conflict`, `deals_demo`, `booking_confirmed`, `booking_declined`, `event_full`, `mixed_sources`.
- **Timer:** placed → accepted → preparing → ready → out_for_delivery → delivered (or ready → picked_up), ~8 s per step. Updates are pushed over the realtime streams, with polling as the fallback.
- **Test values:** OTP and staff TOTP `123456`. Staff password `barraf123` for `owner@` (TOTP enrolled), `manager@` (must enrol), `cashier@`, `kitchen@` and `rider@barrafpaani.test`. Mock-only promos `MOCK10`, `MOCKFLAT`, `MOCKSHIP` and `MOCKOLD` (expired).
- **Tests:** `pnpm test` covers the quote math, phone normalisation, and the idempotency behaviour, rules and scenarios above through the real handlers.
