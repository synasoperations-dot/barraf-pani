import type { StaffRole } from '@/lib/contracts';

/**
 * Who may open which /admin section (§7). Read by proxy.ts (redirects) and the admin sidebar
 * (links). Every API call is still role-checked by the server; this only keeps people out of
 * screens they can't use.
 */
const MGR: readonly StaffRole[] = ['owner', 'manager'];
const FRONT: readonly StaffRole[] = ['owner', 'manager', 'cashier'];

export const ADMIN_SECTIONS = {
  orders: FRONT, // includes /admin/orders/new (manual order entry)
  bookings: FRONT,
  kitchen: ['owner', 'manager', 'kitchen'],
  menu: MGR,
  deals: MGR,
  promos: MGR,
  zones: MGR,
  customers: MGR,
  refunds: MGR, // the owner approves; managers request
  riders: MGR,
  reviews: MGR,
  notifications: MGR,
  reports: MGR, // managers view; the owner exports CSV
  settings: ['owner'],
  rider: ['rider'],
} as const satisfies Record<string, readonly StaffRole[]>;

export type AdminSection = keyof typeof ADMIN_SECTIONS;

export const isAdminSection = (s: string): s is AdminSection => s in ADMIN_SECTIONS;

export const canOpen = (role: StaffRole, section: AdminSection) =>
  (ADMIN_SECTIONS[section] as readonly StaffRole[]).includes(role);

/** Where each role lands after login (and when it opens a section it can't use). */
export const ROLE_HOME: Record<StaffRole, string> = {
  owner: '/admin/orders',
  manager: '/admin/orders',
  cashier: '/admin/orders',
  kitchen: '/admin/kitchen',
  rider: '/admin/rider',
};

/** First path segment after /admin, e.g. "/admin/orders/new" → "orders". */
export const sectionOf = (pathname: string) => pathname.split('/')[2] ?? '';
