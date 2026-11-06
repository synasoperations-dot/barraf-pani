import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { LoginScreen } from '@/components/account/LoginScreen';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.login');
  return pageMeta({ path: '/login', title: t('metaTitle'), noindex: true });
}

export default function LoginPage() {
  // useSearchParams (the ?next= redirect) needs a Suspense boundary.
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
