# Barraf Paani — Backend handoff

What the backend phase (ARCHITECTURE §12, "Backend phase") must provide so the mocks can be switched off (`NEXT_PUBLIC_USE_MOCKS=false`) with **zero UI changes**.

- **Source of truth:** the Zod schemas in `lib/contracts/*.ts`. Schema names below are exports from `@/lib/contracts`. Each field has a comment naming its snake_case column (§5).
- **Every client call:** `lib/api/index.ts`. Detail per endpoint (request fields, rate limits): `docs/API_CONTRACT.md`.
- **Reference behaviour:** `mocks/handlers/customer.ts`, `mocks/handlers/admin.ts`, `mocks/db.ts`. If the backend and the mocks disagree, the backend changes (§3.6 step 5).
- `§n` = `docs/ARCHITECTURE.md`; `§An` = `docs/ARCHITECTURE_ADDITIONS.md`. Items not covered by either are listed in [Not yet in ARCHITECTURE.md](#not-yet-in-architecturemd).

Roles: **Mgr** = owner, manager · **Front** = owner, manager, cashier · **All** = every staff role. Every error body is `ApiErrorBody` `{ code, message, details? }` with the HTTP status from `ERROR_STATUS` and the typed `details` from `ErrorDetails` (`lib/contracts/common.ts`, §3.5, §A5).

---

## 1. Endpoints

🔑 = `Idempotency-Key` header required (§2.4, §4.1). 🤖 = Turnstile token in the body (`turnstileToken`, excluded from the request hash).

### 1.1 Customer: public reads and quotes (§3.1, §2.3)

| Method | Path                  | Request                | Response        | Errors                                                                                                                                      | Notes                              |
| ------ | --------------------- | ---------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| GET    | `/api/menu`           | —                      | `Menu`          | —                                                                                                                                           | Cache tag `menu`                   |
| GET    | `/api/store/status`   | —                      | `StoreStatus`   | —                                                                                                                                           | ~30 s cache                        |
| GET    | `/api/deals-events`   | —                      | `DealsEvents`   | —                                                                                                                                           | Cache tag `menu` (§A2.4)           |
| POST   | `/api/delivery/quote` | `DeliveryQuoteRequest` | `DeliveryQuote` | `OUTSIDE_ZONE`, `VALIDATION_FAILED`                                                                                                         | `resolve_zone` (§5.9)              |
| POST   | `/api/cart/quote`     | `QuoteRequest`         | `Quote`         | `STORE_CLOSED`, `PREORDER_INVALID`, `ITEM_SOLD_OUT`, `OUTSIDE_ZONE`, `ADDRESS_NOT_FOUND`, `BELOW_MIN_ORDER`, `PROMO_*`, `VALIDATION_FAILED` | Must carry `requiresOtp` and `cod` |

### 1.2 Customer: auth, profile, contact (§3.1, §7, §A5)

| Method | Path                       | Request                 | Response                                      | Errors                                                                   |
| ------ | -------------------------- | ----------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| POST   | `/api/auth/otp/request` 🤖 | `OtpRequest`            | `OtpRequestResponse`                          | `RATE_LIMITED` (3/phone/10 min), `TURNSTILE_FAILED`, `VALIDATION_FAILED` |
| POST   | `/api/auth/otp/verify`     | `OtpVerify`             | `OtpVerifyResponse` + Supabase session cookie | `OTP_INVALID`, `OTP_EXPIRED`, `RATE_LIMITED`                             |
| POST   | `/api/auth/logout`         | —                       | `{ ok: true }`                                | —                                                                        |
| GET    | `/api/me`                  | —                       | `Customer`                                    | `UNAUTHENTICATED`                                                        |
| PATCH  | `/api/me`                  | `UpdateCustomerRequest` | `Customer`                                    | `UNAUTHENTICATED`, `VALIDATION_FAILED`                                   |
| GET    | `/api/me/addresses`        | —                       | `Address[]`                                   | `UNAUTHENTICATED`                                                        |
| POST   | `/api/me/addresses`        | `AddressInput`          | `Address` (201)                               | `UNAUTHENTICATED`, `VALIDATION_FAILED`                                   |
| PATCH  | `/api/me/addresses/[id]`   | `AddressPatch`          | `Address`                                     | `ADDRESS_NOT_FOUND`, `VALIDATION_FAILED`                                 |
| DELETE | `/api/me/addresses/[id]`   | —                       | `{ ok: true }`                                | `ADDRESS_NOT_FOUND`                                                      |
| POST   | `/api/contact` 🤖          | `ContactRequest`        | `ContactResponse` (201)                       | `TURNSTILE_FAILED`, `RATE_LIMITED`, `VALIDATION_FAILED`                  |

### 1.3 Customer: orders (§3.1, §4.1, §6)

| Method | Path                              | Request              | Response                   | Errors                                                                                                                                                                                                                                                                                |
| ------ | --------------------------------- | -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/orders` 🔑🤖                | `PlaceOrderRequest`  | `PlaceOrderResponse` (201) | `UNAUTHENTICATED` (`otp_required`), `STORE_CLOSED`, `PREORDER_INVALID`, `ITEM_SOLD_OUT`, `OUTSIDE_ZONE`, `ADDRESS_NOT_FOUND`, `BELOW_MIN_ORDER`, `COD_NOT_ALLOWED`, `PROMO_*`, `DUPLICATE_ORDER_SUSPECTED`, `TURNSTILE_FAILED`, `RATE_LIMITED`, `IN_PROGRESS`, `IDEMPOTENCY_CONFLICT` |
| GET    | `/api/orders/track/[token]`       | —                    | `Order`                    | `NOT_FOUND`, `RATE_LIMITED`                                                                                                                                                                                                                                                           |
| POST   | `/api/orders/[token]/cancel`      | `CancelOrderRequest` | `Order`                    | `TOO_LATE_TO_CANCEL` (not `placed`), `NOT_FOUND`, `RATE_LIMITED`                                                                                                                                                                                                                      |
| POST   | `/api/orders/[token]/review`      | `ReviewRequest`      | `Order`                    | `INVALID_TRANSITION` (not finished / already reviewed), `NOT_FOUND`, `VALIDATION_FAILED`                                                                                                                                                                                              |
| GET    | `/api/orders/mine?cursor=&limit=` | —                    | `OrdersPage`               | `UNAUTHENTICATED`, `RATE_LIMITED`                                                                                                                                                                                                                                                     |

### 1.4 Payments (§4.3) and bookings (§A2)

| Method   | Path                                   | Request                  | Response                     | Errors                                                                                                                    |
| -------- | -------------------------------------- | ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| POST     | `/api/payments/[provider]/initiate` 🔑 | `PaymentInitiateRequest` | `PaymentInitiation`          | `INVALID_TRANSITION`, `NOT_FOUND`, `IN_PROGRESS`, `IDEMPOTENCY_CONFLICT`                                                  |
| GET/POST | `/api/payments/[provider]/return`      | gateway fields           | 302 → `/pay/return?token=…`  | —                                                                                                                         |
| POST     | `/api/bookings` 🔑🤖                   | `BookingRequest`         | `Booking` (201, `requested`) | `EVENT_FULL`, `NOT_FOUND`, `VALIDATION_FAILED`, `TURNSTILE_FAILED`, `RATE_LIMITED`, `IN_PROGRESS`, `IDEMPOTENCY_CONFLICT` |
| GET      | `/api/bookings/[token]`                | —                        | `Booking`                    | `NOT_FOUND`                                                                                                               |

Webhooks (`/api/webhooks/jazzcash|easypaisa|whatsapp|supabase`) are backend-only and not mocked (§3.2, §4.4).

### 1.5 Staff auth (§7)

| Method | Path                         | Roles     | Request                  | Response                 | Errors            |
| ------ | ---------------------------- | --------- | ------------------------ | ------------------------ | ----------------- |
| POST   | `/api/admin/auth/login`      | —         | `StaffLoginRequest`      | `StaffLoginResponse`     | `UNAUTHENTICATED` |
| POST   | `/api/admin/auth/2fa/enrol`  | logged in | —                        | `TwoFactorEnrolResponse` | `UNAUTHENTICATED` |
| POST   | `/api/admin/auth/2fa/verify` | logged in | `TwoFactorVerifyRequest` | `Staff`                  | `OTP_INVALID`     |
| POST   | `/api/admin/auth/logout`     | any       | —                        | `{ ok: true }`           | —                 |
| GET    | `/api/admin/me`              | any       | —                        | `Staff`                  | `UNAUTHENTICATED` |

### 1.6 Admin orders and rider PWA (§4.2, §A1)

| Method | Path                                            | Roles                    | Request                          | Response                    | Errors                                                                     |
| ------ | ----------------------------------------------- | ------------------------ | -------------------------------- | --------------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/admin/orders`                             | All                      | `AdminOrderQuery` (query string) | `AdminOrder[]`              | `UNAUTHENTICATED`, `FORBIDDEN`                                             |
| GET    | `/api/admin/orders/[id]`                        | All                      | —                                | `AdminOrder`                | `NOT_FOUND`                                                                |
| POST   | `/api/admin/orders/[id]/transition` 🔑          | per move (`canRoleMove`) | `TransitionRequest`              | `AdminOrder`                | `VERSION_CONFLICT`, `INVALID_TRANSITION`, `FORBIDDEN`, `VALIDATION_FAILED` |
| POST   | `/api/admin/orders/[id]/assign-rider`           | Front                    | `AssignRiderRequest`             | `AdminOrder`                | `NOT_FOUND`, `INVALID_TRANSITION` (pickup)                                 |
| POST   | `/api/admin/orders/manual` 🔑                   | Front                    | `ManualOrderRequest`             | `ManualOrderResponse` (201) | Same as `/api/orders` minus OTP/Turnstile                                  |
| GET    | `/api/rider/assignments`                        | rider                    | —                                | `RiderAssignment[]`         | `FORBIDDEN`                                                                |
| POST   | `/api/rider/assignments/[orderId]/picked-up` 🔑 | rider                    | `{}`                             | `RiderAssignment`           | `INVALID_TRANSITION`, `NOT_FOUND`                                          |
| POST   | `/api/rider/assignments/[orderId]/delivered` 🔑 | rider                    | `DeliveredRequest`               | `RiderAssignment`           | `VALIDATION_FAILED`, `INVALID_TRANSITION`                                  |

### 1.7 Admin menu, settings, hours, holidays, zones (§5.2, §5.3)

| Method | Path                                   | Roles        | Request                                                        | Response                     | Errors                           |
| ------ | -------------------------------------- | ------------ | -------------------------------------------------------------- | ---------------------------- | -------------------------------- |
| GET    | `/api/admin/menu`                      | All          | —                                                              | `Menu` (incl. inactive)      | —                                |
| POST   | `/api/admin/menu/items`                | Mgr          | `ItemInput`                                                    | `Item` (201)                 | `VALIDATION_FAILED`              |
| PATCH  | `/api/admin/menu/items/[id]`           | Mgr          | `ItemPatch`                                                    | `Item`                       | `NOT_FOUND`                      |
| DELETE | `/api/admin/menu/items/[id]`           | Mgr          | —                                                              | `Item` (soft-deactivated)    | `NOT_FOUND`                      |
| POST   | `/api/admin/menu/items/[id]/sold-out`  | Mgr, kitchen | `SoldOutRequest`                                               | `Item`                       | `NOT_FOUND`                      |
| PATCH  | `/api/admin/menu/modifier-groups/[id]` | Mgr          | `ModifierGroupPatch`                                           | `ModifierGroup`              | `NOT_FOUND`, `VALIDATION_FAILED` |
| POST   | `/api/admin/menu/categories`           | Mgr          | `CategoryInput`                                                | `Category` (201)             | `VALIDATION_FAILED`              |
| PATCH  | `/api/admin/menu/categories/[id]`      | Mgr          | `CategoryPatch`                                                | `Category`                   | `NOT_FOUND`                      |
| POST   | `/api/admin/uploads`                   | Mgr          | `{ fileName, dataUrl }` (switch to multipart; §7 upload rules) | `UploadResponse`             | `VALIDATION_FAILED`              |
| GET    | `/api/admin/settings`                  | **All**      | —                                                              | `StoreSettings`              | —                                |
| PATCH  | `/api/admin/settings`                  | **owner**    | `StoreSettingsPatch`                                           | `StoreSettings`              | `VALIDATION_FAILED`              |
| POST   | `/api/admin/settings/pause`            | Mgr          | `PauseRequest`                                                 | `StoreSettings`              | —                                |
| GET    | `/api/admin/hours`                     | Mgr          | —                                                              | `OpeningHours[]`             | —                                |
| PUT    | `/api/admin/hours`                     | **owner**    | `HoursRequest`                                                 | `OpeningHours[]`             | `VALIDATION_FAILED`              |
| GET    | `/api/admin/holidays`                  | Mgr          | —                                                              | `Holiday[]`                  | —                                |
| POST   | `/api/admin/holidays`                  | **owner**    | `Holiday`                                                      | `Holiday[]` (201)            | `VALIDATION_FAILED`              |
| DELETE | `/api/admin/holidays/[date]`           | **owner**    | —                                                              | `Holiday[]`                  | —                                |
| GET    | `/api/admin/zones`                     | Mgr          | —                                                              | `DeliveryZone[]`             | —                                |
| POST   | `/api/admin/zones`                     | Mgr          | `ZoneInput`                                                    | `DeliveryZone` (201)         | `VALIDATION_FAILED`              |
| PATCH  | `/api/admin/zones/[id]`                | Mgr          | `Partial<ZoneInput>`                                           | `DeliveryZone`               | `NOT_FOUND`                      |
| DELETE | `/api/admin/zones/[id]`                | Mgr          | —                                                              | `DeliveryZone` (deactivated) | `NOT_FOUND`                      |

### 1.8 Admin promos, customers, refunds, riders, reviews, reports, outbox (§5.6, §5.7, §4.5)

| Method | Path                                     | Roles | Request                            | Response                           | Errors                                 |
| ------ | ---------------------------------------- | ----- | ---------------------------------- | ---------------------------------- | -------------------------------------- |
| GET    | `/api/admin/promos`                      | Mgr   | —                                  | `Promo[]`                          | —                                      |
| POST   | `/api/admin/promos`                      | Mgr   | `PromoInput`                       | `Promo` (201)                      | `VALIDATION_FAILED` (duplicate code)   |
| PATCH  | `/api/admin/promos/[id]`                 | Mgr   | `Partial<PromoInput>`              | `Promo`                            | `NOT_FOUND`                            |
| GET    | `/api/admin/customers?q=`                | Mgr   | —                                  | `AdminCustomer[]`                  | —                                      |
| GET    | `/api/admin/customers/lookup?phone=`     | Front | `phone`                            | `CustomerLookup`                   | `NOT_FOUND` (= new customer)           |
| POST   | `/api/admin/customers/[id]/cod`          | Mgr   | `CodAllowedRequest`                | `AdminCustomer`                    | `NOT_FOUND`                            |
| POST   | `/api/admin/customers/[id]/block`        | Mgr   | `BlockRequest`                     | `AdminCustomer`                    | `NOT_FOUND`                            |
| POST   | `/api/admin/customers/[id]/unblock`      | Mgr   | —                                  | `AdminCustomer`                    | `NOT_FOUND`                            |
| POST   | `/api/admin/customers/[id]/anonymize`    | owner | —                                  | `AdminCustomer`                    | `FORBIDDEN`, `NOT_FOUND`               |
| GET    | `/api/admin/refunds`                     | Mgr   | —                                  | `Refund[]`                         | —                                      |
| POST   | `/api/admin/refunds` 🔑                  | Mgr   | `RefundRequest`                    | `Refund` (201, `requested`)        | `VALIDATION_FAILED`, `NOT_FOUND`       |
| POST   | `/api/admin/refunds/[id]/approve`        | owner | —                                  | `Refund`                           | `FORBIDDEN`, `INVALID_TRANSITION`      |
| POST   | `/api/admin/refunds/[id]/reject`         | Mgr   | —                                  | `Refund`                           | `INVALID_TRANSITION`                   |
| POST   | `/api/admin/refunds/[id]/mark-processed` | Mgr   | —                                  | `Refund`                           | `INVALID_TRANSITION`                   |
| GET    | `/api/admin/riders`                      | Front | —                                  | `Staff[]` (riders, incl. inactive) | —                                      |
| PATCH  | `/api/admin/riders/[id]`                 | Mgr   | `RiderPatch`                       | `Staff`                            | `NOT_FOUND`                            |
| GET    | `/api/admin/riders/settlement`           | Mgr   | —                                  | `RiderSettlement[]`                | —                                      |
| POST   | `/api/admin/riders/[id]/settle`          | Mgr   | —                                  | `RiderSettlement`                  | `NOT_FOUND`                            |
| GET    | `/api/admin/reviews`                     | Mgr   | —                                  | `Review[]`                         | —                                      |
| PATCH  | `/api/admin/reviews/[id]`                | Mgr   | `ReviewPatch`                      | `Review`                           | `NOT_FOUND`                            |
| GET    | `/api/admin/reports/sales?from=&to=`     | Mgr   | —                                  | `SalesReport`                      | —                                      |
| GET    | `/api/admin/outbox?status=…`             | Mgr   | repeated `status` (`OutboxStatus`) | `OutboxItem[]`                     | —                                      |
| POST   | `/api/admin/outbox/[id]/retry`           | Mgr   | —                                  | `OutboxItem`                       | `INVALID_TRANSITION` (not failed/dead) |

### 1.9 Admin bookings, deals, events (§A2)

| Method         | Path                          | Roles     | Request               | Response                 | Errors                            |
| -------------- | ----------------------------- | --------- | --------------------- | ------------------------ | --------------------------------- |
| GET            | `/api/admin/bookings?status=` | Front     | —                     | `Booking[]`              | —                                 |
| PATCH          | `/api/admin/bookings/[token]` | Front     | `BookingAction`       | `Booking`                | `INVALID_TRANSITION`, `NOT_FOUND` |
| GET / POST     | `/api/admin/deals`            | Mgr       | `DealInput`           | `Deal[]` / `Deal` (201)  | `VALIDATION_FAILED`               |
| PATCH / DELETE | `/api/admin/deals/[id]`       | Mgr       | `Partial<DealInput>`  | `Deal` / `{ ok: true }`  | `NOT_FOUND`                       |
| GET            | `/api/admin/events`           | **Front** | —                     | `Event[]`                | —                                 |
| POST           | `/api/admin/events`           | Mgr       | `EventInput`          | `Event` (201)            | `VALIDATION_FAILED`               |
| PATCH / DELETE | `/api/admin/events/[id]`      | Mgr       | `Partial<EventInput>` | `Event` / `{ ok: true }` | `NOT_FOUND`                       |

---

## 2. Realtime (§2.3, §4.6)

`lib/realtime/index.ts` is the stable interface; today it opens an `EventSource` on the URLs in `streamUrls` (`lib/api/index.ts`). Backend phase: swap `openStream`/`subscribe` internals for Supabase broadcast channels. Payloads must parse with these schemas. On any error the client **already polls every 12 s** (and re-polls when the tab becomes visible), so realtime is an optimisation, not a dependency.

| Subscription         | Channel (suggested)            | Payload                                                                      | Polling fallback                                                |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `subscribeToOrder`   | one per tracking `publicToken` | `OrderRealtimeEvent` (status, paymentStatus, ETAs only; §4.6)                | `GET /api/orders/track/[token]`                                 |
| `subscribeToBooking` | one per booking `publicToken`  | `Booking`                                                                    | `GET /api/bookings/[token]`                                     |
| `subscribeToKitchen` | staff orders                   | `KitchenEvent` `{ type: order.created \| order.updated, order: AdminOrder }` | `GET /api/admin/orders?status=placed&…&status=out_for_delivery` |
| `subscribeToMenu`    | menu                           | `SoldOutEvent`                                                               | `GET /api/menu`                                                 |

**Staff payload is role-filtered.** `KitchenEvent.order.customer.phone` follows the phone visibility rule (section 6): the kitchen gets it masked, Front roles get it in full. The mock builds the event per viewer (`toAdminOrder(rec, sessionStaff())`). The backend must not broadcast one full-phone payload to everyone. Either use **one channel per audience** (front / kitchen), or broadcast **id-only events** and let each client refetch `GET /api/admin/orders/[id]` (the client already handles `order.created` vs `order.updated` by version).

Kitchen events: `order.created` is sent only for active orders (`placed`…`out_for_delivery`). Pre-orders are `placed` from the start; when the release job sets `released_at` it sends an `order.updated` so the board moves them from "scheduled" to the live queue (`features/admin/board.ts`).

---

## 3. Cache tags (§2.3)

| Read                | Next cache                             | Refreshed by                                                                                                                                                                                                |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/menu`         | tag `menu` (`features/menu/server.ts`) | `revalidateTag('menu')` on every menu write (items, categories, modifier groups), sold-out toggle, and deal/event write (§4.6, §A2.4). Via `/api/webhooks/supabase` (§3.2) or directly in the route handler |
| `/api/deals-events` | tag `menu`                             | Same as above                                                                                                                                                                                               |
| `/api/store/status` | `revalidate: 30`                       | Time only (~30 s). Pause/hours changes can take up to 30 s to show on server-rendered pages; the browser refetches                                                                                          |

`API_BASE_URL` (server env) points Server Component reads at the backend origin; it defaults to this app's own origin.

---

## 4. Payments: initiate and return (§4.3)

- `POST /api/payments/[provider]/initiate` is idempotent (🔑) and **reuses the existing pending payment** (one pending payment per order; `expiresAt` = 15 min). Only orders in `pending_payment` can initiate (`INVALID_TRANSITION` otherwise).
- `GET|POST /api/payments/[provider]/return` verifies the gateway hash and 302s to `/pay/return?token=…`. It **never marks the order paid**.
- `/pay/return` (`app/(site)/pay/return/page.tsx`) only reads the order status (`GET /api/orders/track/[token]` + realtime) and shows "Confirming payment…" until it changes.
- Paid only via webhook → outbox `payment.verify` → inquiry API → `transition_order(placed)` (§4.3 steps 4–6). Reconciler expires stale ones (`expired` / `payment_failed`).
- **Late success after expiry** (§4.3 step 8): items still available → back to `placed`. Otherwise mark the payment paid, create a `Refund` row with status `requested` (`requestedBy: system`) and enqueue `refund.requested` (dedup key `refund:<number>:late`). The mock does exactly this (`mocks/db.ts`, `late_payment_success` scenario).
- Online payments stay behind `NEXT_PUBLIC_ALLOW_ONLINE_PAYMENTS` and `StoreSettings.enabledPaymentMethods`.

---

## 5. Auth, sessions and roles (§7, §2.3)

**Customers.** Phone OTP → Supabase session cookie (`@supabase/ssr`, `sb-<ref>-auth-token`). `proxy.ts` already accepts that cookie name for `/account/*`; it also accepts the mock-only `bp_mock_session` marker, which can be removed. Every `/api/me*` and `/api/orders/mine` call is authorised by the server (`UNAUTHENTICATED` `reason: session`).

**Staff.** Email + password → `StaffLoginResponse.next`:

- `ok` → session usable.
- `verify_2fa` → owner/manager with TOTP enrolled: `POST /2fa/verify` with the 6-digit code.
- `enrol_2fa` → owner/manager without TOTP: `POST /2fa/enrol` returns `otpauthUrl`, `secret` and **8 `recoveryCodes`**, shown once after the first code verifies. Store hashes only.
- Until 2FA completes the session must not pass any role check (the mock's `staffPending`).

**Proxy.** `proxy.ts` currently reads the mock cookie `bp_mock_staff` (value = role) in `staffRole()`. Backend: verify the Supabase session JWT and read the role from **`app_metadata.staff_role`** (set by the server, not user-editable), and only once 2FA is satisfied (AAL2 for owner/manager). The proxy is a redirect hint; every API call re-checks the role.

**Section access** (`lib/admin-access.ts`, used by the proxy and the sidebar):

| Section                                                                                 | Roles                   |
| --------------------------------------------------------------------------------------- | ----------------------- |
| orders (incl. `/admin/orders/new`), bookings                                            | owner, manager, cashier |
| kitchen                                                                                 | owner, manager, kitchen |
| menu, deals, promos, zones, customers, refunds, riders, reviews, notifications, reports | owner, manager          |
| settings                                                                                | owner                   |
| rider                                                                                   | rider                   |

Role homes: owner/manager/cashier → `/admin/orders`, kitchen → `/admin/kitchen`, rider → `/admin/rider`.

**API role checks**: the Roles columns in section 1. Note the asymmetries the UI relies on: `GET /api/admin/settings` is All; settings PATCH, hours PUT and holidays POST/DELETE are owner only; `GET /api/admin/events` is Front; sold-out toggle includes kitchen; refund approve and customer anonymise are owner only.

**Order transitions by role** (`canRoleMove` / `allowedMoves` in `lib/contracts/admin.ts`, on top of `ORDER_TRANSITIONS`, §4.2). `transition_order` must enforce the same table:

| Role           | May move to                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| owner, manager | every allowed move (so cancelling from `accepted` is manager-only)                                      |
| cashier        | every allowed move except `cancelled`, which only from `placed` or `out_for_delivery` (failed delivery) |
| kitchen        | `accepted`, `rejected`, `preparing`, `ready`. Never cancels                                             |
| rider          | `out_for_delivery`, `delivered`, and `cancelled` from `out_for_delivery` (failed delivery)              |

Plus for everyone: no `out_for_delivery` on pickup orders, no `picked_up` on delivery orders. Not allowed by the state machine → `INVALID_TRANSITION`; allowed but not for the role → `FORBIDDEN`.

---

## 6. Mock behaviours the UI relies on

Each must be reproduced exactly. Reference implementation in brackets.

**Idempotency (§4.1, §6)** [`idempotent()` in `mocks/db.ts`]

- Same key + same body after success → replay the stored status and body.
- Same key still processing → `409 IN_PROGRESS`, `Retry-After: 2`, `details.retryAfter: 2`. `lib/api` retries with the same key up to 5 times.
- Same key + different body → `422 IDEMPOTENCY_CONFLICT`. Hash excludes `turnstileToken`.
- A failed attempt releases the key so it can be retried.
- Missing key on a 🔑 route → `VALIDATION_FAILED`.

**Ordering (§4.1, §6, §7)**

- `cart_hash` + same customer within 3 minutes → `409 DUPLICATE_ORDER_SUSPECTED` with `details.existingToken`; the client resends with `confirmDuplicate: true` to place anyway.
- `Quote.requiresOtp`: true when the phone has never been verified and the current session isn't that customer; placing a COD order then fails `401 UNAUTHENTICATED` `reason: otp_required`.
- `Quote.cod { allowed, reason }`: `blocked` (blocked or `cod_allowed = false`), `over_cap` (above `max_cod_value`), `preorder_too_far` (more than `preorder_cod_max_hours` out). Same check on place → `403 COD_NOT_ALLOWED` with `reason`.
- `Quote.total = subtotal + deliveryFee + tax + tip − discount` (schema refine).

**Transitions (§4.2)** [`/api/admin/orders/:id/transition`]

- Same-status move → 200 no-op, returns the order.
- Stale `version` → `409 VERSION_CONFLICT` with `details.currentVersion`.
- `rejected` / `cancelled` require `note` (schema refine → `VALIDATION_FAILED`); it becomes `cancelReason` and the customer sees it.
- `accepted` with `prepMinutes` (10/15/20/30, default 20): `estimatedReadyAt = now + prep`; delivery adds the zone's `etaMinutes` for `estimatedDeliveryAt`.
- `out_for_delivery → cancelled` (failed delivery) increments `failed_cod_count`; at 2 COD is disabled (§7).
- Every move writes an event with `actorType` and `actorName`, and broadcasts (section 2).

**Scheduled jobs (§9)** [`autoReject()` / `tick()` in `mocks/db.ts`]

- Manager alert at `manager_alert_minutes` (6) unaccepted → outbox `whatsapp.manager_alert` (dedup `order:<number>:manager_alert`).
- Auto-reject at `auto_reject_minutes` (8) → `rejected` with `actorType: system`, `actorName: 'auto-reject job'` (the report counts these as `autoRejectedCount`).
- Both counted from `released_at` for pre-orders, `created_at` otherwise.
- Pre-order release at `scheduled_for − preorder_release_minutes` (60): set `released_at` and broadcast `order.updated`. Until then the customer `Order.releasesAt` shows the release time and the board shows the order as scheduled (no alert, no auto-reject).

**`AdminOrder.callBack`** (§7 "flag far above usual size"): COD orders only; true when total ≥ 2.5 × the customer's average earlier order, or, for a first order, total ≥ Rs 5,000.

**Phone visibility (§7)** [`toAdminOrder()`]

| Viewer                                                  | `customer.phone` |
| ------------------------------------------------------- | ---------------- |
| owner, manager, cashier                                 | full E.164       |
| rider, on their own assignment while `out_for_delivery` | full E.164       |
| kitchen, rider otherwise                                | masked           |
| anyone, after the customer is anonymised                | `"—"`            |

`AdminCustomer.phone` is always masked. `CustomerLookup` returns the full phone (staff typed it). Customer `Order.rider` `{ name, phone }` only while `out_for_delivery`.

**Customers**

- `GET /api/admin/customers/lookup?phone=` → `404 NOT_FOUND` means "new customer"; the manual-order form continues with a blank profile. Anonymised customers are not found. `recentOrders` = newest 3.
- `POST …/cod` with `codAllowed: true` resets `failedCodCount` to 0.
- Anonymise: name null, phone shown as `"—"` on their orders, address snapshot `line1 = '•••'`, landmark and recipient cleared, order rows kept (§7).
- `AdminCustomer.lastOrderAt` = newest order `created_at`; `totalSpent` counts delivered/picked-up orders only.

**Riders and cash (§4.2, §5.7)**

- `delivered` requires `cashCollected` == order total for COD, 0 for prepaid; otherwise `VALIDATION_FAILED` (`details.field: cashCollected`, `due`). Sets `delivered_at`, `cash_in_hand`, `cash_collected_at`.
- `picked-up` → `out_for_delivery`. Both are idempotent and a repeat is a no-op.
- `GET /api/rider/assignments` returns the rider's own assignments that are `ready` or `out_for_delivery`, still hold unsettled cash, or were finished today (Asia/Karachi).
- Settlement: `openCash` = sum of `cash_in_hand` on unsettled assignments; `settle` marks them settled. Inactive riders (`PATCH isActive: false`) are excluded from assignment and settlement but still listed in `GET /api/admin/riders`.

**Refunds (§4.3, §13.2)**: managers request (paid online orders only; amount + earlier non-rejected refunds ≤ total), the owner approves (`FORBIDDEN` for managers), Mgr rejects or marks processed (only after approval). Processing sets `paymentStatus` to `refunded` or `partially_refunded`.

**Outbox (§4.5)**: list filters by repeated `status`. Retry is allowed only for `failed` / `dead` and resets to `pending`, `attempts = 0`, `lastError = null`, `nextAttemptAt = now`.

**Reports** (`SalesReport`): money and item figures (`orderCount`, `grossSales`, `discounts`, `deliveryFees`, `averageOrder`, `byPaymentMethod`, `bySource`, `byDay`, `byHour`, `byCategory`, `byFulfilment`, `topItems` top 10 by qty) count completed orders (`delivered` / `picked_up`). `allOrders`, `cancelledCount` (incl. failed deliveries), `rejectedCount`, `autoRejectedCount` and `bySourceByDay` count every order created in `[from, to]`. `bookingsConfirmed` = confirmed or completed bookings dated in the range. Hours and days are **Asia/Karachi**.

**StoreSettings additions**: `enabledPaymentMethods` (min 1; online still gated by the flag), `links { whatsapp, instagram, facebook, tiktok }` (null = "TBC"), `maintenanceMode`. `proxy.ts` reads `process.env.MAINTENANCE_MODE` today; the backend must feed `maintenanceMode` to the proxy without a redeploy (e.g. Vercel Edge Config, written when the owner PATCHes settings). Staff routes keep working in maintenance.

**Bookings (§A2.5)**: `transition_booking` moves; `EVENT_FULL` with `details.spotsLeft` under a row lock; date today or later in Asia/Karachi; outbox `whatsapp.booking_received` on create and `whatsapp.booking_<confirmed|declined>` on staff action.

---

## 7. Remove before go-live

- **`app/api/[...path]/route.ts`** is a mock-only bridge: it answers Server Component reads (and, with `MOCK_API=server`, browser calls) from the MSW handlers, and returns 204 on `/api/realtime/*` so the client polls. Delete it and replace it with real route handlers per endpoint. `MOCK_API=server` mode goes with it.
- `MOCK_SESSION_COOKIE` / `MOCK_STAFF_COOKIE` reads in `proxy.ts` (section 5).
- `instrumentation.ts` msw/node start and `components/dev/MswBootstrap.tsx` are inert once `NEXT_PUBLIC_USE_MOCKS=false`; they can stay for dev.

## 8. Security headers (§7, §A6)

- `next.config.ts` CSP `connect-src` must add the Supabase project hosts: `https://<ref>.supabase.co` and `wss://<ref>.supabase.co` (realtime). There is a `TODO(backend)` on that line.
- Replace the JazzCash/Easypaisa placeholder hosts in `form-action`.
- `script-src` uses `'unsafe-inline'` today. Backend-phase upgrade: per-request nonces generated in `proxy.ts`.

---

## Not yet in ARCHITECTURE.md

Everything here is agreed and built in the frontend, but `ARCHITECTURE.md` doesn't describe it. Build it with the same rules (§0, §4.1, §4.5).

**From `ARCHITECTURE_ADDITIONS.md`**

- **§A1 manual orders:** enum `order_source` (`website, whatsapp, phone, walk_in, foodpanda`); `orders.source order_source NOT NULL DEFAULT 'website'`; index `orders (source, created_at desc)`. `POST /api/admin/orders/manual` normalises the phone, finds or creates the customer, saves `newAddress`, then calls **`create_order` with `p_source` and `actor_type = 'staff'`** (`actor_id` = staff). **No OTP, no Turnstile**; rate limits, COD cap, blocklist and pre-order rules still apply. Never sets `whatsapp_opt_in`. Optional outbox `whatsapp.tracking_link` with consent.
- **§A2 deals, events, bookings:** enums `booking_type`, `booking_status`; tables `deals`, `deal_items`, `events`, `bookings` (columns, checks and indexes in §A2.3). **RLS:** public read of active deals and active events only; **no anon read of bookings** (only via the token endpoint `GET /api/bookings/[token]`); staff access via the server. Functions `create_booking` (capacity under event row lock → `EVENT_FULL`) and `transition_booking` (mirrors `transition_order`: allowed moves, idempotent repeat, event row, outbox in one transaction). Outbox topics `whatsapp.booking_received`, `whatsapp.booking_confirmed`, `whatsapp.booking_declined`, each with an `sms.*` fallback when the customer hasn't opted in. Booking rate limits **3 per phone per hour and per IP**. Retention: anonymise 1 year after the date. Daily pg_cron: flag past confirmed bookings with no outcome. Deal/event writes refresh tag `menu`.
- **§A3** `/llms.txt`, robots, JSON-LD, canonical facts (later `store_settings` + a `site_facts` row).
- **§A4 columns:** `categories.parent_id`, `categories.image_paths`, `item_variants.size` / `option`, `modifier_groups.name_ur`, `modifiers.name_ur`.
- **§A5 contract:** extra error codes, `Quote.requiresOtp` + `cod`, guest checkout (`QuoteRequest.phone`, `PlaceOrderRequest.customer`, `newAddress`), `/api/auth/logout`, `/api/me*`, staff auth + rider endpoints, hours/holidays/reviews/outbox admin endpoints, booking realtime channel.
- **§A6** security headers (section 8).

**Prompt-4 additions** (also marked ADDITION in `API_CONTRACT.md`)

| Addition                                                                                                                                                      | Where                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `GET /api/admin/customers/lookup?phone=` (Front, 404 = new)                                                                                                   | `CustomerLookup`                                    |
| `POST /api/admin/customers/[id]/cod` (Mgr)                                                                                                                    | `CodAllowedRequest` → `AdminCustomer`               |
| `PATCH /api/admin/riders/[id]` (Mgr)                                                                                                                          | `RiderPatch` → `Staff`                              |
| `PATCH /api/admin/menu/modifier-groups/[id]` (Mgr)                                                                                                            | `ModifierGroupPatch` → `ModifierGroup`              |
| `TransitionRequest.prepMinutes` + note required on reject/cancel                                                                                              | sets `estimated_ready_at` / `estimated_delivery_at` |
| `AdminOrder.callBack`                                                                                                                                         | §7 fraud flag, rule in section 6                    |
| `TwoFactorEnrolResponse.recoveryCodes` (8, hashed at rest)                                                                                                    | staff 2FA                                           |
| `StoreSettings.enabledPaymentMethods`, `links`, `maintenanceMode`                                                                                             | new `store_settings` columns                        |
| `SalesReport.allOrders`, `cancelledCount`, `rejectedCount`, `autoRejectedCount`, `bookingsConfirmed`, `byFulfilment`, `byHour`, `byCategory`, `bySourceByDay` | reports query                                       |
| `AdminOrderQuery.q` (BP number or phone digits), `customerId`                                                                                                 | `GET /api/admin/orders`                             |
| `AdminCustomer.lastOrderAt`                                                                                                                                   | customers list                                      |
| Role changes: settings GET All; settings PATCH, hours PUT, holidays POST/DELETE owner; events GET Front                                                       | section 5                                           |
| Role-filtered staff realtime                                                                                                                                  | section 2                                           |

## Phase 2 (not built)

Automatic WhatsApp ordering through a WhatsApp catalog or a bot on the existing WhatsApp Cloud API webhook (§4.4, §A1.4). Orders go through the same `create_order` with `source = 'whatsapp'`. Needs template approval, catalog sync from `menu_items`, a cart session per conversation, and an OTP-free trust rule (the WhatsApp number is already verified). No frontend change: the orders appear on the board with the WhatsApp label.
