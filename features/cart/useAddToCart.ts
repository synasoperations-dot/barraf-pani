'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from '@/components/ui/Toast';
import { track } from '@/lib/analytics';
import type { Item, Modifier, Variant } from '@/lib/contracts';
import { localized } from '@/lib/format';
import { flyToCart } from '@/lib/motion';
import { lineKey, useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';
import { unitEstimate } from '@/features/menu/helpers';

export interface AddToCartArgs {
  item: Item;
  variant: Variant;
  modifiers?: Modifier[];
  qty?: number;
  note?: string | null;
  /** Photo for the cart line and the flying thumbnail (itemImage()). */
  image: string | null;
  /** The tapped element: flyToCart starts here. */
  from?: Element | null;
  source: 'menu' | 'item' | 'deal' | 'home' | 'cart';
  /** "Undo" (menu chips) or "View cart" (item detail). */
  toastAction?: 'undo' | 'viewCart';
}

/**
 * The one add-to-cart path: the store updates instantly (no layout animation on the hot path),
 * then flyToCart → badge bump → toast, plus the `added_to_cart` funnel event.
 */
export function useAddToCart() {
  const t = useTranslations('cart');
  const locale = useLocale();

  return useCallback(
    ({
      item,
      variant,
      modifiers = [],
      qty = 1,
      note = null,
      image,
      from,
      source,
      toastAction = 'undo',
    }: AddToCartArgs) => {
      const cart = useCart.getState();
      const line = {
        itemId: item.id,
        variantId: variant.id,
        modifierIds: modifiers.map((m) => m.id),
        qty,
        note,
      };
      const key = lineKey(line);
      const before = cart.lines.find((l) => l.key === key)?.qty ?? 0;

      cart.add({
        ...line,
        snapshot: {
          name: item.name,
          size: variant.size,
          option: variant.option,
          unitPrice: unitEstimate(variant, modifiers),
          image,
        },
      });
      track('added_to_cart', { itemId: item.id, variantId: variant.id, qty, source });

      const target = document.getElementById('cart-target');
      if (from && target)
        void flyToCart(
          from.getBoundingClientRect(),
          target.getBoundingClientRect(),
          image ?? undefined,
        );

      const name = localized(item.name, locale);
      toast(t('addedToast', { name }), {
        action:
          toastAction === 'undo'
            ? {
                label: t('undo'),
                onClick: () => {
                  const c = useCart.getState();
                  if (before === 0) c.remove(key);
                  else c.setQty(key, before);
                },
              }
            : { label: t('viewCart'), onClick: () => useUi.getState().setCartOpen(true) },
      });
    },
    [t, locale],
  );
}
