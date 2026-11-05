# Barraf Paani — API contract

The frontend and backend meet here. **Schemas are the source of truth:** `lib/contracts/*.ts` (Zod + inferred types). This document lists every endpoint. The API client (`lib/api`) implements each one, and so do the mocks (`mocks/handlers`). When the real backend lands, any mismatch gets fixed **in the backend** (ARCHITECTURE §3.6).

## Conventions

- JSON in, JSON out. Money is **whole rupees** (integers). Timestamps are ISO 8601 with offset.
- Clients send **intent only** (ids, quantities, codes). Never prices, totals, fees or statuses.
- **Idempotency:** writes marked 🔑 require an `Idempotency-Key` header (UUID). The checkout generates it **when the screen opens** and reuses it on every retry. The request hash excludes `turnstileToken`.
  - Same key while still processing → `409 IN_PROGRESS` + `Retry-After: 2`
  - Same key, different body → `422 IDEMPOTENCY_CONFLICT`
  - Same key after success → the stored response is replayed (same status, same body)
- **Turnstile** (🤖): `turnstileToken` in the body (order and OTP only).
- **Auth:** customers = Supabase session cookie after phone OTP. Staff = session cookie after email + password (+ TOTP for owner/manager). Admin endpoints check the role on each call.
- **Tracking** URLs use the 32-char `token`, never the order number.
- **Caller** column: `SC` = Server Component read (cached), `B` = browser via TanStack Query / mutation, `RT` = realtime subscription.

## Errors

Every error response has the same body:

```json
{
  "code": "ITEM_SOLD_OUT",
  "message": "Fillet Fury just sold out.",
  "details": { "itemId": "itm_fillet-fury" }
}
```

| Code                                                              | HTTP | When                                                            | `details`                |
| ----------------------------------------------------------------- | ---- | --------------------------------------------------------------- | ------------------------ |
| `STORE_CLOSED`                                                    | 409  | Outside hours, holiday, or ordering paused                      | `opensAt`                |
| `ITEM_SOLD_OUT`                                                   | 409  | Item or variant unavailable                                     | `itemId`                 |
| `OUTSIDE_ZONE`                                                    | 422  | Pin not covered by any active zone                              | —                        |
| `BELOW_MIN_ORDER`                                                 | 422  | Below the larger of store and zone minimum                      | `minOrder`, `subtotal`   |
| `ADDRESS_NOT_FOUND`                                               | 404  | Address missing or not the customer's                           | —                        |
| `COD_NOT_ALLOWED`                                                 | 403  | Blocked, over COD cap, or pre-order > 2h out                    | —                        |
| `PREORDER_INVALID`                                                | 422  | Past, > 7 days out, or outside hours                            | —                        |
| `PROMO_INVALID` / `PROMO_EXPIRED` / `PROMO_LIMIT`                 | 422  | Promo checks failed                                             | `minOrder` (if relevant) |
| `TOO_LATE_TO_CANCEL`                                              | 409  | Order no longer `placed`                                        | `shopPhone`              |
| `RATE_LIMITED`                                                    | 429  | Too many requests (`Retry-After` header)                        | `retryAfter`             |
| `IDEMPOTENCY_CONFLICT`                                            | 422  | Key reused with a different body                                | —                        |
| `IN_PROGRESS`                                                     | 409  | Same key still processing (`Retry-After: 2`)                    | —                        |
| `PAYMENT_PENDING`                                                 | 402  | Payment not yet confirmed                                       | —                        |
| **Additions** (not in the architecture doc, needed by real flows) |      |                                                                 |                          |
| `VALIDATION_FAILED`                                               | 400  | Body fails the Zod schema / business validation                 | `issues` or field info   |
| `UNAUTHENTICATED`                                                 | 401  | No / expired session                                            | —                        |
| `FORBIDDEN`                                                       | 403  | Role not allowed                                                | —                        |
| `NOT_FOUND`                                                       | 404  | Unknown id / token                                              | —                        |
| `OTP_INVALID`                                                     | 422  | Wrong code                                                      | —                        |
| `OTP_EXPIRED`                                                     | 410  | Code older than 5 min                                           | —                        |
| `TURNSTILE_FAILED`                                                | 403  | Bot check failed                                                | —                        |
| `DUPLICATE_ORDER_SUSPECTED`                                       | 409  | Same cart + customer in the last 3 min (dedup matrix)           | `existingToken`          |
| `VERSION_CONFLICT`                                                | 409  | Optimistic lock failed on a transition                          | `current` (latest order) |
| `INVALID_TRANSITION`                                              | 422  | Move not allowed by the state machine                           | —                        |
| `INTERNAL_ERROR`                                                  | 500  | Unexpected failure                                              | —                        |
| `NETWORK_ERROR`                                                   | —    | **Client-only**: produced by `lib/api` when no response arrived | —                        |

