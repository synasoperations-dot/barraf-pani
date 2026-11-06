# Open questions for the client

Everything below is a placeholder or an assumption in the code today. Search the code for `TODO_CONFIRM`, `TBC` and `TODO` to find each one.

## Menu: two-price items (`TODO_CONFIRM` in `mocks/fixtures/menu.ts`)

The printed menu shows two prices for these items, but not what each price means. Today each one is modelled as two variants:

| Item(s)                                                                                                                      | Prices                      | Current labels                  | Question                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------- | --------------------------------------------------------- |
| Snow Salt, Masala, Arctic Heat Fries                                                                                         | 250/400, 250/400, 300/500   | Regular / Large                 | Are these sizes? What are they called?                    |
| Mac and Cheese, BP Homemade (pasta), Golden Crunch                                                                           | 395/695                     | Regular / Large                 | Same                                                      |
| Lava Burst                                                                                                                   | 665/865                     | Single / Double                 | Single vs double patty?                                   |
| Pizzas with a slash price inside one size (Street Fajita and Smoky Tikka S and L; Malai Magic, Full House and Burger Bomb S) | e.g. S 595/695, L 1695/1750 | `S · Option A` / `S · Option B` | What is the difference (crust? topping? chicken vs beef?) |
| Garlic Bread "C/P"                                                                                                           | 450/550                     | Classic / Cheese                | What do C and P stand for?                                |

## Menu: other

