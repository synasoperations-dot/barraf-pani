import clsx from 'clsx';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { latinFontVars, urduFontVars } from '@/lib/fonts';
import { isRtl } from '@/lib/i18n/request';
import { Providers } from './providers';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: t('title'), description: t('description') };
}

export const viewport: Viewport = {
  // eslint-disable-next-line no-restricted-syntax -- <meta theme-color> cannot read CSS vars; this is --color-blue.
  themeColor: '#1C9AD6',
  width: 'device-width',
  initialScale: 1,
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
