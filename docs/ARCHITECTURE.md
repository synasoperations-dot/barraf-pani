# Barraf Paani — Technical Architecture

Online ordering website for Barraf Paani (Paradise City, Jhang).
Status: **planning phase**, no code yet. Build order: **frontend first (against a fixed API contract with mocks), then backend.**

---

## 0. Guiding rules

1. **The server is the source of truth.** Clients send intent only (item IDs, sizes, quantities, address ID, promo code). They never send prices, totals, fees or statuses.
2. **Money is whole rupees (integers).** Never floats.
3. **Two database functions own the order lifecycle.** `create_order` is the only way to insert an order. `transition_order` is the only way to change an order's status.
4. **All side effects go through the outbox.** WhatsApp, SMS, printer and refund jobs are written in the same transaction as the data change and sent asynchronously.
5. **Every write is idempotent, and every external event is deduplicated.**
6. **Contract first.** The frontend and backend meet at a written API contract (types, schemas, error codes).
7. **The browser never writes to database tables.** It calls API routes, which call database functions.

---

## 1. System overview

```
Customer (Next.js site)         Staff (Admin / Kitchen / Rider PWA)        Owner (Claude via MCP)
        │                                   │                                      │
        ▼                                   ▼                                      ▼
  Next.js Route Handlers / Server Actions ───────────────────────────────  MCP server (scoped tools)
        │  validate → idempotency → rate limit → Turnstile                         │
        ▼                                                                          ▼
  Supabase Postgres ◄── create_order / transition_order (service role only) ◄──────┘
   │  RLS · triggers · pg_cron · outbox
   ├── Realtime  → kitchen board + customer tracking page
   ├── Storage   → menu photos (via image CDN)
   └── Outbox worker (Edge Function) → WhatsApp · SMS · printer · payment verify · refunds
                                            ▲
 Webhooks in: JazzCash IPN · Easypaisa postback · WhatsApp Cloud API · Supabase DB webhooks
```

### Tech stack

| Layer              | Choice                                                                                |
| ------------------ | ------------------------------------------------------------------------------------- |
| Frontend           | Next.js (App Router), TypeScript, Tailwind, Framer Motion (GSAP for the hero only)    |
| Client state       | Zustand (cart, saved to localStorage), TanStack Query (server data in the browser)    |
| Forms / validation | React Hook Form + Zod (schemas shared with the server)                                |
| i18n               | next-intl: English and Urdu, with right-to-left layout for Urdu                       |
| Backend            | Next.js Route Handlers + Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| Geo                | PostGIS (delivery zones)                                                              |
| Jobs               | pg_cron + Edge Functions (outbox worker, payment reconciler)                          |
| Rate limiting      | Upstash Redis                                                                         |
| Bot protection     | Cloudflare Turnstile                                                                  |
| Payments           | COD first, then JazzCash and Easypaisa                                                |
| Messaging          | WhatsApp Cloud API, with SMS as the fallback                                          |
| Images             | Supabase Storage + image CDN (AVIF/WebP)                                              |
| Hosting            | Vercel (web), Supabase (data)                                                         |
| Monitoring         | Sentry, Better Stack/Axiom logs, PostHog analytics                                    |

---

## 2. Frontend architecture

### 2.1 Rendering per page

| Page                            | Strategy                                | Notes                                               |
| ------------------------------- | --------------------------------------- | --------------------------------------------------- |
| Home, Menu, Item detail         | Static, cached, cache tag `menu`        | Refreshed when the menu changes; fastest load on 4G |
| Store open/closed banner        | Short cache (about 30 s)                | Close to real time                                  |
| Cart, Checkout                  | Client-side                             | Local cart, server quote                            |
| Order tracking `/track/[token]` | Server-rendered, then realtime          | No referrer header sent from this page              |
| My orders, Account              | Client-side, login (phone OTP) required |                                                     |
| Admin, Kitchen board            | Client-side, staff login, PWA           | Realtime updates plus new-order sound               |

### 2.2 Internal layers

```
Pages / Components   → what the user sees; no data logic
Feature hooks        → useMenu, useCart, useQuote, usePlaceOrder, useOrderTracking
API client (lib/api) → the ONLY place that knows URLs, headers, error codes
Transport            → mock (MSW) now → real backend later
```

Components never call `fetch` or Supabase directly.

### 2.3 How the frontend talks to the backend

