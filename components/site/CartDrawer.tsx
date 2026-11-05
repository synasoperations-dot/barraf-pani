'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Dialog';
import { Odometer } from '@/components/ui/Odometer';
import { EmptyState, Tag } from '@/components/ui/states';
import { Stepper } from '@/components/ui/Stepper';
import { formatAmount, localized } from '@/lib/format';
import { selectEstimate, useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';

/** Shell cart drawer. The full cart/checkout flow arrives in prompt 3. */
export function CartDrawer() {
  const t = useTranslations();
  const locale = useLocale();
  const open = useUi((s) => s.cartOpen);
  const setOpen = useUi((s) => s.setCartOpen);
  const lines = useCart((s) => s.lines);
  const soldOut = useCart((s) => s.soldOutItemIds);
  const estimate = useCart(selectEstimate);
  const { setQty, remove } = useCart.getState();
  const close = () => setOpen(false);

  return (
    <Drawer
      open={open}
      onClose={close}
      title={t('cart.title')}
      footer={
        lines.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="font-bold">{t('cart.subtotal')}</span>
              <Odometer value={estimate} className="text-3xl" />
            </div>
            <p className="text-sm text-muted">{t('cart.estimateNote')}</p>
            <Link
              href="/checkout"
              onClick={close}
              className={buttonClasses({ block: true, size: 'lg' })}
            >
              {t('cart.checkout')}
            </Link>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          title={t('cart.emptyTitle')}
          body={t('cart.emptyBody')}
          action={
            <Link href="/menu" onClick={close} className={buttonClasses({ variant: 'secondary' })}>
              {t('cart.browseMenu')}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {lines.map((l) => {
            const name = localized(l.snapshot.name, locale);
            const variant = [
              l.snapshot.size,
              l.snapshot.option && t(`variant.${l.snapshot.option}`),
            ]
              .filter(Boolean)
              .join(' · ');
            const isSoldOut = soldOut.includes(l.itemId);
            return (
              <li
                key={l.key}
                className={`flex gap-3 rounded-input border-3 bg-white p-3 ${isSoldOut ? 'border-orange-deep' : 'border-ink'}`}
              >
                {l.snapshot.image && (
                  <Image
                    src={l.snapshot.image}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 shrink-0 rounded-chip border-2 border-ink object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-price text-2xl leading-none tracking-[0.02em] uppercase">
                      {name}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(l.key)}
                      className="text-sm underline"
                      aria-label={t('cart.remove', { name })}
                    >
                      ×
                    </button>
                  </div>
                  {variant && <p className="text-sm text-muted">{variant}</p>}
                  {isSoldOut && <Tag tone="orange">{t('common.soldOut')}</Tag>}
                  <div className="mt-2 flex items-center justify-between">
                    <Stepper size="sm" value={l.qty} onChange={(q) => setQty(l.key, q)} />
                    <span className="font-price text-2xl">
                      {t('price.rs', { amount: formatAmount(l.snapshot.unitPrice * l.qty) })}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
