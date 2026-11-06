# Barraf Paani — Design language

Living reference: run `pnpm dev` and open **`/dev/ui`**. Every token, motif and component below is shown there in every state.

Implementation: token **values** live in `tailwind.config.ts` (the single source; `theme`, not `extend`, so Tailwind's default colours, shadows and radii don't exist). A small plugin there also publishes them as CSS variables (`var(--color-ink)`, `var(--shadow-hard)`, …) for SVGs and inline styles. `app/globals.css` loads it with `@config` and holds the motif utilities (`grid-paper`, `rings`, `halftone`, `headline`, `press`) and base styles. ESLint rejects hex literals everywhere except `tailwind.config.ts`. **Every screen uses these tokens; no ad-hoc hex values anywhere.**

---

## Brand personality

Loud, playful, comic-sticker street food. "Made fresh. Served furious." Their printed menu boards are the source of truth: bright sky-blue and orange panels, white sticker labels with thick dark outlines tilted a few degrees, yellow lightning bolts on either side of every heading, grid-paper backgrounds, wavy blob dividers, halftone dots. It must look premium and deliberate, not childish: generous spacing, strict alignment, consistent stroke widths.

## Color tokens

| Token         | Hex       | Use                                                                              | Tailwind                 |
| ------------- | --------- | -------------------------------------------------------------------------------- | ------------------------ |
| `blue`        | `#1C9AD6` | Primary brand panel, hero background, active toggles                             | `bg-blue`                |
| `blue-deep`   | `#0B6BA6` | Links, small labels on white, category strip                                     | `text-blue-deep`         |
| `blue-light`  | `#6CCFFF` | "BARRAF" wordmark fill, links on dark                                            | `text-blue-light`        |
| `orange`      | `#F26522` | Primary CTA, panels alternating with blue                                        | `bg-orange`              |
| `orange-deep` | `#D9551A` | Inner panel (e.g. Loaded Fries box)                                              | `bg-orange-deep`         |
| `orange-blob` | `#E2581C` | Decorative circles on orange                                                     | `bg-orange-blob`         |
| `yellow`      | `#FFD43B` | Lightning bolts, "PAANI" wordmark, highlight tags, selected chips, secondary CTA | `bg-yellow`              |
| `ink`         | `#14181F` | ALL outlines, hard shadows, body text, dark cart bar, footer                     | `border-ink`, `text-ink` |
| `paper`       | `#F7FAFC` | Page background                                                                  | `bg-paper`               |
| `grid-line`   | `#DCE8F0` | Grid-paper lines                                                                 | `border-grid-line`       |
| `muted`       | `#4A5560` | Secondary text on light backgrounds (passes 4.5:1)                               | `text-muted`             |
| `whatsapp`    | `#25D366` | WhatsApp buttons only                                                            | `bg-whatsapp`            |
| `white`       | `#FFFFFF` | Sticker labels, cards, text on blue/orange                                       | `bg-white`               |

Text on orange and blue panels is white, set large (Bebas Neue at 24px or more) so it is readable. Small text (under 18px) on orange or blue must be ink, not white.

Additional contrast rules found while building:

- WhatsApp green with white text fails contrast, so the WhatsApp button uses **ink** text.
- `orange-deep` on white is about 3.6:1, so it is fine for prices at Bebas display sizes but not for small text. Error messages use ink text with an orange "!" marker.
- **Primary button text:** white on orange only at `size="lg"`; at `sm` and `md` it is ink (`components/ui/Button.tsx`).
- **Active states** (active nav link, the selected `SegmentedToggle` segment) use `blue-deep` with white text, not `blue`.
- **Price chips on orange/blue panels** (`PriceChip tone="panel"`) get a `bg-ink/35` backing behind the white text.

## Typography (self-hosted via `next/font`, only these weights)

- **Lilita One 400** → `font-display`: hero headlines, big CTAs, wordmark, page titles. Big headlines get a 3px ink text stroke (`-webkit-text-stroke` + `paint-order: stroke fill`) and a hard `5px 5px 0 ink` text-shadow → utility **`headline`** (`headline-sm` = 2px stroke / 3px shadow for smaller display text).
- **Poppins 800/900** → `font-sticker font-black`: sticker headings ("Fries", "Burgers", "Wings"…) exactly like their menu boards.
- **Bebas Neue 400** → `font-price uppercase tracking-[0.02em]`: item names and prices. **Prices are always Bebas.** Prices use Western digits in both locales.
- **DM Sans 400/500/700** → `font-body` (default on `body`): body copy, forms, helper text.
- **Urdu:** **Noto Nastaliq Urdu** (body) and **Lalezar** (display/headings). They are attached only when the locale is `ur` (no download for English users). The Latin fonts have no Arabic glyphs, so Urdu text falls through to them automatically inside the same `font-*` stacks. `:lang(ur) body` sets line-height **1.9** for Nastaliq.

