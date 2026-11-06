import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ItemDetail } from '@/components/item/ItemDetail';
import { findItemBySlug, itemImage } from '@/features/menu/helpers';
import { getMenu } from '@/features/menu/server';
import { localized } from '@/lib/format';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, menu, t, locale] = await Promise.all([
    params,
    getMenu(),
    getTranslations('item'),
    getLocale(),
  ]);
  const item = menu && findItemBySlug(menu, slug);
  if (!menu || !item) return {};
  const name = localized(item.name, locale);
  const image = itemImage(menu, item);
  return {
    title: t('metaTitle', { name }),
    description: t('metaDescription', { name }),
    openGraph: image ? { images: [image] } : undefined,
  };
}

/** Direct load / refresh of /item/[slug]: the full page, server-rendered from the cached menu. */
export default async function ItemPage({ params }: Props) {
  const [{ slug }, menu] = await Promise.all([params, getMenu()]);
  // A null menu (server read failed) falls back to the client fetch, which has its own states.
  if (menu && !findItemBySlug(menu, slug)) notFound();
  return <ItemDetail slug={slug} initial={menu ?? undefined} mode="page" />;
}
