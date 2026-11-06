import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SiteShell } from '@/components/site/SiteShell';
import { NotFoundScreen } from '@/components/site/SystemScreens';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('system.notFound');
  return { title: t('metaTitle'), robots: { index: false } };
}

/** Any unknown URL (and notFound() anywhere outside a closer not-found). */
export default async function NotFound() {
  const t = await getTranslations('system.notFound');
  return (
    <SiteShell>
      <NotFoundScreen
        t={{ title: t('title'), body: t('body'), menu: t('menu'), home: t('home'), art: t('art') }}
      />
    </SiteShell>
  );
}