| Channel      | Used for                                              | How                                                                                                                |
| ------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Server reads | Menu, categories, store status, zones                 | Server Components read at render; cached by tag; the backend clears the tag on change                              |
| API writes   | Place order, quote, OTP, cancel, promo, payment start | Browser → `/api/*` → database function. Sends an idempotency key header and a Turnstile token (order and OTP only) |
| Realtime     | Tracking status/ETA, kitchen board, live sold-out     | Broadcast channel per tracking token; staff subscription; **polling fallback every 10–15 s**                       |
| Redirects    | JazzCash/Easypaisa                                    | Signed form from the API → gateway → return page shows "confirming…" until the result is confirmed                 |

**Auth:** Supabase auth cookies (via `@supabase/ssr`). Middleware guards `/admin` and checks the staff role.

### 2.4 Frontend rules

- The idempotency key is generated **when the checkout screen opens**, not when the button is clicked, and reused on every retry.
- Checkout shows the **server's quote total**. A total calculated in the browser is only an estimate.
- Use the tracking token in URLs, never the order number.
- All text goes through i18n, including error messages. The UI maps each error code to English and Urdu text.
- On `ITEM_SOLD_OUT`, re-fetch the menu and highlight the affected cart line.
- The WhatsApp opt-in checkbox is **unchecked by default**.

### 2.5 Performance targets

- About 150 KB of JavaScript on the menu page; animation libraries load only on the pages that use them
- Next.js image component, AVIF/WebP, lazy loading, fixed 1:1 ratio on menu cards
- Self-hosted fonts, limited to the weights used
- Respect the phone's "reduce motion" setting
- Lighthouse checks at the mobile slow-4G setting

---

## 3. API contract (written before any UI)

### 3.1 Public endpoints

| Method   | Path                                | Purpose                                                      |
| -------- | ----------------------------------- | ------------------------------------------------------------ |
| GET      | `/api/menu`                         | Menu (cached, tag `menu`)                                    |
| GET      | `/api/store/status`                 | Open/closed, next opening time, accepting orders             |
| POST     | `/api/delivery/quote`               | Pin → zone, fee, ETA                                         |
| POST     | `/api/cart/quote`                   | Cart → server subtotal, fee, discount, total                 |
| POST     | `/api/auth/otp/request`             | Send OTP (Turnstile, rate-limited)                           |
| POST     | `/api/auth/otp/verify`              | Verify OTP                                                   |
| POST     | `/api/orders`                       | Create order (idempotent, Turnstile)                         |
| GET      | `/api/orders/track/[token]`         | Tracking state                                               |
| POST     | `/api/orders/[token]/cancel`        | Cancel while `placed` (rate-limited, session or token check) |
| POST     | `/api/payments/[provider]/initiate` | Start payment (idempotent)                                   |
| GET/POST | `/api/payments/[provider]/return`   | Customer return page; never marks an order paid              |
| GET      | `/api/orders/mine`                  | Guest "my orders" after phone OTP (rate-limited)             |

### 3.2 Webhooks

`/api/webhooks/jazzcash`, `/api/webhooks/easypaisa`, `/api/webhooks/whatsapp`, `/api/webhooks/supabase` (menu cache refresh, shared secret).

### 3.3 Admin (role-gated)

Orders board and status changes, menu create/edit/delete plus sold-out toggles, zones, hours, promos, customers (block, unblock, anonymize), refunds queue, rider cash settlement (`GET /api/admin/riders/settlement` + "mark settled"), reports, retry failed notifications.

### 3.4 Shared types

Menu, Category, Item, Variant, ModifierGroup, Modifier, CartLine, Quote, Order, OrderStatus, PaymentState, TrackingEvent, Address, Customer.

### 3.5 Error format and codes

Every error response has the same shape: `code`, `message`, and optional `details`.

