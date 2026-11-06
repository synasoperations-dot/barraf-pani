'use client';

import type { Menu, Order, QuotedLine } from '@/lib/contracts';
import { findItemById, itemImage } from '@/features/menu/helpers';
import { useCart, type CartEntry } from '@/stores/cart';

export type ReorderIssue =
  | { kind: 'sold_out' | 'inactive'; line: QuotedLine }
  | { kind: 'price_changed'; line: QuotedLine; was: number; now: number };

export interface ReorderPlan {
  /** Lines that can go in the cart, priced at TODAY's menu (estimate; the server quote decides). */
  add: Omit<CartEntry, 'key'>[];
  /** Shown in the review sheet before anything is added. Price changes are still in `add`. */
  issues: ReorderIssue[];
}

/**
 * Re-validate an old order against the current menu: inactive or removed items and variants
 * are dropped, sold-out ones dropped, unavailable add-ons removed, price changes flagged.
 */
export function planReorder(order: Order, menu: Menu): ReorderPlan {
  const plan: ReorderPlan = { add: [], issues: [] };
  for (const line of order.lines) {
    const item = findItemById(menu, line.itemId);
    const variant = item?.variants.find((v) => v.id === line.variantId);
    if (!item || !item.isActive || !variant) {
      plan.issues.push({ kind: 'inactive', line });
      continue;
    }
    if (item.isSoldOut || !variant.isAvailable) {
      plan.issues.push({ kind: 'sold_out', line });
      continue;
    }
    const mods = line.modifiers.flatMap((m) => {
      const live = menu.modifierGroups.flatMap((g) => g.modifiers).find((x) => x.id === m.id);
      return live?.isAvailable ? [live] : [];
    });
    const unitPrice = variant.price + mods.reduce((n, m) => n + m.price, 0);
    if (unitPrice !== line.unitPrice)
      plan.issues.push({ kind: 'price_changed', line, was: line.unitPrice, now: unitPrice });
    plan.add.push({
      itemId: item.id,
      variantId: variant.id,
      modifierIds: mods.map((m) => m.id),
      qty: line.qty,
      note: line.note,
      snapshot: {
        name: item.name,
        size: variant.size,
        option: variant.option,
        unitPrice,
        image: itemImage(menu, item),
      },
    });
  }
  return plan;
}

/** Put the plan's lines in the cart. */
export const applyReorder = (plan: ReorderPlan) =>
  plan.add.forEach((l) => useCart.getState().add(l));

/**
 * One-step "Reorder" (receipt, expired payment): adds what still exists. Returns how many
 * lines were skipped.
 */
export function reorder(order: Order, menu: Menu): { added: number; skipped: number } {
  const plan = planReorder(order, menu);
  applyReorder(plan);
  return { added: plan.add.length, skipped: order.lines.length - plan.add.length };
}
