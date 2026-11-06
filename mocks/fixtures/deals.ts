/**
 * Deals & events. EMPTY by default: the client hasn't given us any (docs/OPEN_QUESTIONS.md).
 * `?scenario=deals_demo` serves the DEMO set below, built only from real menu items at their
 * real prices, purely to design the layout.
 */
import type { Deal, Event } from '@/lib/contracts';

const inDays = (d: number, hour: number) => {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() + d);
  t.setUTCHours(hour - 5, 0, 0, 0); // hour in Asia/Karachi (UTC+5)
  return t.toISOString();
};

export const demoDeals: Deal[] = [
  {
    id: 'deal_demo_1',
    title: { en: 'DEMO Burger + Fries + Dip', ur: null },
    description: null,
    imagePath: '/images/menu/burger.jpg',
    // Crunch Kick 450 + Masala Fries (Regular) 250 + Ranch 95 = 795, the normal prices added up.
    priceLabel: 'Rs 795',
    promoCode: 'MOCK10', // mock promo: "Copy code" pre-fills the cart promo field
    items: [
      { itemId: 'itm_crunch-kick', variantId: 'itm_crunch-kick__std', modifierIds: [], qty: 1 },
      {
        itemId: 'itm_masala-fries',
        variantId: 'itm_masala-fries__regular',
        modifierIds: [],
        qty: 1,
      },
      { itemId: 'itm_dip-ranch', variantId: 'itm_dip-ranch__std', modifierIds: [], qty: 1 },
    ],
    validFrom: null,
    validUntil: inDays(4, 23),
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'deal_demo_2',
    title: { en: 'DEMO Wings for two', ur: null },
    description: null,
    imagePath: '/images/menu/wings.jpg',
    // Hot Wings 395 + BBQ Wings 445 = 840.
    priceLabel: 'Rs 840',
    promoCode: null,
    items: [
      { itemId: 'itm_hot-wings', variantId: 'itm_hot-wings__std', modifierIds: [], qty: 1 },
      { itemId: 'itm_bbq-wings', variantId: 'itm_bbq-wings__std', modifierIds: [], qty: 1 },
    ],
    validFrom: null,
    validUntil: null,
    isActive: true,
    sortOrder: 1,
  },
];

export const demoEvents = (): Event[] => [
  {
    id: 'event_demo_1',
    title: { en: 'DEMO Live match screening', ur: null },
    description: null,
    imagePath: null,
    startsAt: inDays(3, 19),
    endsAt: inDays(3, 23),
    bookable: true,
    capacity: 40,
    spotsLeft: 40,
    isActive: true,
  },
  {
    id: 'event_demo_2',
    title: { en: 'DEMO Family night', ur: null },
    description: null,
    imagePath: null,
    startsAt: inDays(6, 18),
    endsAt: inDays(6, 22),
    bookable: true,
    capacity: null,
    spotsLeft: null,
    isActive: true,
  },
];
