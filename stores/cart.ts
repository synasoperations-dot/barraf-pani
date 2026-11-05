'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  CartLine,
  Fulfilment,
  LocalizedText,
  VariantOption,
  VariantSize,
} from '@/lib/contracts';

/**
 * Local cart. Lines carry intent (ids + qty) plus a display snapshot for instant UI.
 * The snapshot price is an ESTIMATE; checkout shows the server quote (ARCHITECTURE §2.4).
 */
export interface CartEntry extends CartLine {
  /** Stable key: same item + variant + modifiers + note merge into one line. */
  key: string;
  snapshot: {
    name: LocalizedText;
    size: VariantSize | null;
    option: VariantOption | null;
    unitPrice: number;
    image: string | null;
  };
}

interface CartState {
  lines: CartEntry[];
  fulfilment: Fulfilment;
  /** Item ids the server reported sold out; the cart highlights these lines. */
  soldOutItemIds: string[];
  add: (line: Omit<CartEntry, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setFulfilment: (f: Fulfilment) => void;
  markSoldOut: (itemIds: string[]) => void;
}

const lineKey = (l: Pick<CartLine, 'itemId' | 'variantId' | 'modifierIds' | 'note'>) =>
  [l.itemId, l.variantId, [...l.modifierIds].sort().join('+'), l.note ?? ''].join('|');

const clampQty = (n: number) => Math.max(1, Math.min(50, Math.round(n)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      fulfilment: 'delivery',
      soldOutItemIds: [],
      add: (line) =>
        set((s) => {
          const key = lineKey(line);
          const existing = s.lines.find((l) => l.key === key);
          return {
            lines: existing
              ? s.lines.map((l) => (l.key === key ? { ...l, qty: clampQty(l.qty + line.qty) } : l))
              : [...s.lines, { ...line, qty: clampQty(line.qty), key }],
          };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, qty: clampQty(qty) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], soldOutItemIds: [] }),
      setFulfilment: (fulfilment) => set({ fulfilment }),
      markSoldOut: (soldOutItemIds) => set({ soldOutItemIds }),
    }),
    // Rehydrated in Providers after mount so server and first client render match.
    {
      name: 'bp-cart-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      skipHydration: true,
    },
  ),
);

/** Derived values. Use with a selector to avoid re-renders. */
export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0);
export const selectEstimate = (s: CartState) =>
  s.lines.reduce((n, l) => n + l.snapshot.unitPrice * l.qty, 0);
/** Intent-only lines for quote / order requests. */
export const toCartLines = (lines: CartEntry[]): CartLine[] =>
  lines.map(({ itemId, variantId, modifierIds, qty, note }) => ({
    itemId,
    variantId,
    modifierIds,
    qty,
    note,
  }));
