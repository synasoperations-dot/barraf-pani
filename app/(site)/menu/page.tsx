import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MenuPage } from '@/components/menu/MenuPage';
import { getMenu, getStoreStatus } from '@/features/menu/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('menuPage.metaTitle')} · ${t('brand.name')}`,
    description: t('menuPage.metaDescription'),
  };
}

/** Server-rendered from the cached menu (tag `menu`); the client island keeps sold-out live. */
export default async function Page() {
  const [menu, status] = await Promise.all([getMenu(), getStoreStatus()]);
  return <MenuPage initialMenu={menu ?? undefined} initialStatus={status ?? undefined} />;
}
