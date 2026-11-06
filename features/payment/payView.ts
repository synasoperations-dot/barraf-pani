import { isApiError } from '@/lib/api';
import type { OnlineProvider, Order, PaymentMethod } from '@/lib/contracts';

/**
 * What /pay/return shows. Decided ONLY from the server's order.status / paymentStatus (§4.3:
 * the return page never marks anything paid); the browser adds just two facts: whether it
 * already saw this order `expired`, and how long the payment has been pending.
 */
export type PayView =
  | 'confirming' // pending, countdown running
  | 'stuck' // pending for over 2 minutes
  | 'placed' // paid → go to the receipt
  | 'back_on' // seen expired, then a late payment re-placed it (§4.3 step 8)
  | 'failed'
  | 'expired'
  | 'refund'; // expired but the money landed: items sold out, refund requested

export const STUCK_AFTER_MS = 2 * 60_000;
const WINDOW_MS = 15 * 60_000;

export function payView(
  order: Pick<Order, 'status' | 'paymentStatus'>,
  { seenExpired, pendingMs }: { seenExpired: boolean; pendingMs: number },
): PayView {
  switch (order.status) {
    case 'pending_payment':
      return pendingMs > STUCK_AFTER_MS ? 'stuck' : 'confirming';
    case 'payment_failed':
      return 'failed';
    case 'expired':
      return ['paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus)
        ? 'refund'
        : 'expired';
    default:
      return seenExpired ? 'back_on' : 'placed';
  }
}

export const onlineProvider = (m: PaymentMethod | null | undefined): OnlineProvider | null =>
  m === 'jazzcash' || m === 'easypaisa' ? m : null;

/* The initiate response carries the real expiry; /pay/redirect remembers it for /pay/return. */
const expiryKey = (token: string) => `bp-pay-expiry:${token}`;

export function rememberExpiry(token: string, expiresAt: string) {
  try {
    sessionStorage.setItem(expiryKey(token), expiresAt);
  } catch {}
}

/** Payment window end: the remembered initiate expiry, else createdAt + 15 min. */
export function paymentExpiry(token: string, createdAt: string): string {
  try {
    const saved = sessionStorage.getItem(expiryKey(token));
    if (saved) return saved;
  } catch {}
  return new Date(Date.parse(createdAt) + WINDOW_MS).toISOString();
}

/** NETWORK_ERROR or the browser says it's offline → ErrorState's offline variant. */
export const isOffline = (e: unknown) =>
  (isApiError(e) && e.code === 'NETWORK_ERROR') ||
  (typeof navigator !== 'undefined' && !navigator.onLine);

export const isNotFound = (e: unknown) => isApiError(e) && e.code === 'NOT_FOUND';
