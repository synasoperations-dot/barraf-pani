'use client';

import { create } from 'zustand';

/** Transient UI state shared across the shell (not persisted). */
export const useUi = create<{ cartOpen: boolean; setCartOpen: (open: boolean) => void }>((set) => ({
  cartOpen: false,
  setCartOpen: (cartOpen) => set({ cartOpen }),
}));
