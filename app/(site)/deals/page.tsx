import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DealsPage } from '@/components/deals/DealsPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { getDealsEvents, getMenu } from '@/features/menu/server';
import { getBusinessFacts } from '@/lib/business-facts';
import { breadcrumbJsonLd, eventJsonLd } from '@/lib/seo/jsonld';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('deals');
  return pageMeta({ path: '/deals', title: t('metaTitle'), description: t('metaDescription') });
}

/** Deals & Events (§A2): cached with tag `menu` (the server returns upcoming events only). */
export default async function Page() {
  const [data, menu, facts] = await Promise.all([getDealsEvents(), getMenu(), getBusinessFacts()]);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(facts, [
            ['Home', '/'],
            ['Deals & Events', '/deals'],
          ]),
          ...(data?.events ?? []).map((e) => eventJsonLd(facts, e)),
        ]}
      />
      <DealsPage initial={data ?? undefined} initialMenu={menu ?? undefined} />
    </>
  );
}
