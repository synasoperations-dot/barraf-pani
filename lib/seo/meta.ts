import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

interface PageMetaInput {
  /** Path without query, e.g. "/menu". */
  path: string;
  /** Page title; the root layout's template adds "· Barraf Paani, Jhang". */
  title?: string;
  description?: string;
  /** Private pages (/account, /track, /order, /booking, /pay). */
  noindex?: boolean;
}

/**
 * Per-page metadata: canonical URL, Urdu hreflang alternate (`?lang=ur`, which proxy.ts turns
 * into the locale cookie), Open Graph. The OG image comes from app/opengraph-image.tsx.
 */
export function pageMeta({ path, title, description, noindex }: PageMetaInput): Metadata {
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: noindex
      ? undefined
      : {
          canonical: path,
          languages: { en: path, ur: `${path}?lang=ur`, 'x-default': path },
        },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      url: path,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      locale: 'en_PK',
      alternateLocale: ['ur_PK'],
    },
    ...(noindex ? { robots: { index: false, follow: false }, referrer: 'no-referrer' } : {}),
  };
}
