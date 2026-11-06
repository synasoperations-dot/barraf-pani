'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { Bolt } from './motifs';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastOptions {
  /** One button, e.g. "Undo" or "View cart". The toast closes when it is pressed. */
  action?: ToastAction;
  ms?: number;
}

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let nextId = 1;

const dismiss = (id: number) =>
  useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));

/** Show a toast from anywhere (no hook needed). `toast(msg, ms)` or `toast(msg, { action, ms })`. */
export function toast(message: string, opts: number | ToastOptions = {}) {
  const { action, ms = action ? 4500 : 2600 } = typeof opts === 'number' ? { ms: opts } : opts;
  const id = nextId++;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, message, action }] }));
  setTimeout(() => dismiss(id), ms);
  return id;
}

/** Dark pill with a yellow bolt and an optional action button. Mount once (in Providers). */
export function Toaster() {
  const items = useToasts((s) => s.items);
  const ref = useRef<HTMLDivElement>(null);

  // Native <dialog> sheets live in the browser top layer, above any z-index. Re-showing the
  // popover on every new toast moves it to the top of that layer, so toasts appear over sheets.
  useEffect(() => {
    const el = ref.current;
    if (!el?.showPopover) return;
    if (el.matches(':popover-open')) el.hidePopover();
    if (items.length) el.showPopover();
  }, [items]);

  return (
    <div
      ref={ref}
      popover="manual"
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-auto bottom-24 z-[70] m-0 flex h-auto w-full flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 px-4 md:bottom-8 [&:not(:popover-open)]:flex"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex animate-pop items-center gap-2 rounded-full border-3 border-ink bg-ink py-2 ps-3 pe-2 text-base font-medium text-white shadow-hard-orange"
        >
          <Bolt size={22} />
          <span className={t.action ? '' : 'pe-3'}>{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="min-h-9 press rounded-full border-2 border-ink bg-yellow px-3 font-display text-base leading-none text-ink [--press-x:2px] [--press-y:2px]"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
