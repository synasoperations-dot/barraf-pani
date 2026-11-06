import clsx from 'clsx';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { latinFontVars, urduFontVars } from '@/lib/fonts';
import { colors } from '@/tailwind.config';
import { isRtl } from '@/lib/i18n/request';
import { SITE, SITE_URL } from '@/lib/site';
import { Providers } from './providers';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE.name,
    // Location in every title, for "fast food in Jhang" searches (§6b).
    title: { default: t('title'), template: t('template') },
    description: t('description'),
    openGraph: {
      siteName: SITE.name,
      locale: 'en_PK',
      alternateLocale: ['ur_PK'],
      type: 'website',
    },
    twitter: { card: 'summary_large_image' },
    appleWebApp: { capable: true, title: SITE.name, statusBarStyle: 'default' },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: colors.blue, // <meta> can't read CSS vars
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // safe-area insets (notch, home bar) are used by the header/cart bar
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      className={clsx(latinFontVars, isRtl(locale) && urduFontVars)}
    >
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider timeZone="Asia/Karachi">
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
