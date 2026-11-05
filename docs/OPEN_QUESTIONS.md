# Open questions for the client

Everything below is a placeholder or an assumption in the code today. Search the code for `TODO_CONFIRM`, `TBC` and `TODO` to find each one.

## Menu: two-price items (`TODO_CONFIRM` in `mocks/fixtures/menu.ts`)

The printed menu shows two prices for these items, but not what each price means. Today each one is modelled as two variants:

| Item(s)                                                                                                                | Prices                      | Current labels      | Question                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------- | --------------------------------------------------------- |
| Snow Salt, Masala, Arctic Heat Fries                                                                                   | 250/400, 250/400, 300/500   | Regular / Large     | Are these sizes? What are they called?                    |
| Mac and Cheese, BP Homemade (pasta), Golden Crunch                                                                     | 395/695                     | Regular / Large     | Same                                                      |
| Lava Burst                                                                                                             | 665/865                     | Single / Double     | Single vs double patty?                                   |
| Pizzas with a slash price inside one size (Street Fajita, Smoky Tikka S and L; Malai Magic, Full House, Burger Bomb S) | e.g. S 595/695, L 1695/1750 | Option A / Option B | What is the difference (crust? topping? chicken vs beef?) |
| Garlic Bread "C/P"                                                                                                     | 450/550                     | Classic / Cheese    | What do C and P stand for?                                |

## Menu: other

- **Descriptions:** all `null`. Need copy (EN + UR) for every item, or confirmation that names alone are fine.
- **Dip add-on limit:** dips are offered as add-ons (0–6 per item) on burgers, sandwiches, wraps, wings, fries, sides and pizzas. Not on pastas. Is the limit right? Which categories should offer dips?
- **Honey Glazed Wings:** Regular/Spicy modelled as a required choice at the same price. Correct?
- **Extra cheese:** data model ready (modifier group), no price. Which items, and what price?
- **Meals and combos:** data model ready (`Combo`, `FEATURE_COMBOS=false`), fixture empty. Any planned?
- **Drinks:** none on the menu we received. Do they sell drinks?
- **Photos:** only 9 photos for ~50 items. Items show their category photo. Dips and Sides have no photo yet. A consistent 1:1 shoot is needed (ARCHITECTURE §13 #7). Also: which pizza is in `pizza-small.jpg` and which in `pizza-big.jpg`?
- **Item name spellings:** "Pepperon Magic", "Sizzlin Mushroom", "BP's Best", "OG Anda Shami". Copied from the menu as-is. Confirm.
- **"Snow Salt Fries (plain fries)":** is "plain fries" part of the displayed name or just our note?
- **Urdu item names:** all null (UI falls back to English). Do they want Urdu names?

## Store (`mocks/fixtures/store.ts`, all `TBC`)

| Value               | Placeholder                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Street address      | `[ADDRESS TBC], Paradise City, Jhang Sadar`                                                                                                 |
| Map location        | Approximate Jhang centre (31.2695, 72.3181)                                                                                                 |
| Phone               | `+920000000000`                                                                                                                             |
| WhatsApp number     | `+920000000000`                                                                                                                             |
| Opening hours       | Every day 12:00 → 02:00 (past midnight)                                                                                                     |
| Holidays            | none                                                                                                                                        |
| Delivery fee        | Rs 100                                                                                                                                      |
| Minimum order       | Rs 500 (store and zone)                                                                                                                     |
| Max COD order value | Rs 10,000                                                                                                                                   |
| Delivery ETA        | 40 min + 20 min prep                                                                                                                        |
| Delivery zone       | One rectangle around Jhang city (lng 72.255–72.385, lat 31.225–31.335). Need real radius / polygons and per-zone fees (ARCHITECTURE §13 #4) |
| Social links        | Instagram, Facebook, TikTok: none (footer shows "TBC")                                                                                      |
| Legal pages         | Privacy, Terms, Refund policy: links exist, pages and copy needed                                                                           |

## Brand

- **Logo:** `components/ui/Logo.tsx` is a CSS recreation. Need the client's SVG logo.
- **Urdu brand name spelling:** drafted as "برف پانی". Confirm.
- **Urdu copy:** `lib/i18n/messages/ur.ts` is machine-drafted. Every string is marked `// TODO translate` and needs native review for tone.

## Product decisions carried from ARCHITECTURE §13

- Own riders vs pickup/Foodpanda only (#3).
- Online payment at launch (#5). COD is assumed; JazzCash/Easypaisa show as "Soon".
- Refund approval flow (#2). The mock implements "manager requests, owner approves".

## Technical assumptions made in the foundation (for the team, not the client)

- **Order statuses:** the contract uses the full backend enum from ARCHITECTURE §5.1. The six customer-facing stages (`received | preparing | out_for_delivery | ready_for_pickup | delivered | cancelled`) come from `toCustomerStage()` in `lib/contracts/order.ts`.
- **Error codes added** beyond the architecture doc: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `OTP_INVALID`, `OTP_EXPIRED`, `TURNSTILE_FAILED`, `DUPLICATE_ORDER_SUSPECTED`, `VERSION_CONFLICT`, `INVALID_TRANSITION`, `INTERNAL_ERROR`, plus the client-only `NETWORK_ERROR`.
- **Endpoints added** beyond ARCHITECTURE §3.1: `/api/store`, `/api/delivery/zones`, `/api/promos`, `/api/auth/logout`, `/api/me`, `/api/me/addresses`, and the full admin list in `docs/API_CONTRACT.md`.
- **Locale** comes from a cookie (no `/ur` URL prefix), which keeps the folder structure in ARCHITECTURE §11. Side effect: pages render dynamically; the menu _data_ is still cached by tag. Move to an `[locale]` segment if fully static HTML is required.
- **Server-side mocking:** MSW runs in the browser only. Server Component reads (menu, store status) against mocks will need `msw/node` in `instrumentation.ts` when prompt 2 adds them (handlers already match absolute URLs).
- **Tailwind v4** keeps tokens in CSS (`app/globals.css` `@theme`); there is no `tailwind.config.ts`.
- **TypeScript 6** is pinned because typescript-eslint does not support TypeScript 7 yet.
