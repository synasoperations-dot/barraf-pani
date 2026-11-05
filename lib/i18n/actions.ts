'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, type AppLocale } from './request';

export async function setLocale(locale: AppLocale) {
  (await cookies()).set(LOCALE_COOKIE, locale === 'ur' ? 'ur' : 'en', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