| Code                                        | When                                                            |
| ------------------------------------------- | --------------------------------------------------------------- |
| STORE_CLOSED                                | Outside hours, holiday, or ordering paused                      |
| ITEM_SOLD_OUT                               | Details include the item ID                                     |
| OUTSIDE_ZONE                                | Pin is not covered by any active zone                           |
| BELOW_MIN_ORDER                             | Below the larger of the store and zone minimum                  |
| ADDRESS_NOT_FOUND                           | Address missing or not the customer's own                       |
| COD_NOT_ALLOWED                             | Blocked, over the COD cap, or a pre-order more than 2 hours out |
| PREORDER_INVALID                            | In the past, more than 7 days out, or outside opening hours     |
| PROMO_INVALID / PROMO_EXPIRED / PROMO_LIMIT | Promo checks failed                                             |
| TOO_LATE_TO_CANCEL                          | Details include the shop phone number                           |
| RATE_LIMITED                                | Includes a Retry-After header                                   |
| IDEMPOTENCY_CONFLICT                        | Same key reused with a different body (422)                     |
| IN_PROGRESS                                 | Request still processing (409, Retry-After: 2)                  |
| PAYMENT_PENDING                             | Payment not yet confirmed                                       |

### 3.6 Frontend-first workflow

1. Write the contract: types, Zod schemas and error codes in `/lib/contracts`.
2. Add mocks: MSW intercepts `/api/*`, with fixtures from the real menu and a `NEXT_PUBLIC_USE_MOCKS` switch.
3. Make the mocks able to simulate: store closed, item selling out mid-checkout, address outside zones, slow 3G, network failure, duplicate taps, status progression on a timer, and payment success, failure and stuck-pending.
4. Build every state: loading, empty, error, closed, sold out, offline.
5. Build the backend to the same contract, turn the mocks off, and fix any mismatch **in the backend**.

---

## 4. Backend architecture

### 4.1 Order creation pipeline

```
1. Zod validate shape
2. request_hash = sha256(normalized body WITHOUT turnstile_token)
3. Idempotency LOOKUP (read only)
     done              → replay stored response (skip everything below)
     processing, live  → 409 Retry-After: 2
     hash differs      → 422
     failed/stale/new  → continue
4. Rate limit (IP, phone, customer)
5. Turnstile verify
6. Idempotency CLAIM (insert, or take over failed/stale-processing rows atomically)
7. create_order RPC (one transaction)
8. Store response, mark key done → 201 (same response for a new or replayed order)
```

**Inside `create_order`, in one transaction:**

- store accepting orders; open per `is_store_open` (store timezone, past-midnight windows, holidays); or a valid `scheduled_for`
- pre-order rules: in the future, within 7 days, inside opening hours, pre-orders allowed; COD not allowed more than 2 hours out
- items, variants and modifiers loaded from the database; inactive or sold-out items rejected; modifier min/max enforced
- address must belong to the customer (otherwise `ADDRESS_NOT_FOUND`)
- zone found by **covers**, then priority descending, then smallest area; minimum = larger of the store and zone minimum
- customer blocked or COD-allowed checks; COD cap
- promo row locked; validity, minimum order, total and per-customer limits checked; discount calculated; redemption written
- totals calculated: total = subtotal + delivery fee + tax + tip − discount
- order inserted, **a no-op if the idempotency key already exists** (returns the existing order); items, modifiers, first event and outbox jobs written

### 4.2 Order state machine (`transition_order`)

```
pending_payment → placed | payment_failed | expired
expired         → placed            (late payment, items still available)
placed          → accepted | rejected | cancelled
accepted        → preparing | cancelled (manager only)
preparing       → ready
ready           → out_for_delivery (delivery) | picked_up (pickup)
out_for_delivery→ delivered | cancelled (failed delivery → failed_cod_count + 1)
```

- Allowed moves are enforced, plus a **role check** (kitchen, rider, customer, manager).
- **Optimistic locking** on `version`: if no row matches, return 409 (protects against two tablets tapping at once).
- Moving to the current status again is a no-op that succeeds, so retries are harmless.
- Every move writes `order_events`, outbox jobs and updated ETAs, and broadcasts over realtime.
- On `delivered` or `picked_up` for COD: set `cash_collected_at/by`, and set the rider assignment's `cash_in_hand`.

### 4.3 Payments (JazzCash / Easypaisa)

1. The order is created as `pending_payment`, with a payment row (`pending`, unique transaction reference) that expires in 15 minutes. **Only one pending payment per order.**
2. The initiate endpoint is idempotent. If a pending payment already exists, it returns that payment's redirect.
3. The return URL verifies the hash and shows "confirming…". **It never marks the order paid.**
4. The IPN handler verifies the signature, deduplicates, enqueues a `payment.verify` outbox job and returns 200 quickly. The worker calls the gateway's **inquiry API**, the source of truth, and checks the amount and currency.
5. On confirmation: the payment becomes `paid`, and `transition_order` moves the order to `placed` in the same transaction.
6. **`payments.status` is authoritative.** `orders.payment_status` is updated only by a trigger.
7. A reconciler runs every 2 minutes and checks stale pending payments with the inquiry API. Expired ones become `payment_failed` or `expired` via `transition_order`.
8. **Late success after expiry:** if the items are still available, the order goes back to `placed`. Otherwise a refund row (`requested`) and a `refund.requested` outbox job are created.
9. A nightly drift check writes `payment_status.drift` to the audit log and alerts the owner.

