import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CartContents } from '@/components/cart/CartContents';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { getMenu, getStoreStatus } from '@/features/menu/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('cartFlow');
  return { title: t('metaTitle') };
}

/** Full-page cart: same contents as the drawer; desktop splits lines | summary. */
export default async function CartPage() {
  const [t, menu, status] = await Promise.all([
    getTranslations('cartFlow'),
    getMenu(),
    getStoreStatus(),
  ]);
  return (
    <div className="grid-paper">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <StickerHeading as="h1" align="start" size="md" tilt={-2} className="mb-8">
          {t('title')}
        </StickerHeading>
        <CartContents layout="page" menu={menu ?? undefined} status={status ?? undefined} />
      </div>
    </div>
  );
}
