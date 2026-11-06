/** Item detail choices: variant + modifier picks, resolved against the live menu. Pure, unit tested. */
import type { Item, Modifier, ModifierGroup, Variant, VariantSize } from '@/lib/contracts';
import { defaultVariant, isOrderable } from '@/features/menu/helpers';

/** groupId → picked modifier ids. */
export type Picks = Record<string, string[]>;

/**
 * Single-select groups swap; multi-select groups ignore new picks once full. Picks that went
 * unavailable (live menu) are dropped first, so they never count towards maxSelect.
 */
export function togglePick(picks: Picks, group: ModifierGroup, modifierId: string): Picks {
  const live = new Set(group.modifiers.filter((m) => m.isAvailable).map((m) => m.id));
  const cur = (picks[group.id] ?? []).filter((id) => live.has(id));
  const next = cur.includes(modifierId)
    ? cur.filter((id) => id !== modifierId)
    : group.maxSelect === 1
      ? [modifierId]
      : cur.length < group.maxSelect
        ? [...cur, modifierId]
        : cur;
  return { ...picks, [group.id]: next };
}

/**
 * Resolve picks against the (live) menu: a variant or modifier that became unavailable drops out,
 * groups below their minSelect are `missing`. Modifiers come back in menu order (stable cart key).
 */
export function resolveChoice(
  item: Item,
  groups: ModifierGroup[],
  variantId: string | null,
  picks: Picks,
) {
  const variant: Variant =
    item.variants.find((v) => v.id === variantId && v.isAvailable) ?? defaultVariant(item);
  const modifiers: Modifier[] = [];
  const missing: ModifierGroup[] = [];
  for (const g of groups) {
    const ids = picks[g.id] ?? [];
    const chosen = g.modifiers
      .filter((m) => m.isAvailable && ids.includes(m.id))
      .slice(0, g.maxSelect);
    if (chosen.length < g.minSelect) missing.push(g);
    modifiers.push(...chosen);
  }
  const soldOut = !isOrderable(item) || !variant.isAvailable;
  return { variant, modifiers, missing, soldOut, canAdd: !soldOut && missing.length === 0 };
}

const SIZES: VariantSize[] = ['S', 'M', 'L', 'XL'];

/** Pizza sizes on offer, in order, with their variants (Option A/B). Missing sizes are left out. */
export const sizesOf = (item: Item) =>
  SIZES.flatMap((size) => {
    const variants = item.variants.filter((v) => v.size === size);
    return variants.length ? [{ size, variants }] : [];
  });

/** Variant to select when the size changes: same option if that size has it, else its first available. */
export function variantForSize(item: Item, size: VariantSize, current: Variant): Variant | null {
  const vs = item.variants.filter((v) => v.size === size && v.isAvailable);
  return vs.find((v) => v.option === current.option) ?? vs[0] ?? null;
}