Files: `lib/fonts.ts` (declarations), `tailwind.config.ts` (`font-display` / `font-sticker` / `font-price` / `font-body` stacks), `app/layout.tsx` (applied as CSS variables on `<html>`).

## Shape and depth

- Outline: `3px solid ink` (`border-3 border-ink`) on cards, buttons, inputs, stickers, photos; 2px on small chips.
- Shadow: **hard offset shadows only**, never blurred.

  | Utility              | Value              | Use                               |
  | -------------------- | ------------------ | --------------------------------- |
  | `shadow-hard-sm`     | `3px 3px 0 ink`    | small chips, toggles              |
  | `shadow-hard`        | `4px 4px 0 ink`    | buttons                           |
  | `shadow-hard-md`     | `6px 6px 0 ink`    | cards                             |
  | `shadow-hard-lg`     | `8px 8px 0 ink`    | menu boards, dialogs              |
  | `shadow-sticker`     | `0 6px 0 ink`      | sticker headings (straight down)  |
  | `shadow-hard-orange` | `4px 4px 0 orange` | dark cart bar, dark button, toast |

- Radius: `rounded-chip` 10 · `rounded-sticker` 12 · `rounded-input` 14 · `rounded-button` 16 · `rounded-card` 22 · `rounded-panel` 28 · `rounded-full` 999 (logo, pills).
- Rotation: sticker headings −2° to +4°; floating price tags ±5°. Never rotate body text or inputs.

## Signature motifs (`components/ui/motifs.tsx`, `StickerHeading.tsx`, `Logo.tsx`)

| Component        | What it is                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GridPaper`      | 22px grid of `grid-line` on `paper` (CSS background, no image). Utility: `grid-paper`.                                                                                                                       |
| `Rings`          | Concentric rings on `blue` (repeating-radial-gradient, white at ~13% opacity, 22px bands), behind the hero and page headers, like their menu cover. Utility: `rings`.                                        |
| `Halftone`       | Ink dots at 7px pitch, 60% opacity. A strip under sticker headings. Utility: `halftone`.                                                                                                                     |
| `Bolt`           | Yellow lightning bolt, ink 1.5px stroke, SVG.                                                                                                                                                                |
| `BoltPair`       | A big and a small bolt, angled outward. Put one on each side of a heading (`side="start"` / `"end"`). **Mirrored in RTL** (the start side flips with `dir="rtl"`).                                           |
| `StickerHeading` | White label, ink outline, `0 6px 0` shadow, Poppins 900, tilted, with `BoltPair` and optional `Halftone`. Props: `tilt`, `align`, `size` (`sm`/`md`/`lg`), `as`, `bolts`, `halftone`.                        |
| `Wave`           | SVG wavy divider between orange/blue sections. Presets: `gentle`, `choppy`, `blob`. Colour via `fillClassName` (e.g. `fill-orange`).                                                                         |
| `Blob`           | Decorative circle in `orange-blob` (on orange) or translucent blue-light (on blue). Position absolutely.                                                                                                     |
| `Logo`           | Round orange badge, ink outline + hard shadow, "BARRAF" in `blue-light` and "PAANI" in `yellow`, both ink-stroked Lilita One. `// TODO: replace with client SVG logo`. `Wordmark` is the big footer version. |

## Core components (`components/ui`)

