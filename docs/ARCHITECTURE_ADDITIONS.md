# Barraf Paani — Architecture additions

Additions agreed with the client that `ARCHITECTURE.md` doesn't cover yet. They are part of v1. The frontend already implements them against the contract (`lib/contracts`) and the mocks (`mocks/`). **The backend phase must build them exactly like the rest of the architecture:** the same guiding rules (§0), the same pipeline (§4.1), the same outbox (§4.5).

Section references like §4.1 point to `ARCHITECTURE.md`; references like §A2 point to this document.

---

## A1. Orders from WhatsApp, phone and walk-in in the same system

Staff enter WhatsApp, phone, walk-in and Foodpanda orders through a fast admin form. These orders go through the **same** `create_order`, so totals, zones, minimums, promos, COD rules and the state machine are identical to website orders.

### A1.1 Schema

| Change                    | Detail                                                                          |
| ------------------------- | ------------------------------------------------------------------------------- |
| New enum **order_source** | `website, whatsapp, phone, walk_in, foodpanda`                                  |
| `orders.source`           | Becomes `order_source NOT NULL DEFAULT 'website'` (§5.5 already has the column) |
| Index                     | `orders (source, created_at desc)` for the reports "by source" breakdown        |

### A1.2 Endpoint

| Method | Path                       | Roles                   | Notes                                                                                                                                                                                                                                                                                                                             |
| ------ | -------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/admin/orders/manual` | owner, manager, cashier | Idempotency-Key required. Body: `source` (not `website`), customer `{ name, phone }`, lines (intent only), fulfilment, `addressId` **or** `newAddress` (pin + landmark), payment method, promo, note, scheduled time. Response: the `AdminOrder` + `publicToken` + `trackingPath`, so staff can send the customer a tracking link |

### A1.3 Rules

- The route handler normalises the phone to E.164, finds or creates the customer, saves `newAddress` to that customer, then calls `create_order` with `p_source` and `actor_type = 'staff'`.
- **No OTP and no Turnstile:** the staff member is the human check. Rate limits, the COD cap, blocked numbers and the pre-order rules still apply.
- `order_events.actor_type = 'staff'`, with `actor_id` set to the staff member.
- `whatsapp_opt_in` is **not** set by a manual order. Consent must come from the customer (§7).
- The label (Website / WhatsApp / Phone / Walk-in / Foodpanda) appears everywhere staff see an order: kitchen board, order detail, reports (`SalesReport.bySource`), and the MCP `get order` tool.
- Optional outbox job `whatsapp.tracking_link` (only with consent) sends the tracking URL.

### A1.4 Phase 2 (not built)

Automatic WhatsApp ordering, through a WhatsApp catalog or a bot on the Cloud API webhook (§4.4), would create orders with `source = 'whatsapp'` through the same `create_order`. It needs: template approval, catalog sync from `menu_items`, a cart session per WhatsApp conversation, and an OTP-free trust rule (the WhatsApp number itself is verified).

---

## A2. Deals & Events with booking

### A2.1 Concepts

- A **deal** is a display card. Its "Order" button adds **normal menu items at normal prices** to the cart (`deal_items`). There is no combo pricing, and `FEATURE_COMBOS` stays `false` (§13.1). `price_label` is display text only and is **never used for charging**.
- An **event** (live screening, family night…) is a card with a **Book** button.
- A **booking** is a request: a general table booking, an event booking, or a private event/catering enquiry. Staff confirm or decline it, and the customer gets a WhatsApp/SMS message via the outbox.

### A2.2 Enums

| Enum           | Values                                                        |
| -------------- | ------------------------------------------------------------- |
| booking_type   | table, event, private_event                                   |
| booking_status | requested, confirmed, declined, cancelled, completed, no_show |

### A2.3 Tables

- **deals**: title_en/ur, description_en/ur, image_path, price_label (text, nullable), valid_from, valid_until, is_active, sort_order
- **deal_items**: deal_id, item_id, variant_id (composite FK: the variant must belong to the item), modifier_ids (uuid[]), qty (1–50)
- **events**: title_en/ur, description_en/ur, image_path, starts_at, ends_at (> starts_at), bookable, capacity (nullable = unlimited), is_active
- **bookings**: public_token (unique, 32 chars), type, event_id (FK, required iff type = event), date (local), time (local), guests (1–200), name, phone_e164, note, status, decline_reason, customer_id (nullable, set when the phone matches), idempotency_key (unique), handled_by, handled_at
  - Check: `(type = 'event') = (event_id IS NOT NULL)`
  - Index: (status, date), (event_id), (phone_e164, created_at desc)

### A2.4 Endpoints

| Method                | Path                                              | Caller                                       | Notes                                                                                    |
| --------------------- | ------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| GET                   | `/api/deals-events`                               | Server Component (cache tag `menu`), browser | Active deals inside their validity window, plus upcoming active events with `spots_left` |
| POST                  | `/api/bookings`                                   | browser                                      | Idempotent (Idempotency-Key), Turnstile, rate-limited per phone **and** IP. Intent only  |
| GET                   | `/api/bookings/[token]`                           | browser                                      | Booking status page (realtime channel per token, polling fallback)                       |
| GET                   | `/api/admin/bookings?status=`                     | owner, manager, cashier                      | Queue                                                                                    |
| PATCH                 | `/api/admin/bookings/[token]`                     | owner, manager, cashier                      | `{ action: confirm \| decline(reason) \| complete \| no_show \| cancel }`                |
| GET/POST/PATCH/DELETE | `/api/admin/deals[/id]`, `/api/admin/events[/id]` | owner, manager                               | CRUD. A write refreshes the `menu` cache tag                                             |

### A2.5 Rules

- Booking state machine: `requested → confirmed | declined | cancelled`, `confirmed → completed | no_show | cancelled`. Implement it in one database function, `transition_booking` (mirrors `transition_order`: allowed moves, idempotent repeat, event row, outbox in the same transaction).
- **Capacity** for event bookings is checked in `create_booking` under a row lock on the event: requested + confirmed guests ≤ capacity, otherwise `EVENT_FULL`.
- The date must be today or later in Asia/Karachi. Event bookings use the event's date.
- Outbox topics (deduplicated by `dedup_key`): `whatsapp.booking_received`, `whatsapp.booking_confirmed`, `whatsapp.booking_declined`, each with an `sms.*` fallback for customers who haven't opted in to WhatsApp.
- Retention: anonymise bookings 1 year after the date (name/phone set to null), the same as the customer anonymisation job.
- New pg_cron job (daily): mark past `confirmed` bookings without an outcome for manager review.

---

## A3. AI-search and local-search readiness (built in prompt 3)

- `/llms.txt`: a plain-text summary (what, where, hours, menu categories, how to order, contact), generated from the canonical facts.
- `robots.txt`: allow search and AI crawlers (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot). Disallow `/admin`, `/track/*`, `/api/*`.
- Structured data (JSON-LD): `Restaurant` / `FastFoodRestaurant` with address, geo, telephone, `openingHoursSpecification` (from `opening_hours`, including past-midnight windows), `servesCuisine`, `hasMenu` (`Menu` → `MenuSection` → `MenuItem` with `Offer` prices in PKR), `acceptsReservations` (bookings), `potentialAction` `OrderAction`.
- **Canonical facts block:** one source (`lib/site.ts` now; later `store_settings` + a `site_facts` row) feeds the footer, the Visit page, JSON-LD and `llms.txt`, so they can never disagree.

---

## A4. Schema columns the frontend needs (small additions to §5.2)

| Table                      | Column                                                     | Why                                                                                                       |
| -------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| categories                 | `parent_id` (nullable FK)                                  | Loaded Fries is its own category shown inside the Fries board                                             |
| categories                 | `image_paths text[]`                                       | Category photos (items fall back to these)                                                                |
| item_variants              | `size` (S/M/L/XL, nullable), `option` (text key, nullable) | Size and option labels translated in the UI (`variant.<option>`). `name` stays the unique canonical label |
| modifier_groups, modifiers | `name_ur`                                                  | Urdu labels                                                                                               |

---

## A5. Contract additions

Full list: `docs/API_CONTRACT.md` (entries marked **ADDITION**).

- **Error codes beyond §3.5:** `VALIDATION_FAILED`, `UNAUTHENTICATED` (`details.reason: session | otp_required`), `FORBIDDEN`, `NOT_FOUND`, `OTP_INVALID`, `OTP_EXPIRED`, `TURNSTILE_FAILED`, `DUPLICATE_ORDER_SUSPECTED` (the §6 "place again?" signal), `VERSION_CONFLICT` (the §4.2 409), `INVALID_TRANSITION`, `EVENT_FULL`, `INTERNAL_ERROR`.
- **Quote** carries `requiresOtp` (§7) and `cod { allowed, reason: blocked | over_cap | preorder_too_far }`, so checkout can explain before the customer taps "Place order".
- **Guest checkout:** `QuoteRequest.phone` and `PlaceOrderRequest.customer { name, phone }` + `newAddress`. `create_order` finds or creates the customer by `phone_e164` and requires a verified phone (OTP) for the first COD order.
- **Endpoints supporting §3.1:** `/api/auth/logout`, `/api/me` (GET/PATCH), `/api/me/addresses` (GET/POST/DELETE).
- **Staff and rider endpoints (§3.3, §7):** `/api/admin/auth/login`, `/2fa/enrol`, `/2fa/verify`, `/logout`, `/api/admin/me`; `/api/rider/assignments`, `/[orderId]/picked-up`, `/[orderId]/delivered` (`cashCollected` must equal the COD total).
- **Admin:** `/api/admin/hours` (GET/PUT), `/api/admin/holidays` (GET/POST/DELETE), `/api/admin/reviews` (moderation), `/api/admin/outbox?status=failed&status=dead` + `/[id]/retry`.
- **Realtime:** `/api/realtime/bookings/[token]` (Supabase broadcast channel per booking token in the backend phase).

---

## A6. Frontend security headers (implemented in `next.config.ts`)

CSP with `form-action` allowing the JazzCash/Easypaisa hosts (placeholders), `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Permissions-Policy (geolocation for the pin picker only), HSTS in production, and `Referrer-Policy: no-referrer` on `/track/*`.

`script-src` currently allows `'unsafe-inline'`, because Next.js inline scripts need it without nonces. Backend phase: move to per-request nonces in `proxy.ts`, and add the Supabase `https`/`wss` hosts to `connect-src`.
