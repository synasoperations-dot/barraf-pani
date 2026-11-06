import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');
const isDev = process.env.NODE_ENV !== 'production';

// TBC: real JazzCash / Easypaisa hosted-page hosts (docs/OPEN_QUESTIONS.md).
const PAYMENT_FORM_HOSTS = [
  'https://sandbox.jazzcash.com.pk',
  'https://payments.jazzcash.com.pk',
  'https://easypay.easypaisa.com.pk',
];
const TURNSTILE = 'https://challenges.cloudflare.com';
const POSTHOG = 'https://*.posthog.com';

// ponytail: 'unsafe-inline' scripts because Next's inline RSC payload needs it without nonces.
// Upgrade path: per-request nonces via proxy.ts once pages need it (§7 "strict CSP").
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${POSTHOG}`, // TODO(backend): add the Supabase https + wss hosts
  "worker-src 'self'", // MSW service worker (dev)
  `frame-src ${TURNSTILE}`,
  `form-action 'self' ${PAYMENT_FORM_HOSTS.join(' ')}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
  },
  ...(isDev
    ? []
    : [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ]),
];

const nextConfig: NextConfig = {
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Tracking tokens must never leak via the Referer header (§2.1, §7).
      { source: '/track/:path*', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }] },
    ];
  },
};

export default withNextIntl(nextConfig);
