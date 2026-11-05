import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import en, { type Messages } from './messages/en';
import ur from './messages/ur';

export const LOCALES = ['en', 'ur'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const isRtl = (l: AppLocale) => l === 'ur';

// ponytail: cookie-based locale (no /ur URL prefix), matching the folder structure in ARCHITECTURE §11.
// Reading the cookie makes pages dynamic; menu *data* stays cached by tag. Move to an [locale]
// segment if fully static HTML for Home/Menu becomes a requirement.
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: AppLocale = value === 'ur' ? 'ur' : 'en';
  return { locale, messages: { en, ur }[locale], timeZone: 'Asia/Karachi' };
});

declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale;
    Messages: Messages;
  }
}