### 4.4 Webhooks

```
1. Read raw body (size limit ~64 KB), rate limit per IP
2. Verify signature (constant-time)
     invalid → store with signature_valid=false and a RANDOM event_id → 400
3. Valid → insert with the real event_id, on conflict do nothing
     duplicate → 200
4. Enqueue to outbox → 200
```

- **WhatsApp:** a GET request handles the verify-token handshake. POST requests are signed with an HMAC-SHA256 header computed over the raw body. Delivery-status callbacks update outbox rows; customer replies go to the admin inbox or a simple bot.
- Payloads are sanitized before storing. `webhook_events` are kept for 90 days.

### 4.5 Outbox worker

- Triggered every 30 seconds by pg_cron, plus a database webhook on insert for near-instant sends.
- Rows are claimed with row locks that skip rows another worker holds, so two workers never send the same message.
- Success → `sent`. Failure → `failed` with exponential backoff. After 6 attempts → `dead`, and the owner is alerted.
- `dedup_key` is unique, so the same notification can't be queued twice.
- Topics: `whatsapp.*`, `sms.*`, `printer.kot`, `payment.verify`, `refund.requested`, `refund.processed`, `kitchen.new_order`.

### 4.6 Realtime

- **Kitchen:** subscribes to active orders. A new `placed` order plays a repeating sound until someone accepts it.
- **Customer:** a broadcast channel per tracking token, carrying status and ETA only.
- **Menu:** sold-out toggles are broadcast live, and the `menu` cache tag is refreshed.

---

## 5. Database schema

Conventions: UUID primary keys (except the noted bigint log tables), `created_at` and `updated_at` on every table, money as integer rupees, and soft deactivation (never hard deletes) for anything an order references.

### 5.1 Enums

| Enum           | Values                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| order_status   | pending_payment, placed, accepted, preparing, ready, out_for_delivery, delivered, picked_up, cancelled, rejected, payment_failed, expired |
| fulfilment     | delivery, pickup                                                                                                                          |
| pay_method     | cod, jazzcash, easypaisa                                                                                                                  |
| pay_status     | unpaid, pending, paid, failed, refunded, partially_refunded                                                                               |
| refund_status  | requested, approved, processed, rejected                                                                                                  |
| staff_role     | owner, manager, kitchen, cashier, rider                                                                                                   |
| promo_kind     | percent, flat, free_delivery                                                                                                              |
| outbox_status  | pending, sending, sent, failed, dead                                                                                                      |
| idem_status    | processing, done, failed                                                                                                                  |
| webhook_status | received, processed, ignored, failed                                                                                                      |

### 5.2 Menu

- **categories**: slug (unique), name_en/ur, sort_order, is_active
- **menu_items**: category_id, slug (unique), name and description in en/ur, base_price ≥ 0, image_path (storage key), is_active, is_sold_out, sold_out_until, prep_minutes, sort_order
- **item_variants**: item_id, name (unique per item), price (full price for that size), is_default (at most one per item), is_available
- **modifier_groups**: name, min_select ≤ max_select
- **modifiers**: group_id, name, price ≥ 0, is_available
- **item_modifier_groups**: (item_id, group_id) primary key
- **combos / combo_items**: behind `FEATURE_COMBOS=false` in v1; the combo item's variant must belong to that item (composite foreign key)

### 5.3 Store configuration

- **store_settings** (single row): is_accepting_orders, pause_reason, timezone (Asia/Karachi), min_order_value, max_cod_value, auto_reject_minutes (8), manager_alert_minutes (6), allow_preorders, preorder_max_days (7), preorder_cod_max_hours (2), preorder_release_minutes (60), shop_phone
- **opening_hours**: weekday (local), opens, closes (closes < opens means the window runs past midnight); primary key (weekday, opens)
- **holidays**: date (local), note
- **delivery_zones**: name, area (geography polygon), fee, min_order, eta_minutes, priority, is_active