| Component                                     | File                  | Notes                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button` + `buttonClasses()`                  | `Button.tsx`          | Variants `primary` (orange), `secondary` (yellow), `ghost` (white), `dark`, `whatsapp`; sizes `sm`/`md`/`lg`; `loading` (spinner + `aria-busy`, blocks double taps), `block`. **Pressed state:** moves by its shadow offset and the shadow goes to 0, like pressing a sticker into the page (`.press` utility; `--press-x/--press-y` set the offset). Use `buttonClasses()` on `<Link>`. |
| `PriceChip`                                   | `PriceChip.tsx`       | Outlined price button. `tone="panel"` (white on orange/blue) or `"paper"`. On tap it flashes yellow and bounces (`scale 1.12, rotate −4°`, via Web Animations so focus is kept). `selected` = yellow.                                                                                                                                                                                    |
| `SegmentedToggle`                             | `SegmentedToggle.tsx` | Delivery/Pickup. Native radios (arrow keys, screen readers). Active segment is `blue-deep` (contrast).                                                                                                                                                                                                                                                                                   |
| `Stepper`                                     | `Stepper.tsx`         | Quantity −/+ with 44px targets, Bebas number, polite live region.                                                                                                                                                                                                                                                                                                                        |
| `Card`, `MenuBoard`, `Panel`                  | `surfaces.tsx`        | Card: white, 3px, 22px radius, 6px shadow, optional `interactive` press. MenuBoard: grid paper, 28px radius, 8px shadow. Panel: `orange` / `orange-deep` / `blue` (rings), optional `blobs`.                                                                                                                                                                                             |
| `Sheet`, `Drawer`                             | `Dialog.tsx`          | Native `<dialog>` + `showModal()`: background inert, focus moved in and restored, Esc closes, backdrop click closes. Sheet = bottom sheet on mobile, centered modal on desktop. Drawer = slides from the inline-end edge (flips in RTL). Enter animation via `@starting-style`, no JS animation library.                                                                                 |
| `Toast` / `toast()`                           | `Toast.tsx`           | Dark pill with a yellow bolt, `aria-live="polite"`. Call `toast('…')` from anywhere.                                                                                                                                                                                                                                                                                                     |
| `Badge`                                       | `Badge.tsx`           | Count bubble; changing `bumpKey` plays the bump. Decorative (parent carries the accessible count).                                                                                                                                                                                                                                                                                       |
| `Input`, `TextArea`, `Checkbox`, `RadioCards` | `form.tsx`            | Visible labels, hints, friendly errors wired with `aria-invalid` / `aria-describedby`. Work with React Hook Form `register` (React 19 ref-as-prop). Checkbox unchecked by default (WhatsApp opt-in rule).                                                                                                                                                                                |
| `Skeleton`, `EmptyState`, `ErrorState`, `Tag` | `states.tsx`          | Skeleton = grid-paper shimmer. ErrorState has `onRetry` and `offline`. Tag tones: yellow, blue, white, ink, orange; optional tilt.                                                                                                                                                                                                                                                       |
| `Odometer`                                    | `Odometer.tsx`        | Number roll for totals; screen readers get the plain value.                                                                                                                                                                                                                                                                                                                              |
| `PhoneInput`                                  | `PhoneInput.tsx`      | Shows Pakistani `03XX XXXXXXX` while typing; emits E.164 `+923…` (or null) via `lib/phone.ts` `normalizePkPhone`. Accepts pasted `+92` / `0092` / `92` forms                                                                                                                                                                                                                             |
| `OtpInput`                                    | `OtpInput.tsx`        | 6 digit boxes: auto-advance, backspace goes back, arrow keys, paste fills all, `autocomplete="one-time-code"` for SMS autofill. Digits stay LTR in Urdu                                                                                                                                                                                                                                  |
| `StatusTag` / `SourceTag`                     | `StatusTag.tsx`       | One tag per `order_status` (all 12): icon + label + lightness, never colour alone. `SourceTag` shows Website / WhatsApp / Phone / Walk-in / Foodpanda everywhere staff see orders                                                                                                                                                                                                        |
| `Countdown`                                   | `Countdown.tsx`       | mm:ss / h:mm:ss to a target time (payment expiry, 8-minute accept window), `onExpire`. Screen readers get a static label, not per-second chatter                                                                                                                                                                                                                                         |
| `MapPinPicker`                                | `MapPinPicker.tsx`    | The `MapPinPickerProps` interface (value, onChange, center, message) plus a placeholder: grid-paper board with a pin, "Use my location", and manual coordinates. The real Google Maps/Mapbox picker (§10) drops in behind the same props                                                                                                                                                 |

## Motion language (`lib/motion.ts`)

| Preset                                   | Spec                                                                                                   | Implementation                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `press`                                  | translate by shadow offset over 120ms; release springs back                                            | Framer `whileTap` preset; CSS twin `.press` (used by buttons, so no JS on the hot path)                             |
| `pop`                                    | scale 0.85→1 with overshoot (`cubic-bezier(.2,1.4,.4,1)`, 260ms)                                       | Framer variants; CSS `animate-pop`                                                                                  |
| `stamp`                                  | scale 1.6→1 with −12° rotation, 380ms                                                                  | Framer variants; CSS `animate-stamp`. For "Done" labels and success marks                                           |
| `bump`                                   | badge scale 1→1.4→1 with −10° wobble, 420ms                                                            | Framer keyframes; `Badge` uses WAAPI                                                                                |
| `flyToCart(fromRect, toRect, imageSrc?)` | yellow ink-outlined dot (or the item's thumbnail) arcs to the cart icon in 620ms, then the badge bumps | WAAPI on a detached overlay (X linear, Y with a dip-up ease = arc). Aims at `#cart-target`. Fires `CART_BUMP_EVENT` |
| `stagger` / `staggerItem`                | list items slide in 40ms apart, 8px travel                                                             | Framer variants                                                                                                     |
| `Odometer`                               | number roll for totals                                                                                 | CSS transitions                                                                                                     |

