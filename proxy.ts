import { NextResponse, type NextRequest } from 'next/server';
import { MOCK_SESSION_COOKIE } from '@/lib/contracts/common';
import { LOCALE_COOKIE } from '@/lib/i18n/config';

/** Customer pages that need a phone-OTP session (§2.1). Guest checkout stays open. */
const PROTECTED = /^\/account(\/|$)/;

/** Supabase auth cookies (`sb-<ref>-auth-token`, possibly chunked `.0`, `.1`), or the mock marker. */
const hasSession = (req: NextRequest) =>
  req.cookies
    .getAll()
    .some((c) => c.name === MOCK_SESSION_COOKIE || /^sb-.+-auth-token/.test(c.name));

/**
 * Runs before every page (not /api or static files):
 * 1. MAINTENANCE_MODE=true → every page shows /maintenance.
 * 2. `?lang=ur|en` → that locale for this request + remembered in the cookie. These are the
 *    hreflang alternate URLs, so crawlers can fetch the Urdu version without a cookie.
 * 3. /account/* without a session → /login?next=<where they were going>.
 * The session check here is only a redirect hint; every /api/me* call is still authorised by the server.
 */
export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (process.env.MAINTENANCE_MODE === 'true' && pathname !== '/maintenance')
    return NextResponse.rewrite(new URL('/maintenance', req.url));

  if (PROTECTED.test(pathname) && !hasSession(req)) {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  const lang = searchParams.get('lang');
  if (lang === 'en' || lang === 'ur') {
    req.cookies.set(LOCALE_COOKIE, lang); // this request renders in `lang`
    const res = NextResponse.next({ request: { headers: req.headers } });
    res.cookies.set(LOCALE_COOKIE, lang, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: not API routes, Next internals, metadata files or anything with an extension.
  matcher: ['/((?!api|_next|dev/|icon|apple-icon|opengraph-image|.*\\..*).*)'],
};
