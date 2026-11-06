/** Derived report KPIs (pure, unit tested). Rates are 0–1; an empty range gives 0, never NaN. */
import type { SalesReport } from '@/lib/contracts';

const ratio = (a: number, b: number) => (b ? a / b : 0);

export function reportKpis(r: SalesReport) {
  const delivery = r.byFulfilment.find((f) => f.fulfilment === 'delivery')?.count ?? 0;
  const website = r.bySource.find((s) => s.source === 'website')?.count ?? 0;
  return {
    deliveryShare: ratio(delivery, r.orderCount),
    cancelRate: ratio(r.cancelledCount + r.rejectedCount, r.allOrders),
    /** Website share of completed orders (vs WhatsApp / phone / walk-in / Foodpanda). */
    websiteShare: ratio(website, r.orderCount),
  };
}