- **Descriptions:** all `null`. We need copy (EN + UR) for every item, or confirmation that names alone are fine.
- **"Add a dip" add-on:** 0–3 dips per item, on burgers, sandwiches, wraps, wings, fries, loaded fries, pastas, sides and pizzas, at the Dips prices. Is a limit of 3 right?
- **Honey Glazed Wings "Style":** Regular/Spicy, a required choice at the same price. Correct?
- **Extra cheese:** the data model is ready (a modifier group), but there's no price. Which items, and what price?
- **Meals and combos:** the data model is ready (`Combo`, `FEATURE_COMBOS=false`) and the fixture is empty. Are any planned?
- **Drinks:** none on the menu we received. Do they sell drinks?
- **Photos:** only 9 photos for ~50 items, so items show their category photo. Dips and Sides have no photo. A consistent 1:1 shoot is needed (ARCHITECTURE §13 #7). Also: which pizza is in `pizza-small.jpg` and which is in `pizza-big.jpg`?
- **Item name spellings:** "Pepperon Magic", "Sizzlin Mushroom", "BP's Best" and "OG Anda Shami" are copied from the menu as-is. Please confirm.
- **"Snow Salt Fries (plain fries)":** is "plain fries" part of the displayed name, or just our note?
- **Urdu item names:** all null (the UI falls back to English). Do they want Urdu names?

## Deals & Events (ADDITION §A2)

- **Which deals and events at launch?** Both fixtures are empty. `?scenario=deals_demo` shows 2 deals and 2 events titled "DEMO …", built only from real menu items at their normal prices, for layout only.
- Event capacity, booking lead time, and the largest party size for table bookings (the contract allows 1–200).
- Who confirms bookings (cashier? manager?), and how fast should the customer hear back?
- Private events and catering: a minimum spend or a deposit? (Not modelled; it would need a payment flow.)
- WhatsApp templates for booking received, confirmed and declined. These need Meta approval.

## Store (`mocks/fixtures/store.ts`, `lib/site.ts`: all TBC)

| Value                 | Placeholder                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Street address        | `[ADDRESS TBC], Paradise City, Jhang Sadar`                                                                                                                                             |
| Map location          | Approximate Jhang centre (31.2695, 72.3181)                                                                                                                                             |
| Phone / WhatsApp      | `+920000000000`                                                                                                                                                                         |
| Opening hours         | Mon–Thu 12:00–23:30; Fri–Sun 12:00–02:00 (past midnight)                                                                                                                                |
| Holiday               | 2027-03-23 (placeholder)                                                                                                                                                                |
| Minimum order         | Rs 500 (store), Rs 500 inner zone, Rs 1,000 outer zone                                                                                                                                  |
| Max COD order value   | Rs 10,000                                                                                                                                                                               |
| Delivery zones        | **Inner Jhang** (priority 1, Rs 100, ~35 min) inside **Outer Jhang** (priority 0, Rs 200, ~50 min). Both are rectangles. We need real polygons and fees (ARCHITECTURE §13 #4)           |
| Prep time estimate    | 20 min                                                                                                                                                                                  |
| Social links          | Instagram, Facebook, TikTok: none (the footer shows "TBC"; the Deals empty state hides "Follow on Instagram" until set)                                                                 |
| Legal pages           | `/privacy`, `/terms`, `/refunds` are **drafts** from ARCHITECTURE §7 and §13.2, marked "Draft. Have a lawyer review it." A lawyer must review them; the Urdu needs a native speaker too |
| Payment gateway hosts | `sandbox.jazzcash.com.pk`, `payments.jazzcash.com.pk`, `easypay.easypaisa.com.pk` in the CSP `form-action`. Confirm with the merchant accounts                                          |

## Google Business Profile and AI search (prompt 3, §6b)

- **The name, address and phone on the Google Business Profile must match `lib/site.ts` exactly** (one source: `lib/business-facts.ts` feeds every page, the footer, JSON-LD, `/llms.txt`). Send us the profile as it is today.
- Google Business Profile URL ("Find us on Google") and the "write a review" link: both TBC (`SITE.googleProfileUrl`, `SITE.googleReviewUrl`). Until then "Find us" opens the Maps search and "Review us" shows TBC.
- Postal code (`35200` is a guess), real street address, plain-language delivery area text (`SITE.deliveryArea`).
- Production domain for `NEXT_PUBLIC_SITE_URL` (canonical URLs, sitemap, OG, JSON-LD all use it).

## About, FAQ and refunds copy (prompt 3)

- **Story behind the name "Barraf Paani"** (the About quote block is a placeholder).
- Real ambiance photos (8 placeholder tiles), branded bucket and wrap photos (menu shots stand in with a "Branded photo coming" tag), and the reel URLs (2 Instagram, 1 TikTok; tiles say "Coming soon" and load nothing).
- FAQ `[TBC]` items: delivery area and fees, minimum order amounts, typical delivery time, the COD limit, refund timing, allergen information per item, and whether the food is halal.
- Refunds: timing, whether COD refunds are cash at the counter, and how soon after an order a refund must be asked for.
- Retention periods in the privacy draft (logs 1 year, webhooks 90 days, bookings anonymised after 1 year) come from the architecture doc; confirm them.

## Bookings (prompt 3)

- How far ahead can people book? The sheet allows **60 days**. A confirmed booking's calendar file (.ics) assumes **2 hours**. Both are guesses.
- Contact form messages: who reads them, and where do they go (email, WhatsApp, admin inbox)? The mock only writes an outbox row. Per-IP rate limiting is backend work.

## Brand

- **Logo:** `components/ui/Logo.tsx` is a CSS recreation. We need the client's SVG logo.
- **Urdu brand name spelling:** drafted as "برف پانی". Please confirm.
- **Urdu copy:** everything under `lib/i18n/messages/ur*` is machine-drafted. Every string is marked `// REVIEW` and needs a native speaker's review for tone. Numbers, prices and phones inside Urdu sentences are wrapped in Unicode LTR isolates (`⁦…⁩`) so they stay left-to-right.

## Open decisions (ARCHITECTURE §13)

| #   | Decision                             | Current assumption in the frontend                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Combos in v1?                        | Off (`FEATURE_COMBOS=false`). "Order this deal" adds normal items at normal prices; the deal's price sticker is display text only and the cart always shows the server total. **Real discounted combos need `FEATURE_COMBOS` or a promo code** (a deal can carry one: "Copy code" pre-fills the cart) |
| 2   | Refund approval and method           | Manager requests, owner approves, manual reversal in the merchant portal (mocked like that)                                                                                                                                                                                                           |
| 3   | Own riders or pickup/Foodpanda only? | Own riders (rider PWA endpoints exist). Foodpanda orders can be logged with `source = foodpanda`                                                                                                                                                                                                      |
| 4   | Delivery radius and zone fees        | The two placeholder zones above                                                                                                                                                                                                                                                                       |
| 5   | Online payment at launch?            | COD only (`ALLOW_ONLINE_PAYMENTS=false`). The JazzCash/Easypaisa UI is testable in the mocks                                                                                                                                                                                                          |
| 6   | Who maintains the menu?              | Owner/manager via admin (and MCP)                                                                                                                                                                                                                                                                     |
| 7   | Item photography                     | A consistent 1:1 shoot is needed                                                                                                                                                                                                                                                                      |

## Technical assumptions (for the team, not the client)

- **Order statuses:** the contract uses the full §5.1 enum. The six customer-facing stages come from `toCustomerStage()`.
- **Additions beyond the architecture doc** (error codes, guest checkout fields, profile/address/staff/rider/hours/reviews/outbox endpoints, schema columns) are listed in `docs/ARCHITECTURE_ADDITIONS.md` §A4–A5.
- **Added beyond the architecture doc (prompt 3):** `PATCH /api/me/addresses/[id]` (edit + one default), paginated `GET /api/orders/mine?cursor=&limit=` → `OrdersPage`, `POST /api/contact` (Turnstile, rate-limited), `Customer.whatsappOptInAt/whatsappOptInSource` + `UpdateCustomerRequest.whatsappOptInSource`, `StoreStatus.holidays`, `Deal.promoCode`. Saving an address outside every zone is now allowed (warning only). Mock scenario `account_demo`.
- **Hreflang:** Urdu alternates are `?lang=ur`; `proxy.ts` renders that request in Urdu and sets the locale cookie.
- **Offline:** no service worker yet, so data already loaded stays browsable and checkout is disabled offline, but a cold reload while offline fails. Add a service worker with the PWA work in the backend phase. The install prompt needs no service worker in Chromium.
- **Maintenance:** `MAINTENANCE_MODE=true` makes `proxy.ts` show `/maintenance` for every page.
- **Build on low-memory machines:** `BUILD_CPUS=2 pnpm build` limits the static-generation workers (Windows ran out of commit memory with 11).
- **Locale** comes from a cookie (no `/ur` URL prefix), which keeps the §11 folder structure. Side effect: pages render dynamically, although the menu _data_ is still cached by tag. Move to an `[locale]` segment if fully static HTML is required.
- **CSP** allows `'unsafe-inline'` scripts (Next.js inline payload). Move to nonces via `proxy.ts` in the backend phase.
- **TypeScript 6** is pinned because typescript-eslint doesn't support TypeScript 7 yet.

## Staff apps (prompt 4)

**For the client:**

- **Manager alert:** who gets it when an order sits unaccepted past 6 minutes, and how? It is a WhatsApp message to which number? Today the board only shows "Manager alerted" (`managerAlertMinutes` in `mocks/fixtures/store.ts`), and orders auto-reject at 8 minutes.
- **Kitchen undo:** what should happen when the kitchen wants to undo a change that was already sent? Orders only move forward. A manager-PIN step-up endpoint is **not modelled**, so the kitchen board just says "ask a manager". Does the client want a PIN override on the kitchen tablet?
- **KOT printer:** which printer model? Browser printing to an 80mm thermal printer (`@page kot`, today) vs PrintNode or similar for silent printing.
- **WhatsApp tracking-link message** sent after manual orders (`trackingMessage` in `features/admin/manual.ts`, en + ur): confirm the wording. It needs Meta template approval if sent by the business API. The Urdu is machine-drafted.
- **Call-back flag:** confirm the rule. A COD order is flagged when it is ≥ 2.5× the customer's average order, or ≥ Rs 5,000 on a first order (`callBackFlag` in `mocks/db.ts`).
- **Refunds and exports:** confirm that refund approval and the reports CSV export are **owner-only** (managers can request refunds and view reports).
- **Sold-out reset:** "Sold out today" resets at **05:00 PKT**. Confirm the time (a late-night store closes at 02:00).
- **Rider app:** one rider per order. Cash settlement asks the manager to type the exact amount before marking it settled. Confirm both.

**For the team:**

- **Real QR code for TOTP enrolment:** the login screen shows a placeholder and the `otpauth://` secret. The backend can return the QR as an SVG.
- **Reports chart palette:** the brand has only two hues (blue, orange), so walk-in and Foodpanda use `orange-deep` and `muted`. The designer may want to pick a fifth colour.
- **Performance budget not met:** about 250 KB of JS against the ~150 KB target, and Lighthouse Perf 80–85 against ≥ 90 (see [PAGES › Performance](PAGES.md#performance)). Decide whether to invest in `zod/mini`, dropping client response validation in production, and lazy-loading the cart drawer and toaster.
- **Maintenance flag at runtime:** `MAINTENANCE_MODE` is an env var read by `proxy.ts`, so changing it needs a redeploy. Switching it at runtime needs Edge Config or something similar that the proxy can read.
- **Re-run Lighthouse against the real backend:** today's numbers come from `MOCK_API=server`.
