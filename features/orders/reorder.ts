'use client';

import type { Menu, Order } from '@/lib/contracts';
import { findItemById, itemImage } from '@/features/menu/helpers';
import { useCart } from '@/stores/cart';

/**
 * "Reorder" / "Order again": put an order's lines back in the cart (intent + display snapshot).
 * Prices in the snapshot are today's menu prices (estimate); the server quote decides (§2.4).
 * Lines whose item or variant is gone or sold out are skipped. Returns how many were skipped.
 */
export function reorder(order: Order, menu: Menu): { added: number; skipped: number } {
  const cart = useCart.getState();
  let added = 0;
  for (const line of order.lines) {
    const item = findItemById(menu, line.itemId);
    const variant = item?.variants.find((v) => v.id === line.variantId && v.isAvailable);
    if (!item || !item.isActive || item.isSoldOut || !variant) continue;
    const mods = line.modifiers.flatMap((m) => {
      const live = menu.modifierGroups.flatMap((g) => g.modifiers).find((x) => x.id === m.id);
      return live?.isAvailable ? [live] : [];
    });
    cart.add({
      itemId: item.id,
      variantId: variant.id,
      modifierIds: mods.map((m) => m.id),
      qty: line.qty,
      note: line.note,
      snapshot: {
        name: item.name,
        size: variant.size,
        option: variant.option,
        unitPrice: variant.price + mods.reduce((n, m) => n + m.price, 0),
        image: itemImage(menu, item),
      },
    });
    added++;
  }
  return { added, skipped: order.lines.length - added };
}
