'use client';

import { useTranslations } from 'next-intl';
import { formatAmount } from '@/lib/format';
import { selectCount, selectEstimate, useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';

/** Floating ink bar on mobile: "N items · Delivery · Rs total · View cart". */
export function MobileCartBar() {
  const t = useTranslations();
  const count = useCart(selectCount);
  const total = useCart(selectEstimate);
  const fulfilment = useCart((s) => s.fulfilment);
  const setOpen = useUi((s) => s.setCartOpen);
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full press animate-pop items-center gap-2 rounded-button border-3 border-ink bg-ink px-4 py-3 text-start text-white shadow-hard-orange"
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          {t('cart.items', { count })} · {t(`fulfilment.${fulfilment}`)} ·{' '}
          <span className="font-price text-xl tracking-[0.02em]">
            {t('price.rs', { amount: formatAmount(total) })}
          </span>
        </span>
        <span className="shrink-0 rounded-chip border-2 border-ink bg-yellow px-3 py-1 font-display text-lg text-ink">
          {t('cart.viewCart')}
        </span>
      </button>
    </div>
  );
}
