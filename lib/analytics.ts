/**
 * PostHog funnel (ARCHITECTURE §10): menu → item → cart → checkout → placed.
 * No-op unless NEXT_PUBLIC_POSTHOG_KEY is set. Uses sendBeacon to PostHog's capture endpoint,
 * so there is no SDK in the bundle and no fetch outside lib/api.
 * ponytail: swap for posthog-js if we need session replay or feature flags.
 */

export interface AnalyticsEvents {
  menu_viewed: { category?: string };
  item_viewed: { itemId: string; slug: string };
  added_to_cart: {
    itemId: string;
    variantId: string;
    qty: number;
    source: 'menu' | 'item' | 'deal';
  };
  cart_viewed: { lines: number; estimate: number };
  checkout_started: { lines: number; fulfilment: 'delivery' | 'pickup' };
  order_placed: { orderNumber: string; total: number; paymentMethod: string; fulfilment: string };
}

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const ID_KEY = 'bp-anon-id';

function distinctId() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) localStorage.setItem(ID_KEY, (id = crypto.randomUUID()));
    return id;
  } catch {
    return 'anonymous';
  }
}

/** Never send personal data (phone, name, address) as props. */
export function track<E extends keyof AnalyticsEvents>(event: E, props: AnalyticsEvents[E]) {
  if (!KEY || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  const body = JSON.stringify({
    api_key: KEY,
    event,
    properties: { ...props, distinct_id: distinctId(), $current_url: location.pathname },
    timestamp: new Date().toISOString(),
  });
  navigator.sendBeacon(`${HOST}/capture/`, new Blob([body], { type: 'application/json' }));
}
