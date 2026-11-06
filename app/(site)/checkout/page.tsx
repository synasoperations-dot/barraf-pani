import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CheckoutScreen } from '@/components/checkout/CheckoutScreen';
import { getMenu, getStoreStatus } from '@/features/menu/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return { title: t('metaTitle'), robots: { index: false } };
}

/** Checkout is client-side (§2.1); the server only seeds store status and the menu. */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, store, menu] = await Promise.all([searchParams, getStoreStatus(), getMenu()]);
  return (
    <CheckoutScreen
      initialStore={store ?? undefined}
      initialMenu={menu ?? undefined}
      schedule={sp.schedule === '1'}
      payCod={sp.payment === 'cod'}
    />
  );
}
