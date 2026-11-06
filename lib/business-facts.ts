/**
 * ONE source of truth for the public business facts (docs/ARCHITECTURE_ADDITIONS.md §A3).
 * Every page, the footer, JSON-LD, /llms.txt and the "at a glance" block read from here, so the
 * name, address and phone are identical everywhere (and must match the Google Business Profile).
 *
 * `buildFacts` is pure (unit tested). `getBusinessFacts` is the server read: store settings
 * (~30 s cache) + menu (tag `menu`), falling back to the static SITE values.
 */
import { api } from '@/lib/api';
import type { Holiday, Menu, OpeningHours, StoreStatus } from '@/lib/contracts';
import { ALLOW_ONLINE_PAYMENTS } from '@/lib/flags';
import { formatAmount } from '@/lib/format';
import { SITE, SITE_URL, waHref } from '@/lib/site';

export interface BusinessFacts {
  name: string;
  tagline: string;
  url: string;
  address: typeof SITE.addressParts & { full: string };
  geo: { lat: number; lng: number };
  /** E.164. store_settings.shop_phone when available. */
  phone: string;
  whatsapp: string;
  whatsappUrl: string;
  mapsUrl: string;
  googleReviewUrl: string | null;
  googleProfileUrl: string | null;
  openingHours: OpeningHours[];
  /** Upcoming closures. */
  holidays: Holiday[];
  deliveryArea: string;
  /** Plain-language payment methods (English; the UI translates its own copy). */
  payments: string[];
  /** e.g. "Rs 95–1,750", from the live menu. Null when the menu is unavailable. */
  priceRange: string | null;
  cuisine: string[];
  knownFor: string[];
  /** Top-level menu categories (English names) for llms.txt and the facts block. */
  categories: string[];
  acceptsReservations: true;
  menuUpdatedAt: string | null;
  socials: string[];
}

/** Lowest and highest variant price of active items. */
export function priceRangeOf(menu: Menu): [number, number] | null {
  const prices = menu.items
    .filter((i) => i.isActive)
    .flatMap((i) => i.variants.map((v) => v.price))
    .filter((p) => p > 0);
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : null;
}

export function buildFacts(status: StoreStatus | null, menu: Menu | null): BusinessFacts {
  const range = menu ? priceRangeOf(menu) : null;
  return {
    name: SITE.name,
    tagline: SITE.tagline,
    url: SITE_URL,
    address: { ...SITE.addressParts, full: SITE.address },
    geo: SITE.geo,
    phone: status?.shopPhone ?? SITE.phone,
    whatsapp: SITE.whatsapp,
    whatsappUrl: waHref(SITE.whatsapp),
    mapsUrl: SITE.mapsUrl,
    googleReviewUrl: SITE.googleReviewUrl,
    googleProfileUrl: SITE.googleProfileUrl,
    openingHours: status?.openingHours ?? [],
    holidays: status?.holidays ?? [],
    deliveryArea: SITE.deliveryArea,
    payments: [
      'Cash on delivery',
      'Cash at the counter',
      ...(ALLOW_ONLINE_PAYMENTS ? ['JazzCash', 'Easypaisa'] : []),
    ],
    priceRange: range ? `Rs ${formatAmount(range[0])}–${formatAmount(range[1])}` : null,
    cuisine: [...SITE.cuisine],
    knownFor: [...SITE.knownFor],
    categories: menu
      ? menu.categories
          .filter((c) => c.isActive && c.parentId === null)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => c.name.en)
      : [],
    acceptsReservations: true,
    menuUpdatedAt: menu?.updatedAt ?? null,
    socials: Object.values(SITE.socials).filter((u): u is string => !!u),
  };
}

/** Server read. Never throws: missing data falls back to the static facts. */
export async function getBusinessFacts(): Promise<BusinessFacts> {
  const [status, menu] = await Promise.all([
    api.storeStatus({ revalidate: 30 }).catch(() => null),
    api.menu({ tags: ['menu'] }).catch(() => null),
  ]);
  return buildFacts(status, menu);
}

/** Server read of the menu for JSON-LD / llms-full.txt / sitemap. */
export const getMenuForSeo = () => api.menu({ tags: ['menu'] }).catch(() => null);

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Monday 12:00–23:30" lines in English (llms.txt). Past-midnight windows say "(next day)". */
export function hoursLines(hours: OpeningHours[]): string[] {
  return [1, 2, 3, 4, 5, 6, 0].flatMap((d) => {
    const rows = hours.filter((h) => h.weekday === d);
    if (!rows.length) return [`${DAY[d]}: closed`];
    return [
      `${DAY[d]}: ${rows
        .map((h) => `${h.opens}–${h.closes}${h.closes <= h.opens ? ' (next day)' : ''}`)
        .join(', ')}`,
    ];
  });
}
