'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRef, type PointerEvent } from 'react';
import { Bolt } from '@/components/ui/motifs';
import { Stamp } from '@/components/ui/Stamp';
import { Stepper } from '@/components/ui/Stepper';
import { formatAmount } from '@/lib/format';
import { prefersReducedMotion } from '@/lib/motion';

export interface CartLineViewProps {
  name: string;
  /** "Large", "S · Option A" … */
  variant: string;
  /** Localized modifier names. */
  modifiers: string[];
  note: string | null;
  image: string | null;
  qty: number;
  lineTotal: number;
  soldOut: boolean;
  /** Where "Replace" goes (sold-out lines only). */
  replaceHref: string;
  onQty: (qty: number) => void;
  onRemove: () => void;
  onNavigate?: () => void;
}

/**
 * Horizontal swipe past a threshold removes (touch/pen only; mouse users get the button).
 * Moves the element directly (no re-render per frame); `touch-action: pan-y` keeps vertical scroll.
 */
function useSwipe(onRemove: () => void) {
  const g = useRef<{ id: number; x: number; y: number; dx: number; on: boolean } | null>(null);

  const settle = (el: HTMLElement, to: string, then?: () => void) => {
    const ms = prefersReducedMotion() ? 0 : 160;
    el.style.transition = `transform ${ms}ms ease-out`;
    el.style.transform = to;
    if (then) setTimeout(then, ms);
  };

  const end = (e: PointerEvent<HTMLElement>) => {
    const s = g.current;
    g.current = null;
    if (!s?.on) return;
    const el = e.currentTarget;
    const w = el.offsetWidth;
    if (e.type === 'pointerup' && Math.abs(s.dx) > Math.min(110, w / 3))
      settle(el, `translateX(${Math.sign(s.dx) * w}px)`, onRemove);
    else settle(el, '');
  };

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse')
        g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, on: false };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = g.current;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.on) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          g.current = null;
          return;
        }
        if (Math.abs(dx) < 10) return;
        s.on = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      s.dx = dx;
      e.currentTarget.style.transition = 'none';
      e.currentTarget.style.transform = `translateX(${dx}px)`;
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}

/** One cart line: thumbnail, name, variant + add-ons, stepper, remove; sold-out lines get a stamp. */
export function CartLineView(p: CartLineViewProps) {
  const t = useTranslations();
  const swipe = useSwipe(p.onRemove);

  return (
    <li className="relative isolate">
      {/* Revealed under the card while swiping */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 flex items-center justify-between rounded-card border-3 border-ink bg-orange px-5 font-display text-xl text-ink"
      >
        <span>{t('cartFlow.removeShort')}</span>
        <span>{t('cartFlow.removeShort')}</span>
      </div>
      <div
        {...swipe}
        className={clsx(
          'flex touch-pan-y gap-3 rounded-card border-3 border-ink p-3 shadow-hard-sm',
          p.soldOut ? 'bg-yellow' : 'bg-white',
        )}
      >
        <div className="relative shrink-0">
          {p.image ? (
            <Image
              src={p.image}
              alt=""
              width={72}
              height={72}
              sizes="72px"
              className={clsx(
                'aspect-square size-18 rounded-sticker border-2 border-ink object-cover',
                p.soldOut && 'grayscale',
              )}
            />
          ) : (
            <div className="grid size-18 place-items-center rounded-sticker border-2 border-ink bg-paper halftone">
              <Bolt size={26} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-price text-2xl leading-none tracking-[0.02em] uppercase">
                {p.name}
              </p>
              {p.variant && <p className="text-sm text-muted">{p.variant}</p>}
              {p.modifiers.length > 0 && (
                <p className="text-sm text-muted">
                  {t('cartFlow.modifiers', { list: p.modifiers.join(', ') })}
                </p>
              )}
              {p.note && (
                <p className="text-sm text-muted italic">{t('cartFlow.note', { note: p.note })}</p>
              )}
            </div>
            <button
              type="button"
              onClick={p.onRemove}
              aria-label={t('cart.remove', { name: p.name })}
              className="-me-1 -mt-1 grid size-11 shrink-0 press place-items-center rounded-chip border-2 border-ink bg-white text-2xl leading-none shadow-hard-sm [--press-x:3px] [--press-y:3px]"
            >
              ×
            </button>
          </div>

          {p.soldOut ? (
            <div className="mt-2 space-y-2">
              <Stamp tone="orange" tilt={-6} size="sm" animate>
                {t('cartFlow.soldOutStamp')}
              </Stamp>
              <p className="text-sm">{t('cartFlow.soldOutBody')}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={p.onRemove}
                  className="min-h-11 press rounded-chip border-2 border-ink bg-white px-3 font-display text-lg shadow-hard-sm [--press-x:3px] [--press-y:3px]"
                >
                  {t('cartFlow.removeShort')}
                </button>
                <Link
                  href={p.replaceHref}
                  onClick={p.onNavigate}
                  aria-label={t('cartFlow.replaceLabel', { name: p.name })}
                  className="inline-flex min-h-11 press items-center rounded-chip border-2 border-ink bg-orange px-3 font-display text-lg text-ink shadow-hard-sm [--press-x:3px] [--press-y:3px]"
                >
                  {t('cartFlow.replace')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Stepper value={p.qty} onChange={p.onQty} />
              <span className="font-price text-2xl tracking-[0.02em]">
                {t('price.rs', { amount: formatAmount(p.lineTotal) })}
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * In-cart undo pill, styled like the toast. Toasts render under an open <dialog> (top layer), so
 * the drawer shows its own. Put it inside a `role="status"` region that is always mounted.
 */
export function UndoPill({
  message,
  onUndo,
  autoFocus,
}: {
  message: string;
  onUndo: () => void;
  autoFocus?: boolean;
}) {
  const t = useTranslations('cart');
  return (
    <div className="mx-auto flex w-fit animate-pop items-center gap-2 rounded-full border-3 border-ink bg-ink py-1.5 ps-3 pe-1.5 text-base font-medium text-white shadow-hard-orange">
      <Bolt size={22} />
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        autoFocus={autoFocus}
        className="min-h-11 press rounded-full border-2 border-ink bg-yellow px-4 font-display text-base leading-none text-ink [--press-x:2px] [--press-y:2px]"
      >
        {t('undo')}
      </button>
    </div>
  );
}
