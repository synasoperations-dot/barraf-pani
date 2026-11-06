'use client';

import { useTranslations } from 'next-intl';
import { toast } from '@/components/ui/Toast';
import type { Order } from '@/lib/contracts';
import { useMenu } from '@/features/menu/useMenu';
import { reorder } from '@/features/orders/reorder';
import { useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';

/**
 * "Reorder" for the receipt and the expired-payment screen. Opens the cart drawer when every
 * line made it; otherwise toasts (a toast would be hidden behind the open drawer) with
 * "View cart" as its action.
 */
export function useReorder() {
  const t = useTranslations();
  const { data: menu } = useMenu();
  const run = (order: Order, { replaceCart = false } = {}) => {
    if (!menu) return;
    if (replaceCart) useCart.getState().clear();
    const { added, skipped } = reorder(order, menu);
    const openCart = () => useUi.getState().setCartOpen(true);
    if (!added) toast(t('receipt.reorderNone'));
    else if (skipped)
      toast(t('receipt.reorderSkipped', { count: skipped }), {
        action: { label: t('cart.viewCart'), onClick: openCart },
      });
    else openCart();
  };
  return { run, ready: !!menu };
}

/** Clear the cart once the persisted cart has rehydrated (else rehydration would restore it). */
export function clearCartWhenReady() {
  const { persist } = useCart;
  if (persist.hasHydrated()) useCart.getState().clear();
  else {
    const off = persist.onFinishHydration(() => {
      off();
      useCart.getState().clear();
    });
  }
}
