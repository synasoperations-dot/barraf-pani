import { delay, HttpResponse } from 'msw';

/** `?scenario=<name>` or the floating dev panel. Descriptions show in the panel. */
export const SCENARIOS = {
  happy: 'Everything works',
  store_closed: 'Store closed (outside hours)',
  paused: 'Ordering paused with a reason',
  item_sold_out_mid_checkout: 'Fillet Fury sells out after the first quote',
  live_sold_out: 'Fillet Fury sold-out toggle is broadcast ~8 s after load',
  outside_zone: 'Every pin is outside the delivery zones',
  below_min: 'Minimum order raised to Rs 5,000',
  cod_not_allowed: 'COD refused (over the cash cap)',
  requires_otp: 'COD needs a fresh OTP in this session',
  otp_rate_limited: 'OTP request is rate limited',
  preorder_invalid: 'Any scheduled time is rejected',
  slow_3g: '1.5–3 s latency on every request',
  network_fail: 'Every 3rd request fails at the network',
  double_tap: 'Order takes 1.5 s, so a second tap overlaps (409 then replay)',
  idempotency_conflict: 'Order key reused with a different body (422)',
  in_progress: 'Order returns IN_PROGRESS twice; client auto-retries',
  duplicate_cart: '"Place again?" prompt on the first attempt',
  payment_success: 'Online payment confirms after ~4 s',
  payment_fail: 'Online payment fails after ~4 s',
  payment_pending_stuck: 'Online payment never confirms (15 min expiry)',
  payment_expired: 'Online payment expires after ~10 s',
  late_payment_success: 'Payment expires, then a late success re-places the order',
  order_rejected: 'Kitchen rejects the order after ~8 s',
  auto_rejected: 'Nobody accepts: auto-rejected (8 min compressed to 12 s)',
  too_late_to_cancel: 'Cancel always refused',
  version_conflict: 'First admin transition per order gets 409',
  deals_demo: 'Serves 2 DEMO deals and 2 DEMO events',
  booking_confirmed: 'Bookings auto-confirm after ~10 s',
  booking_declined: 'Bookings auto-decline after ~10 s',
  event_full: 'Event bookings are refused: event full',
  mixed_sources: 'Admin board receives website / WhatsApp / phone orders',
} as const;
export type Scenario = keyof typeof SCENARIOS;

const KEY = 'bp-mock-scenario';
const isScenario = (s: string | null): s is Scenario => s !== null && s in SCENARIOS;

function initial(): Scenario {
  if (typeof window === 'undefined') return 'happy';
  const fromUrl = new URLSearchParams(window.location.search).get('scenario');
  try {
    if (isScenario(fromUrl)) sessionStorage.setItem(KEY, fromUrl);
    const stored = sessionStorage.getItem(KEY);
    return isScenario(stored) ? stored : 'happy';
  } catch {
    return isScenario(fromUrl) ? fromUrl : 'happy';
  }
}

let current: Scenario = initial();
let since = Date.now();

export const getScenario = () => current;
export const is = (s: Scenario) => current === s;
/** ms since the scenario started (page load in the browser). */
export const scenarioElapsed = () => Date.now() - since;

export function setScenario(s: Scenario) {
  current = s;
  since = Date.now();
  try {
    sessionStorage.setItem(KEY, s);
  } catch {}
}

let requestCount = 0;

/** slow_3g latency and network_fail (every 3rd request). Returns a response to short-circuit with. */
export async function networkConditions(): Promise<Response | null> {
  requestCount += 1;
  if (current === 'slow_3g') await delay(1500 + Math.random() * 1500);
  if (current === 'network_fail' && requestCount % 3 === 0) return HttpResponse.error();
  return null;
}
