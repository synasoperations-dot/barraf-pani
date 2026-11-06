/**
 * Store fixture (§5.3). EVERY value marked TBC is a placeholder; see docs/OPEN_QUESTIONS.md.
 */
import type {
  DeliveryZone,
  Holiday,
  OpeningHours,
  Promo,
  Review,
  Staff,
  StoreSettings,
} from '@/lib/contracts';
import { SITE } from '@/lib/site';

export const storeSettingsFixture: StoreSettings = {
  isAcceptingOrders: true,
  pauseReason: null,
  timezone: 'Asia/Karachi',
  minOrderValue: 500, // TBC
  maxCodValue: 10000, // TBC
  autoRejectMinutes: 8,
  managerAlertMinutes: 6,
  allowPreorders: true,
  preorderMaxDays: 7,
  preorderCodMaxHours: 2,
  preorderReleaseMinutes: 60,
  shopPhone: SITE.phone, // TBC
  enabledPaymentMethods: ['cod', 'jazzcash', 'easypaisa'],
  links: { whatsapp: SITE.phone, instagram: null, facebook: null, tiktok: null }, // TBC
  maintenanceMode: false,
};

// TBC: opening hours. Mon–Thu 12:00–23:30; Fri–Sun 12:00–02:00 (past midnight).
export const hoursFixture: OpeningHours[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '12:00',
  closes: weekday === 0 || weekday >= 5 ? '02:00' : '23:30',
}));

// TBC: one placeholder holiday.
export const holidaysFixture: Holiday[] = [
  { date: '2027-03-23', note: 'Pakistan Day (placeholder)' },
];

// TBC: delivery radius and fees. Inner Jhang (priority 1) inside a wider outer zone ([lng, lat]).
export const zonesFixture: DeliveryZone[] = [
  {
    id: 'zone_inner',
    name: 'Inner Jhang',
    polygon: [
      [72.29, 31.25],
      [72.35, 31.25],
      [72.35, 31.3],
      [72.29, 31.3],
      [72.29, 31.25],
    ],
    fee: 100, // TBC
    minOrder: 500, // TBC
    etaMinutes: 35, // TBC
    priority: 1,
    isActive: true,
  },
  {
    id: 'zone_outer',
    name: 'Outer Jhang',
    polygon: [
      [72.24, 31.21],
      [72.4, 31.21],
      [72.4, 31.35],
      [72.24, 31.35],
      [72.24, 31.21],
    ],
    fee: 200, // TBC
    minOrder: 1000, // TBC
    etaMinutes: 50, // TBC
    priority: 0,
    isActive: true,
  },
];

/** Mock-only promos for testing the three kinds. Not real deals. */
export const promosFixture: Promo[] = [
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
  },
  {
    id: 'promo_mockflat',
    code: 'MOCKFLAT',
    kind: 'flat',
    value: 100,
    minOrder: 1000,
    maxUses: null,
    maxUsesPerCustomer: 99,
    usedCount: 0,
    validFrom: null,
    validUntil: null,
    isActive: true,
  },
  {
    id: 'promo_mockship',
    code: 'MOCKSHIP',
    kind: 'free_delivery',
    value: 0,
    minOrder: 0,
    maxUses: null,
    maxUsesPerCustomer: 99,
    usedCount: 0,
    validFrom: null,
    validUntil: null,
    isActive: true,
  },
  {
    id: 'promo_mockold',
    code: 'MOCKOLD',
    kind: 'flat',
    value: 50,
    minOrder: 0,
    maxUses: null,
    maxUsesPerCustomer: 1,
    usedCount: 0,
    validFrom: null,
    validUntil: '2026-01-01T00:00:00+05:00',
    isActive: true,
  },
];

export interface StaffRec extends Staff {
  password: string;
}

export const MOCK_STAFF_PASSWORD = 'barraf123';

export const staffFixture: StaffRec[] = [
  {
    id: 'staff_owner',
    name: 'Owner (mock)',
    email: 'owner@barrafpaani.test',
    role: 'owner',
    phone: null,
    isActive: true,
    twoFactorEnabled: true,
    password: MOCK_STAFF_PASSWORD,
  },
  {
    id: 'staff_manager',
    name: 'Manager (mock)',
    email: 'manager@barrafpaani.test',
    role: 'manager',
    phone: null,
    isActive: true,
    twoFactorEnabled: false,
    password: MOCK_STAFF_PASSWORD,
  },
  {
    id: 'staff_cashier',
    name: 'Cashier (mock)',
    email: 'cashier@barrafpaani.test',
    role: 'cashier',
    phone: null,
    isActive: true,
    twoFactorEnabled: false,
    password: MOCK_STAFF_PASSWORD,
  },
  {
    id: 'staff_kitchen',
    name: 'Kitchen tablet (mock)',
    email: 'kitchen@barrafpaani.test',
    role: 'kitchen',
    phone: null,
    isActive: true,
    twoFactorEnabled: false,
    password: MOCK_STAFF_PASSWORD,
  },
  {
    id: 'staff_rider',
    name: 'Rider 1 (mock)',
    email: 'rider@barrafpaani.test',
    role: 'rider',
    phone: SITE.phone,
    isActive: true,
    twoFactorEnabled: false,
    password: MOCK_STAFF_PASSWORD,
  },
];

/** Obviously-mock reviews so moderation can be designed. */
export const reviewsFixture: Review[] = [
  {
    id: 'rev_1',
    orderNumber: 'BP-1001',
    customerName: 'Mock customer A',
    rating: 5,
    comment: '(mock review) Published example.',
    isPublished: true,
    createdAt: '2026-11-01T20:00:00+05:00',
  },
  {
    id: 'rev_2',
    orderNumber: 'BP-1002',
    customerName: 'Mock customer B',
    rating: 2,
    comment: '(mock review) Waiting for moderation.',
    isPublished: false,
    createdAt: '2026-11-02T21:00:00+05:00',
  },
];
