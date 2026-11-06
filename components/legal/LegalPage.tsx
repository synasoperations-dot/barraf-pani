import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { JsonLd } from '@/components/seo/JsonLd';
import { getBusinessFacts } from '@/lib/business-facts';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { pageMeta } from '@/lib/seo/meta';
import { LegalArticle, type LegalDocKey, type LegalSection } from './LegalArticle';

/** Date the draft text last changed. */
const UPDATED = '2026-11-06';

const PATHS: Record<LegalDocKey, string> = {
  privacy: '/privacy',
  terms: '/terms',
  refunds: '/refunds',
};

export async function legalMetadata(doc: LegalDocKey): Promise<Metadata> {
  const t = await getTranslations('legal');
  return pageMeta({
    path: PATHS[doc],
    title: t(`${doc}.metaTitle`),
    description: t(`${doc}.metaDescription`),
  });
}

/** Server page body for /privacy, /terms, /refunds (DRAFT: needs a lawyer's review). */
export async function LegalPage({ doc }: { doc: LegalDocKey }) {
  const [t, format, facts, en] = await Promise.all([
    getTranslations('legal'),
    getFormatter(),
    getBusinessFacts(),
    getTranslations({ locale: 'en', namespace: 'legal' }),
  ]);
  const date = format.dateTime(new Date(`${UPDATED}T12:00:00Z`), { dateStyle: 'long' });
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(facts, [
          ['Home', '/'],
          [en(`${doc}.title`), PATHS[doc]],
        ])}
      />
      <LegalArticle
        doc={doc}
        title={t(`${doc}.title`)}
        intro={t(`${doc}.intro`)}
        sections={t.raw(`${doc}.sections`) as LegalSection[]}
        labels={{
          draft: t('draft'),
          draftBody: t('draftBody'),
          updated: t('updated', { date }),
          toc: t('toc'),
          questions: t('questions'),
          questionsBody: t('questionsBody'),
          contact: t('contact'),
          deleteData: t('deleteData'),
        }}
      />
    </>
  );
}