- **Page transitions:** React `<ViewTransition>` wraps the site `<main>` (route navigations cross-fade, 200ms). Shared element for the item photo (menu → item detail): wrap both images in `<ViewTransition name={itemPhotoTransitionName(slug)} share="morph" default="none">`. Browsers without View Transitions get a 200ms fade (`.page-fade`).
- **Reduced motion:** a global `prefers-reduced-motion` rule collapses CSS animations/transitions and view transitions; `flyToCart`, `PriceChip` and `Badge` check it before animating; Framer subtrees must be wrapped in `<MotionConfig reducedMotion="user">`.
- Nothing longer than 700ms blocks interaction. Never animate layout on the critical add-to-cart path (the cart store updates instantly; the fly is a detached overlay).
- **Bundle rule:** Framer Motion is only imported by pages that animate with it (`lib/motion.ts` imports Framer _types_ only). The shell uses CSS/WAAPI.

## Voice and copy

Short, punchy, confident. Headlines: "Made fresh. Served furious.", "What's the craving?", "Order placed!", "Cooking it furious". Errors are friendly, never blamey. Every string goes through next-intl (`lib/i18n/messages/en.ts`; `ur.ts` holds machine-drafted Urdu marked `// TODO translate`). Every API error code has copy under `errors.<CODE>`.

## Accessibility baseline

