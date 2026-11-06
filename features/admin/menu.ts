/** Menu manager helpers (pure, unit tested). */
import type { Item, Variant } from '@/lib/contracts';

/** "Sold out today" lasts until the nightly reset: the next 05:00 in Asia/Karachi (§9). */
export function soldOutUntil(now = Date.now()) {
  const PKT = 5 * 3_600_000;
  const local = new Date(now + PKT);
  const reset = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 5) - PKT;
  return new Date(reset > now ? reset : reset + 86_400_000).toISOString();
}

export interface PriceChange {
  variant: string;
  before: number;
  after: number;
  /** Whole percent, signed. */
  pct: number;
  /** Over ±40%: needs an extra confirmation (same guard as the MCP tool, §8). */
  big: boolean;
}

export function priceDiff(before: Variant[], after: Variant[]): PriceChange[] {
  return after.flatMap((v) => {
    const old = before.find((b) => b.id === v.id);
    if (!old || old.price === v.price) return [];
    const pct = old.price ? Math.round(((v.price - old.price) / old.price) * 100) : 100;
    return [{ variant: v.name, before: old.price, after: v.price, pct, big: Math.abs(pct) > 40 }];
  });
}

/** Exactly one default variant, and base_price = the default's price. */
export function withDefault(
  variants: Variant[],
  defaultId: string,
): { variants: Variant[]; basePrice: number } {
  const next = variants.map((v) => ({ ...v, isDefault: v.id === defaultId }));
  return { variants: next, basePrice: next.find((v) => v.isDefault)?.price ?? next[0]?.price ?? 0 };
}

/** Move one element to `to` and renumber sort orders 0..n-1. Returns only rows whose order changed. */
export function reorder<T extends { id: string; sortOrder: number }>(
  rows: T[],
  from: number,
  to: number,
) {
  const next = [...rows];
  const [moved] = next.splice(from, 1);
  if (!moved) return { rows, changed: [] as T[] };
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
  const renumbered = next.map((r, i) => ({ ...r, sortOrder: i }));
  return {
    rows: renumbered,
    changed: renumbered.filter((r) => rows.find((o) => o.id === r.id)?.sortOrder !== r.sortOrder),
  };
}

export const validSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);

export const itemProblems = (i: Pick<Item, 'slug' | 'variants'>) => ({
  slug: !validSlug(i.slug),
  defaults: i.variants.filter((v) => v.isDefault).length !== 1,
});
