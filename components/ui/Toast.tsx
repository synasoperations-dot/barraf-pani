'use client';

import { create } from 'zustand';
import { Bolt } from './motifs';

interface ToastItem {
  id: number;
  message: string;
}

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let nextId = 1;

/** Show a toast from anywhere (no hook needed). */
export function toast(message: string, ms = 2600) {
  const id = nextId++;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, message }] }));
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), ms);
}

/** Dark pill with a yellow bolt. Mount once (in Providers). */
export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-8"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="flex animate-pop items-center gap-2 rounded-full border-3 border-ink bg-ink py-2 ps-3 pe-5 text-base font-medium text-white shadow-hard-orange"
        >
          <Bolt size={22} />
          {t.message}
        </div>
      ))}
    </div>
  );
}
