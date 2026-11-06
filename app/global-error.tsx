'use client';

import { buttonClasses } from '@/components/ui/Button';
import { SystemScreen } from '@/components/site/SystemScreens';
import en from '@/lib/i18n/messages/en/system';
import ur from '@/lib/i18n/messages/ur/system';
import { latinFontVars } from '@/lib/fonts';
import { SITE, waHref } from '@/lib/site';
import './globals.css';

/**
 * The root layout itself failed, so there are no providers (no next-intl, no locale cookie read).
 * Shows the English copy with the Urdu line under it.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" className={latinFontVars}>
      <body className="min-h-dvh antialiased">
        <title>{en.error.title}</title>
        <SystemScreen
          title={en.error.title}
          body={
            <>
              {en.error.body}
              <span lang="ur" dir="rtl" className="mt-2 block">
                {ur.error.body}
              </span>
            </>
          }
          actions={
            <>
              <button type="button" onClick={retry} className={buttonClasses({ size: 'lg' })}>
                {en.error.retry}
              </button>
              <a
                href={waHref(SITE.whatsapp, en.error.whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'whatsapp', size: 'lg' })}
              >
                {en.error.whatsapp}
              </a>
            </>
          }
        />
      </body>
    </html>
  );
}
