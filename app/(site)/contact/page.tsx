import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactPage } from '@/components/contact/ContactPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { getStoreStatus } from '@/features/menu/server';
import { getBusinessFacts } from '@/lib/business-facts';
import { ContactTopic } from '@/lib/contracts';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact');
  return pageMeta({ path: '/contact', title: t('metaTitle'), description: t('metaDescription') });
}

/** Address, phone and hours are server-rendered text (facts + store status) on first load. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const [{ topic }, facts, status] = await Promise.all([
    searchParams,
    getBusinessFacts(),
    getStoreStatus(),
  ]);
  const initialTopic = ContactTopic.safeParse(topic).data;
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(facts, [
          ['Home', '/'],
          ['Visit & contact', '/contact'],
        ])}
      />
      <ContactPage facts={facts} initialStatus={status ?? undefined} initialTopic={initialTopic} />
    </>
  );
}
