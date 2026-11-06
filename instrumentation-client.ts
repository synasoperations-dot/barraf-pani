/**
 * Optional Sentry error reporting in the browser. Off unless NEXT_PUBLIC_SENTRY_DSN is set; the
 * SDK is then loaded lazily, so it never weighs on first load (§2.5). The DSN is a public key
 * by design (not a secret). Customer text and phones are scrubbed before sending (§7).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import('@sentry/browser')
    .then((Sentry) =>
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
        sampleRate: 1,
        tracesSampleRate: 0,
        beforeSend(event) {
          // Tracking and booking tokens are capabilities: strip them from URLs.
          const scrub = (s?: string) =>
            s
              ?.replace(/\/(track|order|booking|pay\/[a-z]+)\/[0-9a-f]{32}/g, '/$1/[token]')
              .replace(/\+?92\d{10}/g, '[phone]');
          if (event.request?.url) event.request.url = scrub(event.request.url);
          if (event.message) event.message = scrub(event.message);
          return event;
        },
      }),
    )
    .catch(() => {});
}
