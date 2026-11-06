# Barraf Paani — web ordering and staff apps

The frontend for Barraf Paani, a street-food restaurant in Jhang. It has two parts:

- **Customer site:** menu, cart, checkout (COD, with JazzCash/Easypaisa behind a flag), live order tracking, accounts, deals and table bookings, in English and Urdu (RTL).
- **Staff apps under `/admin`:** order board, manual orders, menu/deals/promos/zones/settings, customers, refunds, riders, reviews, notifications, reports, and two installable PWAs: the kitchen board and the rider app.

Stack: Next.js 16 (App Router), TypeScript, Tailwind v4 (tokens in `tailwind.config.ts`), TanStack Query, zustand, Zod contracts, next-intl (en/ur), MSW mocks. **There is no backend yet.** Every `/api` call is answered by the mocks, against the contract in [docs/API_CONTRACT.md](docs/API_CONTRACT.md). The backend team starts from [docs/BACKEND_HANDOFF.md](docs/BACKEND_HANDOFF.md).

## Setup

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

`.env.development` turns the mocks on (`NEXT_PUBLIC_USE_MOCKS=true`). Copy `.env.example` to `.env.local` to override values.

## Scripts

| Script                         | What it does                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `pnpm dev`                     | Dev server with the MSW mocks                                                          |
| `pnpm build`, `pnpm start`     | Production build and server                                                            |
| `pnpm lint`                    | ESLint, including the project rules (no hex, `fetch` only in `lib/api`, money ints, …) |
| `pnpm typecheck`               | `tsc --noEmit`                                                                         |
| `pnpm format`                  | Prettier (with the Tailwind class sorter)                                              |
| `pnpm test`, `pnpm test:watch` | Vitest unit + component tests                                                          |
| `pnpm test:e2e`                | Playwright on the mocks, desktop + mobile (starts its own dev server on :3100)         |
| `pnpm audit:ui`                | Consistency audit, `scripts/audit.sh` (see [PAGES › Audits](docs/PAGES.md#audits))     |
| `pnpm check`                   | lint + typecheck + audit:ui + test (what CI's first job runs)                          |
| `pnpm analyze`                 | Next bundle analyzer                                                                   |

Helper scripts in `scripts/`. Run them against a production server started with `MOCK_API=server`:

- `js-budget.mjs`: JS per page
- `js-chunks.mjs`: biggest chunks on a page
- `lcp-probe.mjs`: observed FCP and LCP
- `console-check.mjs`: hydration and console errors
- `seed-order.mjs`: places an order and prints its tracking token

## Environment variables

`NEXT_PUBLIC_*` values ship to the browser, so **never put secrets in them**.

| Variable                                           | Default                 | Meaning                                                                                                                                                                                                    |
| -------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_USE_MOCKS`                            | `true` in dev           | MSW answers every `/api` call in the browser; server reads go to the mock bridge `app/api/[...path]`. `false` once the real backend exists                                                                 |
| `NEXT_PUBLIC_ALLOW_ONLINE_PAYMENTS`                | `false`                 | JazzCash/Easypaisa at checkout. COD only at launch; set `true` to test the payment UI on the mocks (e2e does)                                                                                              |
| `NEXT_PUBLIC_SITE_URL`                             | `http://localhost:3000` | Canonical URL for the sitemap, OG, JSON-LD, `llms.txt`                                                                                                                                                     |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                   | empty                   | Cloudflare Turnstile; empty means a mock token in mock mode                                                                                                                                                |
| `NEXT_PUBLIC_POSTHOG_KEY`                          | empty                   | Analytics; empty means events are only logged to the console                                                                                                                                               |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENV` | empty                   | Optional Sentry. Off and never loaded when empty; scrubs tokens and phone numbers                                                                                                                          |
| `API_BASE_URL`                                     | this origin             | Server only. Where Server Component reads go                                                                                                                                                               |
| `MAINTENANCE_MODE`                                 | `false`                 | Server only. Every customer page shows `/maintenance`; staff apps keep working                                                                                                                             |
| `BUILD_CPUS`                                       | empty                   | Limits the static-generation workers in `next build` (low-memory machines: `BUILD_CPUS=2`)                                                                                                                 |
| `MOCK_API=server`                                  | unset                   | Not in `.env.example`. With browser mocks off, the mock bridge also serves the browser's `/api` calls, giving a production build that server-renders real content without a backend (Lighthouse, previews) |

## Feature flags (`lib/flags.ts`)

- `FEATURE_COMBOS = false`: combo pricing is off in v1. Deals add normal items at normal prices.
- `ALLOW_ONLINE_PAYMENTS`: set from `NEXT_PUBLIC_ALLOW_ONLINE_PAYMENTS`.
- `USE_MOCKS`: set from `NEXT_PUBLIC_USE_MOCKS`.

## Mock scenarios

Add `?scenario=<name>` to any URL, or use the floating scenario panel in dev. The scenario sticks for the browser tab (sessionStorage). Full list with descriptions: [`mocks/scenario.ts`](mocks/scenario.ts).

| Area                    | Scenarios                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Store                   | `happy`, `store_closed`, `paused`, `live_sold_out`                                                                                                     |
| Checkout                | `item_sold_out_mid_checkout`, `outside_zone`, `below_min`, `cod_not_allowed`, `requires_otp`, `otp_rate_limited`, `preorder_invalid`, `duplicate_cart` |
| Network and idempotency | `slow_3g`, `network_fail`, `double_tap`, `idempotency_conflict`, `in_progress`                                                                         |
| Payments                | `payment_success`, `payment_fail`, `payment_pending_stuck`, `payment_expired`, `late_payment_success`                                                  |
| After the order         | `order_rejected`, `auto_rejected`, `too_late_to_cancel`                                                                                                |
| Deals and bookings      | `deals_demo`, `booking_confirmed`, `booking_declined`, `event_full`                                                                                    |
| Accounts                | `account_demo` (12 past orders, 2 addresses, a sold-out item for reorder review)                                                                       |
| Staff                   | `admin_demo` (2 weeks of orders, live board, bookings, a refund, rider cash), `mixed_sources`, `version_conflict`                                      |

### Mock test values

- **Customer OTP and staff TOTP:** `123456`.
- **Staff logins:** password `barraf123` for `owner@`, `manager@`, `cashier@`, `kitchen@` and `rider@barrafpaani.test`. Owner and manager are asked for TOTP; the owner is already enrolled, and the manager enrols on first login.
- **Promo codes:**
  - `MOCK10`: 10% off
  - `MOCKFLAT`: Rs 100 off over Rs 1,000
  - `MOCKSHIP`: free delivery
  - `MOCKOLD`: expired

### Staff apps quick start

1. Open `http://localhost:3000/admin/login?scenario=admin_demo`.
2. Log in as one of the staff above. Each role lands on its own home: front of house → `/admin/orders`, kitchen → `/admin/kitchen`, rider → `/admin/rider`. A section the role can't open redirects home; the map is in `lib/admin-access.ts`.
3. The kitchen and rider apps have their own manifests and can be installed as PWAs.

## Living style guide

Run `pnpm dev`, then open **`/dev/ui`**. It shows every token, motif and component in every state. It returns 404 in production builds.

## Folder map

```
app/            routes: (site) customer pages, admin/ staff apps, api/[...path] mock bridge, dev/ui
components/     ui/ design system, site/ shell, admin/ staff apps (kit.tsx, OrderCard, boards…), one folder per customer area
features/       hooks + pure logic per domain (menu, cart, checkout, tracking, deals, account, admin/…)
lib/            api/ (the only place that knows URLs), realtime/, contracts/ (Zod), i18n/, seo/, money, phone, flags
mocks/          MSW handlers, in-memory db, fixtures, scenarios
stores/         zustand: cart, ui
e2e/            Playwright specs
scripts/        audit.sh, JS budget / LCP / console probes, seed-order
docs/           see below
```

## Docs

| Doc                                                      | What                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| [ARCHITECTURE](docs/ARCHITECTURE.md)                     | The source spec: rendering, layers, contract, rules, perf targets        |
| [ARCHITECTURE_ADDITIONS](docs/ARCHITECTURE_ADDITIONS.md) | Everything added beyond the spec                                         |
| [API_CONTRACT](docs/API_CONTRACT.md)                     | Endpoints and types (`lib/contracts` is the code version)                |
| [DESIGN](docs/DESIGN.md)                                 | Design language, tokens, components, staff apps, accessibility           |
| [PAGES](docs/PAGES.md)                                   | Every route, its states, plus audits, a11y, performance, tests, security |
| [BACKEND_HANDOFF](docs/BACKEND_HANDOFF.md)               | What the backend has to build and how to switch the mocks off            |
| [OPEN_QUESTIONS](docs/OPEN_QUESTIONS.md)                 | Placeholders and decisions waiting on the client or team                 |

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests. It has two jobs:

1. **checks:** lint, typecheck, `audit:ui`, Vitest.
2. **e2e:** Playwright (Chromium, desktop + mobile) on the mocks, with `retries: 1`. On failure the report and traces are uploaded as an artifact.

Node 24, pnpm 12.