The UI maps every code to English and Urdu copy under `errors.<CODE>` in `lib/i18n/messages`.

---

## Customer — public reads

| Method | Path                  | Caller             | Request | Response                    | Errors |
| ------ | --------------------- | ------------------ | ------- | --------------------------- | ------ |
| GET    | `/api/menu`           | SC (tag `menu`), B | —       | `Menu`                      | —      |
| GET    | `/api/store`          | SC, B              | —       | `StoreInfo`                 | —      |
| GET    | `/api/store/status`   | SC (~30 s), B      | —       | `StoreStatus`               | —      |
| GET    | `/api/delivery/zones` | B (map overlay)    | —       | `DeliveryZone[]` (active)   | —      |
| GET    | `/api/promos`         | SC, B (Deals)      | —       | `Promo[]` (active + public) | —      |

## Customer — quotes

| Method | Path                  | Caller | Request                               | Response        | Errors                                                                                                                                      |
| ------ | --------------------- | ------ | ------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/delivery/quote` | B      | `DeliveryQuoteRequest` `{ location }` | `DeliveryQuote` | `OUTSIDE_ZONE`, `VALIDATION_FAILED`                                                                                                         |
| POST   | `/api/cart/quote`     | B      | `QuoteRequest`                        | `Quote`         | `STORE_CLOSED`, `PREORDER_INVALID`, `ITEM_SOLD_OUT`, `OUTSIDE_ZONE`, `ADDRESS_NOT_FOUND`, `BELOW_MIN_ORDER`, `PROMO_*`, `VALIDATION_FAILED` |

## Customer — auth & profile

| Method | Path                       | Caller | Request                                           | Response                                                   | Errors                                                                       |
| ------ | -------------------------- | ------ | ------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| POST   | `/api/auth/otp/request` 🤖 | B      | `OtpRequest` `{ phone, channel, turnstileToken }` | `OtpRequestResponse`                                       | `RATE_LIMITED` (3 / phone / 10 min), `TURNSTILE_FAILED`, `VALIDATION_FAILED` |
| POST   | `/api/auth/otp/verify`     | B      | `OtpVerify` `{ phone, code }`                     | `OtpVerifyResponse` `{ customer, isNew }` + session cookie | `OTP_INVALID`, `OTP_EXPIRED`, `RATE_LIMITED`                                 |
| POST   | `/api/auth/logout`         | B      | —                                                 | `{ ok: true }`                                             | —                                                                            |
| GET    | `/api/me`                  | B      | —                                                 | `Customer`                                                 | `UNAUTHENTICATED`                                                            |
| PATCH  | `/api/me`                  | B      | `UpdateCustomerRequest`                           | `Customer`                                                 | `UNAUTHENTICATED`, `VALIDATION_FAILED`                                       |
| GET    | `/api/me/addresses`        | B      | —                                                 | `Address[]`                                                | `UNAUTHENTICATED`                                                            |
| POST   | `/api/me/addresses`        | B      | `AddressInput`                                    | `Address` (201)                                            | `UNAUTHENTICATED`, `OUTSIDE_ZONE`, `VALIDATION_FAILED`                       |
| DELETE | `/api/me/addresses/[id]`   | B      | —                                                 | `{ ok: true }`                                             | `UNAUTHENTICATED`, `ADDRESS_NOT_FOUND`                                       |

## Customer — orders

| Method | Path                         | Caller       | Request                           | Response                                               | Errors                                                                                                                                                                                                                                                               |
| ------ | ---------------------------- | ------------ | --------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/orders` 🔑🤖           | B            | `PlaceOrderRequest`               | `PlaceOrderResponse` `{ order }` (201, same on replay) | `UNAUTHENTICATED`, `STORE_CLOSED`, `PREORDER_INVALID`, `ITEM_SOLD_OUT`, `OUTSIDE_ZONE`, `ADDRESS_NOT_FOUND`, `BELOW_MIN_ORDER`, `COD_NOT_ALLOWED`, `PROMO_*`, `DUPLICATE_ORDER_SUSPECTED`, `TURNSTILE_FAILED`, `RATE_LIMITED`, `IN_PROGRESS`, `IDEMPOTENCY_CONFLICT` |
| GET    | `/api/orders/track/[token]`  | SC then RT/B | —                                 | `Order`                                                | `NOT_FOUND`, `RATE_LIMITED`                                                                                                                                                                                                                                          |
| POST   | `/api/orders/[token]/cancel` | B            | `CancelOrderRequest` `{ reason }` | `Order`                                                | `TOO_LATE_TO_CANCEL`, `NOT_FOUND`, `RATE_LIMITED`                                                                                                                                                                                                                    |
| GET    | `/api/orders/mine`           | B            | —                                 | `Order[]`                                              | `UNAUTHENTICATED`, `RATE_LIMITED`                                                                                                                                                                                                                                    |

