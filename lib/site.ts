/**
 * Static public facts about the restaurant. `lib/business-facts.ts` merges these with the live
 * store settings, hours and menu, and every page, the footer, JSON-LD and llms.txt read from
 * there. Placeholders are TBC (docs/OPEN_QUESTIONS.md) and must match the Google Business Profile.
 */
export const SITE = {
  name: 'Barraf Paani',
  tagline: 'Made fresh. Served furious.',
  /** Display form. Built from `addressParts`; keep them in sync. */
  address: '[ADDRESS TBC], Paradise City, Jhang Sadar',
  addressParts: {
    street: '[ADDRESS TBC]', // TBC
    locality: 'Paradise City',
    city: 'Jhang',
    region: 'Punjab',
    postalCode: '35200', // TBC
    country: 'PK',
  },
  city: 'Jhang',
  region: 'Punjab',
  country: 'PK',
  geo: { lat: 31.2695, lng: 72.3181 }, // TBC: approximate Jhang centre
  phone: '+920000000000', // TBC
  whatsapp: '+920000000000', // TBC
  timezone: 'Asia/Karachi',
  /** TODO_CONFIRM: Google Business Profile "write a review" link (store settings later). */
  googleReviewUrl: null as string | null,
  /** TODO_CONFIRM: the Google Business Profile / Maps place URL. */
  googleProfileUrl: null as string | null,
  /** Directions link. TBC with the real address / place id. */
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=31.2695,72.3181',
  /** TBC: plain-language delivery area until the real zone polygons exist (§13 #4). */
  deliveryArea: 'Paradise City and most of Jhang city. Your pin is checked at checkout.',
  cuisine: ['Fast food', 'Burgers', 'Fries', 'Loaded fries', 'Wings', 'Wraps', 'Pizza'],
  /** What people should hear about first (facts block, llms.txt). */
  knownFor: ['Fillet Fury burger', 'Loaded fries', 'Pizzas'],
  socials: { instagram: null, facebook: null, tiktok: null } as Record<
    'instagram' | 'facebook' | 'tiktok',
    string | null
  >, // TBC
} as const;

/** Absolute origin for canonical URLs, sitemap, OG and JSON-LD. Set in production. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const telHref = (phone: string) => `tel:${phone}`;
export const waHref = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
