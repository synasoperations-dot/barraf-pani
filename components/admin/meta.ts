import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Messages } from '@/lib/i18n/messages/en';

/** `export const generateMetadata = adminMeta('orders')`: translated tab titles for staff pages. */
export const adminMeta = (key: keyof Messages['admin']['nav']) => async (): Promise<Metadata> => ({
  title: (await getTranslations('admin.nav'))(key),
});
