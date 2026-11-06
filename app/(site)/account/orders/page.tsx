import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { OrderHistory } from '@/components/account/OrderHistory';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.orders');
  return pageMeta({ path: '/account/orders', title: t('metaTitle'), noindex: true });
}

export default function Page() {
  return <OrderHistory />;
}
