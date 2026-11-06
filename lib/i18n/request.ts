import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import en, { type Messages } from './messages/en';
import ur from './messages/ur';
import { LOCALE_COOKIE, type AppLocale } from './config';

export { isRtl, LOCALE_COOKIE, LOCALES, type AppLocale } from './config';

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
