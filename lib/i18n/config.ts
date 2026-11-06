/** Locale constants with no imports, so proxy.ts can use them without bundling the messages. */
export const LOCALES = ['en', 'ur'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const isRtl = (l: AppLocale) => l === 'ur';