Online payment orders are created as `pending_payment`; COD orders as `placed`. Cancel is allowed only while `placed`.

## Payments

| Method   | Path                                   | Caller            | Request                                                                       | Response                                                                                         | Errors                                                                   |
| -------- | -------------------------------------- | ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| POST     | `/api/payments/[provider]/initiate` 🔑 | B                 | `PaymentInitiateRequest` `{ orderToken }`; provider ∈ `jazzcash`, `easypaisa` | `PaymentInitiation` (signed redirect form). Returns the existing pending payment if there is one | `INVALID_TRANSITION`, `NOT_FOUND`, `IN_PROGRESS`, `IDEMPOTENCY_CONFLICT` |
| GET/POST | `/api/payments/[provider]/return`      | Gateway → browser | Gateway fields                                                                | 302 → `/track/[token]?payment=return` (page shows "confirming…"). **Never marks the order paid** | —                                                                        |

The order becomes paid only via the IPN webhook → outbox `payment.verify` → gateway inquiry API (ARCHITECTURE §4.3). The tracking page watches `paymentStatus` (`pending` → `paid` / `failed`) over realtime.

## Realtime (Server-Sent Events today, Supabase broadcast later)

Interface: `lib/realtime` (`subscribeToOrder`, `subscribeToKitchen`, `subscribeToMenu`). Each subscription falls back to **polling every 12 s** if the stream errors, and re-polls when the tab becomes visible.

| Stream                         | Caller        | Event payload                                                                | Polling fallback                 |
| ------------------------------ | ------------- | ---------------------------------------------------------------------------- | -------------------------------- |
| `/api/realtime/orders/[token]` | RT (tracking) | `OrderRealtimeEvent` (status + ETA only)                                     | `GET /api/orders/track/[token]`  |
| `/api/realtime/kitchen`        | RT (staff)    | `KitchenEvent` `{ type: order.created \| order.updated, order: AdminOrder }` | `GET /api/admin/orders?status=…` |
| `/api/realtime/menu`           | RT (menu)     | `SoldOutEvent`                                                               | `GET /api/menu`                  |

## Webhooks (backend only, no frontend caller)

`POST /api/webhooks/jazzcash` · `POST /api/webhooks/easypaisa` · `GET|POST /api/webhooks/whatsapp` · `POST /api/webhooks/supabase` (menu cache refresh, shared secret). See ARCHITECTURE §4.4.

---

## Admin (role-gated; caller = admin / kitchen PWA in the browser)

Roles: `owner`, `manager`, `kitchen`, `cashier`, `rider`. "Mgr" = owner or manager.

### Auth

| Method | Path                     | Roles | Request                      | Response                                     | Errors                            |
| ------ | ------------------------ | ----- | ---------------------------- | -------------------------------------------- | --------------------------------- |
| POST   | `/api/admin/auth/login`  | —     | `AdminLoginRequest`          | `AdminLoginResponse` `{ user, requires2fa }` | `UNAUTHENTICATED`, `RATE_LIMITED` |
| POST   | `/api/admin/auth/2fa`    | —     | `Admin2faRequest` `{ code }` | `AdminUser`                                  | `OTP_INVALID`, `UNAUTHENTICATED`  |
| POST   | `/api/admin/auth/logout` | any   | —                            | `{ ok: true }`                               | —                                 |
| GET    | `/api/admin/me`          | any   | —                            | `AdminUser`                                  | `UNAUTHENTICATED`                 |