- Visible focus (`app/globals.css`, `:focus-visible`): **3px ink outline, offset 4px, plus a 4px yellow ring** (through Tailwind's ring variable, so hard shadows keep it). The outline turns white on `bg-ink` surfaces (kitchen board, footer, cart bar). One style everywhere, customer and staff.
- Contrast: see the rules under Color tokens (primary text ink below `lg`, `blue-deep` for active states, `bg-ink/35` behind panel price chips). Axe reports 0 serious or critical issues on every page ([PAGES › Accessibility](PAGES.md#accessibility)).
- Touch targets ≥ 44px. Skip link to `#main`.
- Native controls underneath custom visuals (radios, checkboxes, `<dialog>`).
- RTL: layout uses logical properties (`ms-`, `me-`, `start-`, `end-`, `text-start`), so `dir="rtl"` flips it.

## Site pages and system states (prompt 3)

| Piece                           | File                                         | Notes                                                                                                                 |
| ------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PageHeader`                    | `components/site/PageHeader.tsx`             | Rings header with the page title as a big tilted sticker, optional white display subline and actions                  |
| `SiteShell`                     | `components/site/SiteShell.tsx`              | Header, offline + store banners, main, footer (business facts), cart UI, install prompt. Used by `(site)` and the 404 |
| `SystemScreen`, `DroppedBucket` | `components/site/SystemScreens.tsx`          | 404 / error / maintenance frame; huge stroked Lilita "404"; knocked-over fries bucket                                 |
| `FactsBlock`                    | `components/site/FactsBlock.tsx`             | "Barraf Paani at a glance" from `lib/business-facts.ts` (About in full, footer on desktop)                            |
| Account screens                 | `components/account/*`                       | Login (OTP states), profile, receipt-card history + reorder review sheet, address cards with label sticker icons      |
| Deals, booking, contact         | `components/deals/*`, `components/contact/*` | Coupon stickers (dashed cut line, notches), comic-poster events, booking sheet, booking status sticker, hours table   |
| About, FAQ, legal               | `components/about/*`, `faq/*`, `legal/*`     | Masonry gallery + lightbox, click-to-load reel facades, sticker accordions, 68ch legal layout with sticky contents    |

- **RTL tilt:** inline sticker rotations use `tilt(deg)` from `lib/tilt.ts` (`calc(deg * var(--dir))`, `--dir` is −1 under `[dir=rtl]`), so tilts mirror in Urdu.
- **Language switch:** `[data-sticker]` labels (StickerHeading, Tag) flip like cards when the locale changes (`LocaleFlip`, WAAPI); instant under reduced motion.
- **Urdu line height:** `:lang(ur)` lifts `leading-none/tight/6/snug` to 1.6 so Nastaliq and Lalezar never clip inside stickers, chips and buttons.
- **LTR values in Urdu:** wrap standalone numbers, prices and phones in `dir="ltr"`; inside translated sentences the `ur` messages use `⁦…⁩` isolates.
- **Mobile:** `viewport-fit=cover` + safe-area padding on the header, cart bar and footer; the cart bar hides while the keyboard is open; `body { overflow-x: clip }` guards against tilted stickers causing sideways scroll; haptics (`lib/haptics.ts`) on add-to-cart and order placed.

## Staff apps (prompt 4)

Same tokens, fonts and motifs as the customer site, but tuned for a busy counter and greasy fingers.

- **Surfaces:** data areas are plain `paper` / white cards. No `GridPaper` behind tables or boards; grid paper appears only on the zone map.
- **Touch targets:** 56px (`min-h-14`) for buttons, tabs and switches, more than the site's 44px.
- **Type:** Lilita One (`font-display`) for **page titles only** (`AdminPage`). Bebas (`font-price`) for order numbers, prices, totals and timers, always `dir="ltr"` with tabular numbers. Everything else is DM Sans.
- **`StatusTag` / `SourceTag`** (`components/ui/StatusTag.tsx`): every order shows its status and source as icon + label + lightness, never colour alone. Sources: WEB (white, globe), WHATSAPP (whatsapp green, chat), PHONE (yellow, phone), WALK-IN (paper, person), FOODPANDA (paper with a dashed border, bag).

### Kit (`components/admin/kit.tsx`, `icons.tsx`)

| Piece                 | Notes                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AdminPage`           | Page frame: Lilita title, optional actions                                                                                                                                                                                     |
| `Panel`               | White card, ink outline, hard shadow                                                                                                                                                                                           |
| `Money`               | Bebas, LTR, tabular rupees                                                                                                                                                                                                     |
| `Tabs` / `TabPanel`   | ARIA tabs; arrow keys follow reading direction (flipped in RTL); optional count bubble                                                                                                                                         |
| `ConnectionDot`       | Live / reconnecting / offline, as dot + label                                                                                                                                                                                  |
| `Switch`              | 56px row switch (native checkbox underneath)                                                                                                                                                                                   |
| `ConfirmSheet`        | Confirmation for risky actions: optional **required reason**, optional **typed confirmation** (the button unlocks only when the exact text is typed, e.g. `ANONYMIZE`, or the cash amount), or **blocked** with an explanation |
| `usePrint()`          | Renders a ticket into `#print-root`, opens the print dialog, then clears it                                                                                                                                                    |
| `Icon`, `StickerIcon` | `icons.tsx`: one stroke icon set for nav and actions                                                                                                                                                                           |

### Order card (`components/admin/OrderCard.tsx`)

- A new `placed` order **flashes yellow** (`animate-flash`, motion-safe only) and shows a **countdown to auto-reject** (store setting, 8 min in the mocks).
- After the manager-alert mark (6 min in the mocks), the card turns **orange** with a "Manager alerted" label.
- A **call-back flag** marks COD orders that are far above the customer's usual spend.
- The order number and total are big Bebas. Lines, notes and modifiers are in `OrderLines`.

### Kitchen board (`components/admin/KitchenBoard.tsx`)

An **ink board** (`bg-ink`, white text, white focus outline), landscape and fullscreen as a PWA. Big tickets with lines in large type. Bebas timers. Customer phone numbers are masked. Wake lock keeps the screen on. Changes made offline go into a queue and are sent on reconnect.

### Print (`components/admin/print.tsx`, `app/globals.css`)

`KotTicket`, `ReceiptTicket` and `BookingsSheet` render into `#print-root`. In `@media print`, only `#print-root` is shown. KOT and receipt tickets use the named page `@page kot` (80mm wide, 3mm margins, 74mm content) for thermal printers. The bookings sheet prints on a normal page.

### Report charts (`components/admin/ReportCharts.tsx`)

Chart.js, loaded with a dynamic import on `/admin/reports` only. Series colours come from `SERIES_TOKENS` = `blue-deep`, `orange`, `blue`, `orange-deep`, `muted`, in that order. The order is fixed and never cycled, so each colour stays with its entity. The palette was validated with the dataviz validator (colour-vision deficiency, normal vision and contrast all pass). Every chart has a legend and a **table view**, so no number depends on colour alone. The brand has only two hues, so walk-in and Foodpanda fall back to `orange-deep` / `muted` (see OPEN_QUESTIONS).
