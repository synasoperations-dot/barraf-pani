/**
 * Canonical public facts about the restaurant: one source for the footer, and later for
 * structured data, llms.txt and the facts block (prompt 3). Placeholders are TBC (docs/OPEN_QUESTIONS.md).
 */
export const SITE = {
  name: 'Barraf Paani',
  tagline: 'Made fresh. Served furious.',
  address: '[ADDRESS TBC], Paradise City, Jhang Sadar',
  city: 'Jhang',
  region: 'Punjab',
  country: 'PK',
  geo: { lat: 31.2695, lng: 72.3181 }, // TBC: approximate Jhang centre
  phone: '+920000000000', // TBC
  whatsapp: '+920000000000', // TBC
  timezone: 'Asia/Karachi',
  /** TODO_CONFIRM: Google Business Profile "write a review" link (store settings later). */
  googleReviewUrl: null as string | null,
  /** Directions link. TBC with the real address / place id. */
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=31.2695,72.3181',
  socials: { instagram: null, facebook: null, tiktok: null } as Record<
    'instagram' | 'facebook' | 'tiktok',
    string | null
  >, // TBC
} as const;
