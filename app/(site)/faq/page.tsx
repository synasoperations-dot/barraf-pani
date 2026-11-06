import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FaqGroups, type FaqGroup } from '@/components/faq/FaqGroups';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHeader } from '@/components/site/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import { getBusinessFacts } from '@/lib/business-facts';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/jsonld';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('faq');
  return pageMeta({ path: '/faq', title: t('metaTitle'), description: t('metaDescription') });
}

export default async function FaqPage() {
  const [t, en, facts] = await Promise.all([
    getTranslations('faq'),
    // FAQPage JSON-LD always uses the canonical English answers.
    getTranslations({ locale: 'en', namespace: 'faq' }),
    getBusinessFacts(),
  ]);
  const groups = t.raw('groups') as FaqGroup[];
  const enGroups = en.raw('groups') as FaqGroup[];
  return (
    <>
      <JsonLd
        data={[
          faqJsonLd(enGroups.flatMap((g) => g.items)),
          breadcrumbJsonLd(facts, [
            ['Home', '/'],
            ['FAQ', '/faq'],
          ]),
        ]}
      />
      <PageHeader title={t('title')} sub={t('sub')} />
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <FaqGroups groups={groups} jumpLabel={t('jump')} />
        <div className="mt-16 rounded-card border-3 border-ink bg-blue-light p-6 text-center shadow-hard-md">
          <h2 className="font-display text-3xl">{t('stillStuck')}</h2>
          <p className="mt-2">{t('stillStuckBody')}</p>
          <Link href="/contact" className={buttonClasses({ className: 'mt-4' })}>
            {t('contact')}
          </Link>
        </div>
      </div>
    </>
  );
}
