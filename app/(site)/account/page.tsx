import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProfileScreen } from '@/components/account/ProfileScreen';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.profile');
  return pageMeta({ path: '/account', title: t('metaTitle'), noindex: true });
}

export default function Page() {
  return <ProfileScreen />;
}
