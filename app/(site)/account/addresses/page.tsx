import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AddressBook } from '@/components/account/AddressBook';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.addresses');
  return pageMeta({ path: '/account/addresses', title: t('metaTitle'), noindex: true });
}

export default function Page() {
  return <AddressBook />;
}