### Orders

| Method | Path                                          | Roles        | Request                                     | Response                                       | Errors                                                |
| ------ | --------------------------------------------- | ------------ | ------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| GET    | `/api/admin/orders?status=&status=&from=&to=` | all          | `AdminOrderQuery` (query)                   | `AdminOrder[]`                                 | `UNAUTHENTICATED`, `FORBIDDEN`                        |
| GET    | `/api/admin/orders/[id]`                      | all          | —                                           | `AdminOrder`                                   | `NOT_FOUND`                                           |
| POST   | `/api/admin/orders/[id]/transition` 🔑        | per move     | `TransitionRequest` `{ to, version, note }` | `AdminOrder`. Same-status move = no-op success | `VERSION_CONFLICT`, `INVALID_TRANSITION`, `FORBIDDEN` |
| POST   | `/api/admin/orders/[id]/assign-rider`         | Mgr, cashier | `AssignRiderRequest`                        | `AdminOrder`                                   | `NOT_FOUND`                                           |

Allowed moves: `ORDER_TRANSITIONS` in `lib/contracts/order.ts` (= ARCHITECTURE §4.2). `out_for_delivery` is delivery-only and `picked_up` pickup-only. Phones are masked except for the rider's active order.

### Menu

| Method | Path                                  | Roles        | Request                                                                                            | Response                           | Errors                           |
| ------ | ------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------- |
| GET    | `/api/admin/menu`                     | all          | —                                                                                                  | `Menu` (includes inactive)         | —                                |
| POST   | `/api/admin/menu/items`               | Mgr          | `ItemInput`                                                                                        | `Item` (201)                       | `VALIDATION_FAILED`              |
| PATCH  | `/api/admin/menu/items/[id]`          | Mgr          | `ItemPatch`                                                                                        | `Item`                             | `NOT_FOUND`, `VALIDATION_FAILED` |
| DELETE | `/api/admin/menu/items/[id]`          | Mgr          | —                                                                                                  | `Item` (soft-deactivated)          | `NOT_FOUND`                      |
| POST   | `/api/admin/menu/items/[id]/sold-out` | Mgr, kitchen | `SoldOutRequest`                                                                                   | `Item` (+ realtime `SoldOutEvent`) | `NOT_FOUND`                      |
| POST   | `/api/admin/menu/categories`          | Mgr          | `CategoryInput`                                                                                    | `Category` (201)                   | `VALIDATION_FAILED`              |
| PATCH  | `/api/admin/menu/categories/[id]`     | Mgr          | `CategoryPatch`                                                                                    | `Category`                         | `NOT_FOUND`                      |
| POST   | `/api/admin/uploads`                  | Mgr          | `{ fileName, dataUrl }` (mock transport; real: multipart, 5 MB, MIME + signature check, re-encode) | `UploadResponse` `{ path }`        | `VALIDATION_FAILED`              |

### Store, zones, promos

| Method | Path                     | Roles | Request                             | Response                                | Errors              |
| ------ | ------------------------ | ----- | ----------------------------------- | --------------------------------------- | ------------------- |
| GET    | `/api/admin/store`       | Mgr   | —                                   | `StoreSettings` (incl. hours, holidays) | —                   |
| PATCH  | `/api/admin/store`       | Mgr   | `StoreSettingsPatch`                | `StoreSettings`                         | `VALIDATION_FAILED` |
| POST   | `/api/admin/store/pause` | Mgr   | `PauseRequest` `{ paused, reason }` | `StoreSettings`                         | —                   |
| GET    | `/api/admin/zones`       | Mgr   | —                                   | `DeliveryZone[]`                        | —                   |
| POST   | `/api/admin/zones`       | Mgr   | `ZoneInput`                         | `DeliveryZone` (201)                    | `VALIDATION_FAILED` |
| PATCH  | `/api/admin/zones/[id]`  | Mgr   | `Partial<ZoneInput>`                | `DeliveryZone`                          | `NOT_FOUND`         |
| DELETE | `/api/admin/zones/[id]`  | Mgr   | —                                   | `DeliveryZone` (deactivated)            | `NOT_FOUND`         |
| GET    | `/api/admin/promos`      | Mgr   | —                                   | `AdminPromo[]`                          | —                   |
| POST   | `/api/admin/promos`      | Mgr   | `PromoInput`                        | `AdminPromo` (201)                      | `VALIDATION_FAILED` |
| PATCH  | `/api/admin/promos/[id]` | Mgr   | `Partial<PromoInput>`               | `AdminPromo`                            | `NOT_FOUND`         |

