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

| Value                 | Placeholder                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Street address        | `[ADDRESS TBC], Paradise City, Jhang Sadar`                                                                                                                                   |
| Map location          | Approximate Jhang centre (31.2695, 72.3181)                                                                                                                                   |
| Phone / WhatsApp      | `+920000000000`                                                                                                                                                               |
| Opening hours         | Mon–Thu 12:00–23:30; Fri–Sun 12:00–02:00 (past midnight)                                                                                                                      |
| Holiday               | 2027-03-23 (placeholder)                                                                                                                                                      |
| Minimum order         | Rs 500 (store), Rs 500 inner zone, Rs 1,000 outer zone                                                                                                                        |
| Max COD order value   | Rs 10,000                                                                                                                                                                     |
| Delivery zones        | **Inner Jhang** (priority 1, Rs 100, ~35 min) inside **Outer Jhang** (priority 0, Rs 200, ~50 min). Both are rectangles. We need real polygons and fees (ARCHITECTURE §13 #4) |
| Prep time estimate    | 20 min                                                                                                                                                                        |
| Social links          | Instagram, Facebook, TikTok: none (the footer shows "TBC")                                                                                                                    |
| Legal pages           | Privacy, Terms, Refund policy: the links exist; pages and copy are needed                                                                                                     |
| Payment gateway hosts | `sandbox.jazzcash.com.pk`, `payments.jazzcash.com.pk`, `easypay.easypaisa.com.pk` in the CSP `form-action`. Confirm with the merchant accounts                                |

## Brand

- **Logo:** `components/ui/Logo.tsx` is a CSS recreation. We need the client's SVG logo.
- **Urdu brand name spelling:** drafted as "برف پانی". Please confirm.
- **Urdu copy:** `lib/i18n/messages/ur.ts` is machine-drafted. Every string is marked `// TODO translate` and needs a native speaker's review for tone.

## Open decisions (ARCHITECTURE §13)

| #   | Decision                             | Current assumption in the frontend                                                               |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | Combos in v1?                        | Off (`FEATURE_COMBOS=false`). Deals add normal items at normal prices                            |
| 2   | Refund approval and method           | Manager requests, owner approves, manual reversal in the merchant portal (mocked like that)      |
| 3   | Own riders or pickup/Foodpanda only? | Own riders (rider PWA endpoints exist). Foodpanda orders can be logged with `source = foodpanda` |
| 4   | Delivery radius and zone fees        | The two placeholder zones above                                                                  |
| 5   | Online payment at launch?            | COD only (`ALLOW_ONLINE_PAYMENTS=false`). The JazzCash/Easypaisa UI is testable in the mocks     |
| 6   | Who maintains the menu?              | Owner/manager via admin (and MCP)                                                                |
| 7   | Item photography                     | A consistent 1:1 shoot is needed                                                                 |

## Technical assumptions (for the team, not the client)

- **Order statuses:** the contract uses the full §5.1 enum. The six customer-facing stages come from `toCustomerStage()`.
- **Additions beyond the architecture doc** (error codes, guest checkout fields, profile/address/staff/rider/hours/reviews/outbox endpoints, schema columns) are listed in `docs/ARCHITECTURE_ADDITIONS.md` §A4–A5.
- **Locale** comes from a cookie (no `/ur` URL prefix), which keeps the §11 folder structure. Side effect: pages render dynamically, although the menu _data_ is still cached by tag. Move to an `[locale]` segment if fully static HTML is required.
- **Server-side mocking:** MSW runs in the browser. Server Component reads against mocks will need `msw/node` in `instrumentation.ts` when prompt 2 adds them (the handlers already match absolute URLs).
- **CSP** allows `'unsafe-inline'` scripts (Next.js inline payload). Move to nonces via `proxy.ts` in the backend phase.
- **TypeScript 6** is pinned because typescript-eslint doesn't support TypeScript 7 yet.
