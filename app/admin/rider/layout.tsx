import type { Metadata, Viewport } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { colors } from '@/tailwind.config';

export async function generateMetadata(): Promise<Metadata> {
  const title = (await getTranslations('admin.nav'))('rider');
  return {
    title,
    manifest: '/admin/rider/manifest.webmanifest',
    appleWebApp: { capable: true, title },
  };
}
export const viewport: Viewport = { themeColor: colors.paper };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