### 5.4 Customers and staff

- **customers**: auth_user_id (unique, null for guests), phone_e164 (unique, normalized), name, phone_verified_at, is_blocked, block_reason, cod_allowed, failed_cod_count, whatsapp_opt_in (default false), whatsapp_opt_in_at, whatsapp_opt_in_source, preferred_lang, anonymized_at
- **addresses**: customer_id, label, line1, area, landmark, location (geography point), is_default (at most one per customer)
- **staff**: user_id (primary key, references auth), name, role, phone, is_active; 2FA required for owner and manager

### 5.5 Orders

- **orders**: order_number (sequence, shown as BP-1042), public_token (unique, random), customer_id, fulfilment, address_snapshot, zone_id, status, version, payment_method, payment_status (**trigger-maintained projection**), subtotal, delivery_fee, discount, tax (0), tip (0), total, applied_promo_id, discount_breakdown, scheduled_for, released_at, estimated_ready_at, estimated_delivery_at, customer_note, cart_hash, idempotency_key (**unique**), source, accepted_at, ready_at, completed_at, cash_collected_at, cash_collected_by, cash_settled_at, cancel_reason
  - Check: total = subtotal + delivery_fee + tax + tip − discount; all money ≥ 0
  - No `rider_id` column; the rider lives only in rider_assignments
- **order_items**: order_id, item_id, variant_id, name_snapshot, variant_snapshot, unit_price, qty (1–50), line_total (**must equal unit_price × qty**), note
- **order_item_modifiers**: order_item_id, modifier_id, name_snapshot, price
- **order_events** (append-only): order_id, from_status, to_status, actor_type (customer, staff, system, payment, mcp), actor_id, note

### 5.6 Payments, refunds, promos

- **payments**: order_id, provider, provider_txn_ref (unique per provider), provider_txn_id, amount, status (**authoritative**), verified_via, raw_request/response (sanitized), expires_at; **at most one pending payment per order**
- **refunds**: payment_id, amount (> 0, not more than paid), reason, status (enum), requested_by, processed_by, processed_at
- **promo_codes**: code (unique, uppercase), kind, value, min_order, max_uses, max_uses_per_customer (1), valid_from, valid_until, is_active; no stacking in v1
- **promo_redemptions**: promo_id, customer_id, order_id (**unique**); limits enforced under a row lock on the promo

### 5.7 Riders and reviews

- **rider_assignments**: order_id (unique), rider_id (→ staff), assigned_at, picked_up_at, delivered_at, cash_in_hand; a rider's open cash = sum of cash_in_hand on orders not yet settled
- **reviews**: order_id (unique), customer_id, rating 1–5, comment, is_published; allowed only on delivered or picked-up orders

### 5.8 Reliability and audit

- **idempotency_keys**: key (primary key), scope, request_hash (excludes the Turnstile token), status, locked_until, response_code, response_body; stuck `processing` rows become `failed` after 5 minutes; rows are purged after 48 hours
- **webhook_events**: provider, event_id (real if valid, random if invalid), signature_valid, payload, status, attempts, last_error, processed_at; unique (provider, event_id); 90-day retention
- **outbox**: topic, dedup_key (unique), payload, status, attempts, next_attempt_at, last_error
- **audit_log**: actor_id, actor_type, action, entity, entity_id, before, after, ip, user_agent; 1-year retention

### 5.9 Database functions

| Function                  | Purpose                                                                         |
| ------------------------- | ------------------------------------------------------------------------------- |
| create_order              | The only way to create an order (see 4.1)                                       |
| transition_order          | The only way to change status (see 4.2)                                         |
| is_store_open(at)         | Hours check in the store timezone, including past-midnight windows and holidays |
| resolve_zone(point)       | covers → priority → smallest area                                               |
| sync_order_payment_status | Trigger on payments → orders.payment_status                                     |
| reviews_after_completion  | Trigger that blocks reviews on unfinished orders                                |

All run with a pinned search path. Execute permission is revoked from public, anon and authenticated users and granted to the service role only.

### 5.10 Indexes

orders (status, created_at desc), (customer_id, created_at desc), (scheduled_for) · payments (status, created_at) + one-pending-per-order · order_events (order_id, created_at desc) · outbox (status, next_attempt_at) · delivery_zones spatial index on area · addresses (customer_id) · rider_assignments (rider_id)

---

## 6. Deduplication matrix

