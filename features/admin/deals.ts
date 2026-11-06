/** Deals editor helpers (pure, unit tested). */
import type { Deal, Menu } from '@/lib/contracts';

/** What the linked items cost on today's menu (variant + add-ons) × qty. Null if one is missing. */
export function dealMenuTotal(items: Deal['items'], menu: Menu): number | null {
  let total = 0;
  for (const line of items) {
    const item = menu.items.find((i) => i.id === line.itemId);
    const variant = item?.variants.find((v) => v.id === line.variantId);
    if (!item || !variant) return null;
    const mods = menu.modifierGroups
      .flatMap((g) => g.modifiers)
      .filter((m) => line.modifierIds.includes(m.id))
      .reduce((s, m) => s + m.price, 0);
    total += (variant.price + mods) * line.qty;
  }
  return total;
}

/** The rupee figure in a display label ("Rs 1,295", "Only 795!"), or null when there is none. */
export function labelAmount(label: string | null) {
  const digits = label?.replace(/[^\d]/g, '') ?? '';
  return digits ? Number(digits) : null;
}

/**
 * Warn when the coupon advertises a price customers won't be charged: the cart always charges
 * normal prices (no combo pricing in v1, §A2.1).
 */
export const labelMismatch = (label: string | null, items: Deal['items'], menu: Menu) => {
  const shown = labelAmount(label);
  const real = dealMenuTotal(items, menu);
  return shown !== null && real !== null && shown !== real ? { shown, real } : null;
};
