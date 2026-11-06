'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { CartCheckout, CartContents } from '@/components/cart/CartContents';
import { Drawer } from '@/components/ui/Dialog';
import { track } from '@/lib/analytics';
import { selectEstimate, useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';

/** Cart drawer (inline-end edge, every page). Same contents as /cart; the CTA sits in the footer. */
export function CartDrawer() {
  const t = useTranslations('cart');
  const open = useUi((s) => s.cartOpen);
  const setOpen = useUi((s) => s.setCartOpen);
  const hasLines = useCart((s) => s.lines.length > 0);
  const pathname = usePathname();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const s = useCart.getState();
    track('cart_viewed', { lines: s.lines.length, estimate: selectEstimate(s) });
  }, [open]);

  // Back/forward navigation doesn't go through our links: close on any route change.
  useEffect(() => useUi.getState().setCartOpen(false), [pathname]);

  return (
    <Drawer
      open={open}
      onClose={close}
      title={t('title')}
      footer={hasLines && <CartCheckout onNavigate={close} />}
    >
      <CartContents layout="drawer" onNavigate={close} />
    </Drawer>
  );
}
