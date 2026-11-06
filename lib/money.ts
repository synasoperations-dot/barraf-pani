/**
 * Money math in whole rupees (§0.2). The backend's create_order is authoritative; this module
 * mirrors its rules so the mocks behave identically and the UI can show estimates.
 * No floats survive: every result is an integer.
 */
import type { PromoKind } from '@/lib/contracts';

export interface Totals {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
}

function assertRupees(...values: number[]) {
  for (const v of values)
    if (!Number.isInteger(v) || v < 0) throw new Error(`Not whole rupees: ${v}`);
}

/** unit_price × qty (order_items.line_total check). */
export function lineTotal(unitPrice: number, qty: number) {
  assertRupees(unitPrice, qty);
  return unitPrice * qty;
}

/** Larger of the store and zone minimum (§4.1). */
export const effectiveMinOrder = (storeMin: number, zoneMin: number | null) =>
  Math.max(storeMin, zoneMin ?? 0);

/** How much more the customer must add (BELOW_MIN_ORDER details.shortBy). */
export const shortBy = (subtotal: number, minOrder: number) => Math.max(0, minOrder - subtotal);

/**
 * One promo per order (no stacking in v1). percent: floor(subtotal × value / 100);
 * flat: up to the subtotal; free_delivery: the delivery fee.
 */
export function promoDiscount(
  kind: PromoKind,
  value: number,
  subtotal: number,
  deliveryFee: number,
) {
  assertRupees(value, subtotal, deliveryFee);
  switch (kind) {
    case 'percent':
      return Math.floor((subtotal * Math.min(value, 100)) / 100);
    case 'flat':
      return Math.min(value, subtotal);
    case 'free_delivery':
      return deliveryFee;
  }
}

/** total = subtotal + delivery_fee + tax + tip − discount (§4.1, §5.5 check). */
export function computeTotals(input: Omit<Totals, 'total'>): Totals {
  const { subtotal, deliveryFee, discount, tax, tip } = input;
  assertRupees(subtotal, deliveryFee, discount, tax, tip);
  const total = subtotal + deliveryFee + tax + tip - discount;
  if (total < 0) throw new Error('Discount exceeds order value');
  return { ...input, total };
}
