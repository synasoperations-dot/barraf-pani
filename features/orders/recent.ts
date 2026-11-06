'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { browserStorage } from '@/stores/cart';

/**
 * Orders placed on this device: public tokens only (no names, phones or numbers), for
 * "Find my order" / guest My orders, plus which celebrations already played (once per order).
 */
interface RecentOrdersState {
  tokens: string[];
  celebrated: string[];
  add: (token: string) => void;
  markCelebrated: (token: string) => void;
}

const MAX = 10;

export const useRecentOrders = create<RecentOrdersState>()(
  persist(
    (set) => ({
      tokens: [],
      celebrated: [],
      add: (token) =>
        set((s) => ({ tokens: [token, ...s.tokens.filter((t) => t !== token)].slice(0, MAX) })),
      markCelebrated: (token) =>
        set((s) => ({
          celebrated: [token, ...s.celebrated.filter((t) => t !== token)].slice(0, MAX * 2),
        })),
    }),
    // Rehydrated in Providers after mount, like the cart.
    {
      name: 'bp-recent-orders-v1',
      storage: createJSONStorage(browserStorage),
      version: 1,
      skipHydration: true,
    },
  ),
);
