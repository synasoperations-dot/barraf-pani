import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Gallery } from '@/components/about/Gallery';
import { OurStuff, StoryQuote } from '@/components/about/parts';
import { Reels } from '@/components/about/Reels';
import { JsonLd } from '@/components/seo/JsonLd';
import { FactsBlock } from '@/components/site/FactsBlock';
import { PageHeader } from '@/components/site/PageHeader';
import { getBusinessFacts } from '@/lib/business-facts';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');
  return pageMeta({ path: '/about', title: t('metaTitle'), description: t('metaDescription') });
}

/** About / The spot. The facts block is server-rendered text from business facts. */
export default async function AboutPage() {
  const [t, facts] = await Promise.all([getTranslations('about'), getBusinessFacts()]);
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(facts, [
          ['Home', '/'],
          ['About', '/about'],
        ])}
      />
      <PageHeader title={t('title')} sub={t('sub')} />
      <StoryQuote />
      <Gallery />
      <Reels />
      <OurStuff />
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <FactsBlock facts={facts} />
      </div>
    </>
  );
}
