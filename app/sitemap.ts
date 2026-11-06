import type { MetadataRoute } from 'next';
import { getMenuForSeo } from '@/lib/business-facts';
import { SITE_URL } from '@/lib/site';

/** Public pages + every item page. `lastModified` follows the menu's update time. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const menu = await getMenuForSeo();
  const updated = menu ? new Date(menu.updatedAt) : new Date();
  const page = (
    path: string,
    priority: number,
    changeFrequency: 'daily' | 'weekly' | 'monthly',
  ) => ({
    url: `${SITE_URL}${path}`,
    lastModified: updated,
    changeFrequency,
    priority,
    alternates: { languages: { en: `${SITE_URL}${path}`, ur: `${SITE_URL}${path}?lang=ur` } },
  });
  return [
    page('/', 1, 'daily'),
    page('/menu', 0.9, 'daily'),
    page('/deals', 0.8, 'daily'),
    page('/contact', 0.7, 'monthly'),
    page('/about', 0.6, 'monthly'),
    page('/faq', 0.6, 'monthly'),
    page('/privacy', 0.2, 'monthly'),
    page('/terms', 0.2, 'monthly'),
    page('/refunds', 0.2, 'monthly'),
    ...(menu?.items.filter((i) => i.isActive).map((i) => page(`/item/${i.slug}`, 0.5, 'weekly')) ??
      []),
  ];
}