| Risk                                | Guard                                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Double-tap "Place order"            | Idempotency key per checkout session + unique `orders.idempotency_key` + `create_order` no-op on conflict |
| Same cart re-ordered with a new key | `cart_hash` + customer + last 3 minutes → "place again?" confirmation                                     |
| Duplicate customers                 | Unique `phone_e164`, normalized before every lookup                                                       |
| Duplicate webhooks                  | Unique (provider, event_id), only after the signature is verified                                         |
| Duplicate payments                  | Unique (provider, provider_txn_ref) + one pending payment per order                                       |
| Duplicate notifications             | Unique `outbox.dedup_key`                                                                                 |
| Duplicate status changes            | Idempotent transitions + version lock                                                                     |
| Promo race                          | Promo row lock + `order_id` unique on redemptions                                                         |
| Duplicate reviews                   | Unique `reviews.order_id`                                                                                 |

---

## 7. Security

**Access**

- Customers: phone OTP (SMS or WhatsApp authentication template). The first COD order from a new number requires OTP.
- Staff: email + password; TOTP 2FA required for owner and manager; kitchen tablets use a restricted role.
- `/admin` is protected by middleware with a role check on each section.

**Database**

- RLS on every table. Insert, update and delete are **revoked** from anon and authenticated on orders, payments, outbox, webhook_events and idempotency_keys. RLS is a second line of defence, not the boundary.
- The database functions are callable only by the service role, with a pinned search path.
- The service-role key lives only in server environment variables, never in a `NEXT_PUBLIC_*` variable.

| Data                                                                     | Public / customer     | Staff (via server)              |
| ------------------------------------------------------------------------ | --------------------- | ------------------------------- |
| Menu, zones, hours                                                       | Read active rows      | Owner/manager write             |
| Own customer record and addresses                                        | Read/write own        | Read                            |
| Orders                                                                   | Read own; never write | Via the database functions only |
| Payments, refunds, promo internals, webhooks, outbox, idempotency, audit | None                  | Server only                     |
| Menu images                                                              | Public read           | Owner/manager upload            |

**API hardening**

- Zod on every endpoint; parameterized queries and database functions only
- Rate limits: OTP 3 per phone per 10 minutes with lockout; orders per IP, phone and customer; tracking; cancel; guest order lookup; webhooks per IP
- Turnstile on checkout and OTP
- Headers: strict CSP (with `form-action` allowing the JazzCash/Easypaisa hosts), HSTS, `X-Frame-Options: DENY`, Permissions-Policy, `Referrer-Policy: no-referrer` on `/track/*`
- CSRF: Origin check + SameSite=Lax cookies; Server Actions are origin-checked by Next.js
- Tracking uses a 32-character random token, never the sequential order number

**COD fraud controls**
COD cap; OTP on the first order; 2+ no-shows disable COD for that number; phone blocklist; flag orders far above the customer's usual size for a call-back; no COD on pre-orders more than 2 hours out.

**Data protection**

- Store only phone, name and address; card and wallet data is never stored
- Phone numbers masked in kitchen views; riders see the full number only for their active order
- WhatsApp only with recorded consent (`whatsapp_opt_in_at` set)
- Anonymization job: name and phone set to null, address snapshots masked, order rows kept
- Supabase point-in-time recovery + weekly logical dump; rotate secrets when staff leave

**Uploads**
Admin-only uploads; MIME type and file-signature checks; 5 MB limit; re-encoded to WebP/AVIF (strips EXIF); random file names.

---

## 8. MCP server (owner ↔ shop via Claude)

- Remote HTTP MCP server (Node, `@modelcontextprotocol/sdk`) on Vercel, using **OAuth 2.1**. Each token maps to a staff user and role.
- **Read tools:** sales summary, active orders, get order, top/slow items, customer stats (masked), failed notifications.
- **Write tools (bounded):** set item sold out, update price (changes over ±40% rejected), pause/resume orders, create promo, transition order.
- **Not exposed:** refunds, bulk price changes, deletes, raw SQL.
- Write tools call the same database functions as the admin UI. Every write is idempotent and written to `audit_log` with `actor_type='mcp'`.
- Customer notes and reviews returned by tools are treated as data, never as instructions.

---

## 9. Scheduled jobs (pg_cron)

