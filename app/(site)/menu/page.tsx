import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MenuPage } from '@/components/menu/MenuPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { getMenu, getStoreStatus } from '@/features/menu/server';
import { getBusinessFacts } from '@/lib/business-facts';
import { breadcrumbJsonLd, menuJsonLd } from '@/lib/seo/jsonld';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('menuPage');
  return pageMeta({ path: '/menu', title: t('metaTitle'), description: t('metaDescription') });
}

/**
 * Server-rendered from the cached menu (tag `menu`): names and prices are real HTML on first
 * load. The client island keeps sold-out live. JSON-LD Menu → MenuSection → MenuItem (PKR).
 */
export default async function Page() {
  const [menu, status, facts] = await Promise.all([
    getMenu(),
    getStoreStatus(),
    getBusinessFacts(),
  ]);
  return (
    <>
      {menu && (
        <JsonLd
          data={[
            menuJsonLd(facts, menu),
            breadcrumbJsonLd(facts, [
              ['Home', '/'],
              ['Menu', '/menu'],
            ]),
          ]}
        />
      )}
      <MenuPage initialMenu={menu ?? undefined} initialStatus={status ?? undefined} />
    </>
  );
}
