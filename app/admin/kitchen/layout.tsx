import type { Metadata, Viewport } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { colors } from '@/tailwind.config';

export async function generateMetadata(): Promise<Metadata> {
  const title = (await getTranslations('admin.nav'))('kitchen');
  return {
    title,
    manifest: '/admin/kitchen/manifest.webmanifest',
    appleWebApp: { capable: true, title },
  };
}
export const viewport: Viewport = { themeColor: colors.ink };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