| Every   | Job                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30 s    | Outbox worker                                                                                                                                            |
| 1 min   | Manager alert at 6 minutes unaccepted; auto-reject at 8 minutes (counted from `released_at` for pre-orders; skips pre-orders not yet due)                |
| 2 min   | Payment reconciler                                                                                                                                       |
| 5 min   | Expire unpaid orders; release pre-orders 60 minutes before their time                                                                                    |
| Nightly | Reset sold-out items; purge idempotency keys; mark stuck keys failed; payment drift check; retention enforcement; sales summary to the owner on WhatsApp |

---

## 10. Integrations

| Integration                   | Role                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| JazzCash / Easypaisa          | Hosted payment pages, IPN, inquiry API                                  |
| WhatsApp Cloud API            | Order messages (approved English/Urdu templates), OTP, customer replies |
| SMS gateway                   | Fallback for WhatsApp and for customers who haven't opted in            |
| Google Maps / Mapbox          | Delivery pin picker + landmark field                                    |
| PrintNode / local print agent | Kitchen order ticket on `accepted`                                      |
| Foodpanda                     | Kept separate; optionally logged manually as `source='foodpanda'`       |
| PostHog                       | Funnel: menu → item → cart → checkout → placed                          |
| Sentry + log platform         | Errors and logs                                                         |

**Alerts:** spikes in invalid webhook signatures, dead outbox rows, payment drift, and **no orders for 2 hours during opening hours**.

---

## 11. Project structure

```
/app
  /(site)          home, menu, item/[slug], cart, checkout, track/[token], orders, account
  /admin           orders board, kitchen, menu, zones, promos, riders, refunds, reports
  /api             route handlers (thin: validate → call backend → return contract shape)
/components
  /ui              sticker design system (buttons, cards, sheets, toggles)
  /menu /cart /checkout /tracking /admin
/features          hooks per feature
/lib
  /api             API client (single gateway)
  /contracts       shared types, Zod schemas, error codes
  /realtime        subscription + polling fallback
  /i18n            en / ur messages
  /db              Supabase server/client, typed RPC wrappers        (backend phase)
  /payments        jazzcash, easypaisa: sign, verify, inquire        (backend phase)
  /whatsapp        client, templates, signature verify              (backend phase)
  /security        rate limit, turnstile, idempotency, phone (E.164) (backend phase)
/mocks             MSW handlers, fixtures, scenario switches         (frontend phase)
/stores            Zustand cart
/supabase
  /migrations      schema, RLS, grants, functions, cron (forward-only, timestamped)
  /functions       outbox-worker, payment-reconciler
/mcp-server        tools, auth, audit
/docs              Architecture.md, runbook.md
```

---

## 12. Build roadmap

**Frontend phase**

1. API contract (types, schemas, error codes)
2. MSW mocks + scenario switches
3. Design system + Home/Menu/Item pages
4. Cart → quote → checkout (all error states)
5. Tracking (simulated status progression) + My orders
6. Admin and kitchen board against mocks

**Backend phase**

1. Schema + RLS + grants + database functions (`create_order`, `transition_order`, helpers)
2. COD ordering end to end + realtime kitchen board → **launchable**
3. Outbox + WhatsApp/SMS
4. OTP + fraud controls
5. JazzCash/Easypaisa + reconciler + refunds queue
6. Riders/cash settlement, promos, reviews
7. MCP server

**Verification each phase:** typecheck, lint, unit tests · migrations apply cleanly from scratch · SQL tests (idempotent `create_order`, auto-reject skipping pre-orders, zone border pins, past-midnight hours, promo race) · RLS smoke test (anon cannot insert or read others' orders) · concurrency test (same idempotency key × 10 in parallel → one order).

---

## 13. Open decisions

| #   | Decision                             | Current assumption                                                                                          |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | Combos in v1?                        | Off (`FEATURE_COMBOS=false`); upsell at normal prices                                                       |
| 2   | Refund approval and method           | Manager requests, owner approves; gateway reversal done manually in the merchant portal, tracked in the app |
| 3   | Own riders or pickup/Foodpanda only? | Own riders assumed; if none, only cash collected at the counter                                             |
| 4   | Delivery radius and zone fees        | To confirm with the client                                                                                  |
| 5   | Online payment at launch?            | COD at launch; JazzCash/Easypaisa next                                                                      |
| 6   | Who maintains the menu?              | Owner/manager via admin (and MCP)                                                                           |
| 7   | Item photography                     | Consistent 1:1 shoot needed                                                                                 |
