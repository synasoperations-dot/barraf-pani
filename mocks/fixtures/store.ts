/**
 * Store fixture. EVERY value marked TBC is a placeholder; see docs/OPEN_QUESTIONS.md.
 */
import type { AdminPromo, DeliveryZone, Rider, StoreInfo, StoreSettings } from '@/lib/contracts';

export const PLACEHOLDER_PHONE = '+920000000000'; // TBC

// TBC: opening hours. Placeholder: every day 12:00 → 02:00 (runs past midnight).
const hours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '12:00',
  closes: '02:00',
}));

export const storeInfoFixture: StoreInfo = {
  name: 'Barraf Paani',
  address: '[ADDRESS TBC], Paradise City, Jhang Sadar',
  location: { lat: 31.2695, lng: 72.3181 }, // TBC: approximate Jhang centre
  phone: PLACEHOLDER_PHONE,
  whatsapp: PLACEHOLDER_PHONE,
  timezone: 'Asia/Karachi',
  hours,
  minOrder: 500, // TBC
  socials: { instagram: null, facebook: null, tiktok: null }, // TBC
};

export const storeSettingsFixture: StoreSettings = {
  isAcceptingOrders: true,
  pauseReason: null,
  minOrderValue: 500, // TBC
  maxCodValue: 10000, // TBC
  autoRejectMinutes: 8,
  managerAlertMinutes: 6,
  allowPreorders: true,
  preorderMaxDays: 7,
  preorderCodMaxHours: 2,
  shopPhone: PLACEHOLDER_PHONE,
  hours,
  holidays: [],
};

// TBC: delivery radius and fee. One placeholder polygon around Jhang city ([lng, lat], closed ring).
export const zonesFixture: DeliveryZone[] = [
  {
    id: 'zone_jhang',
    name: 'Jhang city',
    polygon: [
      [72.255, 31.225],
      [72.385, 31.225],
      [72.385, 31.335],
      [72.255, 31.335],
      [72.255, 31.225],
    ],
    fee: 100, // TBC
    minOrder: 500, // TBC
    etaMinutes: 40, // TBC
    priority: 0,
    isActive: true,
  },
];

/** Mock-only test promo, not a real deal (isPublic=false so it never shows on Deals). */
export const promosFixture: AdminPromo[] = [
  {
    id: 'promo_mock10',
    code: 'MOCK10',
    kind: 'percent',
    value: 10,
    minOrder: 0,
    maxUses: null,
    maxUsesPerCustomer: 99,
    usedCount: 0,
    validFrom: null,
    validUntil: null,
    isActive: true,
    isPublic: false,
    description: null,
  },
];

export const ridersFixture: Rider[] = [
  { id: 'rider_1', name: 'Rider 1 (mock)', phone: PLACEHOLDER_PHONE, isActive: true },
];
