'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { Wordmark } from '@/components/ui/Logo';
import { Wave } from '@/components/ui/motifs';
import { Tag } from '@/components/ui/states';
import { SITE } from '@/lib/site';

const telHref = (phone: string) => `tel:${phone}`;
const waHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

export function Footer() {
  const t = useTranslations('footer');
  const store = SITE;
  const socials = (['instagram', 'facebook', 'tiktok'] as const).map(
    (k) => [k, SITE.socials[k]] as const,
  );

  return (
    <footer className="mt-16 text-white">
      <Wave preset="blob" fillClassName="fill-ink" />
      <div className="bg-ink">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-6 pb-10 md:grid-cols-3">
          <section aria-labelledby="footer-find">
            <h2 id="footer-find" className="mb-3 font-display text-2xl text-yellow">
              {t('findUs')}
            </h2>
            <p className="mb-4 text-white/90">{store.address}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={telHref(store.phone)}
                className={buttonClasses({ variant: 'ghost', size: 'sm' })}
              >
                {t('call')}
              </a>
              <a
                href={waHref(store.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'whatsapp', size: 'sm' })}
              >
                {t('whatsapp')}
              </a>
            </div>
          </section>

          <section aria-labelledby="footer-follow">
            <h2 id="footer-follow" className="mb-3 font-display text-2xl text-yellow">
              {t('follow')}
            </h2>
            <ul className="flex flex-wrap gap-3">
              {socials.map(([key, url]) => (
                <li key={key}>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                    >
                      {t(key)}
                    </a>
                  ) : (
                    // TODO: social links TBC (docs/OPEN_QUESTIONS.md)
                    <span className="inline-flex items-center gap-2 text-white/70">
                      {t(key)} <Tag tone="white">TBC</Tag>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="mb-3 font-display text-2xl text-yellow">
              {t('legal')}
            </h2>
            <ul className="space-y-2">
              {(
                [
                  ['/privacy', 'privacy'],
                  ['/terms', 'terms'],
                  ['/refund-policy', 'refunds'],
                ] as const
              ).map(([href, key]) => (
                <li key={href}>
                  <Link href={href} className="text-blue-light underline-offset-4 hover:underline">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="overflow-hidden border-t-3 border-white/10 px-4 pt-8 pb-28 md:pb-10">
          <div className="mx-auto max-w-6xl">
            <Wordmark className="text-[clamp(3rem,13vw,9rem)]" />
            <p className="mt-4 font-display text-xl text-white">{t('tagline')}</p>
            <p className="mt-2 text-sm text-white/70">
              {t('rights', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
