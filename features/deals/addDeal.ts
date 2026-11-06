'use client';

import type { Deal, Menu } from '@/lib/contracts';
import { findItemById, itemImage } from '@/features/menu/helpers';
import { useCart } from '@/stores/cart';

/**
 * "Order this deal": the deal's lines go into the cart as normal items at NORMAL menu prices
 * (§A2.1, no combo pricing). `priceLabel` is never used; the server quote decides the total.
 * Sold-out / inactive / unavailable lines are skipped (mirrors features/orders/reorder.ts).
 */
export function addDealToCart(deal: Deal, menu: Menu): { added: number; skipped: number } {
  const cart = useCart.getState();
  const mods = menu.modifierGroups.flatMap((g) => g.modifiers);
  let added = 0;
  for (const line of deal.items) {
    const item = findItemById(menu, line.itemId);
    const variant = item?.variants.find((v) => v.id === line.variantId && v.isAvailable);
    if (!item || !item.isActive || item.isSoldOut || !variant) continue;
    const live = line.modifierIds.flatMap((id) => {
      const m = mods.find((x) => x.id === id);
      return m?.isAvailable ? [m] : [];
    });
    cart.add({
      itemId: item.id,
      variantId: variant.id,
      modifierIds: live.map((m) => m.id),
      qty: line.qty,
      note: null,
      snapshot: {
        name: item.name,
        size: variant.size,
        option: variant.option,
        unitPrice: variant.price + live.reduce((n, m) => n + m.price, 0),
        image: itemImage(menu, item),
      },
    });
    added++;
  }
  return { added, skipped: deal.items.length - added };
}