### Customers, refunds, riders, reports, notifications

| Method | Path                                     | Roles        | Request                                          | Response                                                         | Errors                            |
| ------ | ---------------------------------------- | ------------ | ------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------- |
| GET    | `/api/admin/customers?q=`                | Mgr          | —                                                | `AdminCustomer[]` (masked phones)                                | —                                 |
| POST   | `/api/admin/customers/[id]/block`        | Mgr          | `BlockRequest` `{ reason }`                      | `AdminCustomer`                                                  | `NOT_FOUND`                       |
| POST   | `/api/admin/customers/[id]/unblock`      | Mgr          | —                                                | `AdminCustomer`                                                  | `NOT_FOUND`                       |
| POST   | `/api/admin/customers/[id]/anonymize`    | owner        | —                                                | `AdminCustomer`                                                  | `FORBIDDEN`, `NOT_FOUND`          |
| GET    | `/api/admin/refunds`                     | Mgr          | —                                                | `Refund[]`                                                       | —                                 |
| POST   | `/api/admin/refunds` 🔑                  | Mgr          | `RefundRequest` `{ orderToken, amount, reason }` | `Refund` (201, `requested`)                                      | `VALIDATION_FAILED`, `NOT_FOUND`  |
| POST   | `/api/admin/refunds/[id]/approve`        | owner        | —                                                | `Refund`                                                         | `FORBIDDEN`, `INVALID_TRANSITION` |
| POST   | `/api/admin/refunds/[id]/reject`         | Mgr          | —                                                | `Refund`                                                         | `INVALID_TRANSITION`              |
| POST   | `/api/admin/refunds/[id]/mark-processed` | Mgr          | —                                                | `Refund` (gateway reversal done manually in the merchant portal) | `INVALID_TRANSITION`              |
| GET    | `/api/admin/riders`                      | Mgr, cashier | —                                                | `Rider[]`                                                        | —                                 |
| GET    | `/api/admin/riders/settlement`           | Mgr          | —                                                | `RiderSettlement[]`                                              | —                                 |
| POST   | `/api/admin/riders/[id]/settle`          | Mgr          | —                                                | `RiderSettlement` (after marking settled)                        | `NOT_FOUND`                       |
| GET    | `/api/admin/reports/sales?from=&to=`     | Mgr          | —                                                | `SalesReport`                                                    | —                                 |
| GET    | `/api/admin/notifications/failed`        | Mgr          | —                                                | `FailedNotification[]`                                           | —                                 |
| POST   | `/api/admin/notifications/[id]/retry`    | Mgr          | —                                                | `FailedNotification`                                             | `NOT_FOUND`                       |

---

## Mocks

`NEXT_PUBLIC_USE_MOCKS=true` (set in `.env.development`) starts MSW in the browser. Every endpoint above is mocked, with state saved to localStorage so that reloads and multiple tabs share it.

- **Scenarios:** `?scenario=<name>` or the floating dev panel: `happy`, `store_closed`, `item_sold_out_mid_checkout` (Fillet Fury sells out after the first quote), `outside_zone`, `slow_3g` (1.5–3 s latency), `network_fail` (every 3rd request fails), `double_tap` (1.5 s order latency so a second tap gets `IN_PROGRESS` and later replays), `payment_success`, `payment_fail`, `payment_pending_stuck`.
- **Order timer:** placed → accepted → preparing → ready → out_for_delivery → delivered (customer-visible stages each ~8 s), pushed over the realtime stream with the polling fallback.
- **Test values:** OTP and staff 2FA `123456`; staff password `barraf123`; staff emails `owner@ / manager@ / kitchen@barrafpaani.test`; promo `MOCK10` (mock-only).
- **Self-check:** `pnpm check:mocks` runs the handlers in Node against `lib/api` and asserts the flows above.
