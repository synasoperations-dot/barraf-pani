'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { Wordmark } from '@/components/ui/Logo';
import { Wave } from '@/components/ui/motifs';
import { Tag } from '@/components/ui/states';
import type { BusinessFacts } from '@/lib/business-facts';
import { formatPkPhone } from '@/lib/phone';
import { SITE, telHref } from '@/lib/site';
import { FactsBlock } from './FactsBlock';
import { LanguageToggle } from './LanguageToggle';

const LINKS = [
  ['/menu', 'menu'],
  ['/deals', 'deals'],
  ['/about', 'about'],
  ['/contact', 'contact'],
  ['/faq', 'faq'],
  ['/track', 'track'],
  ['/account', 'account'],
] as const;

const LEGAL = [
  ['/privacy', 'privacy'],
  ['/terms', 'terms'],
  ['/refunds', 'refunds'],
] as const;

const linkClass = 'text-blue-light underline-offset-4 hover:underline';

/** Name, address and phone come from business facts, so they match every page and the JSON-LD. */
export function Footer({ facts }: { facts: BusinessFacts }) {
  const t = useTranslations('footer');
  const socials = (['instagram', 'facebook', 'tiktok'] as const).map(
    (k) => [k, SITE.socials[k]] as const,
  );
  const google = [
    ['findOnGoogle', facts.googleProfileUrl ?? facts.mapsUrl],
    ['reviewOnGoogle', facts.googleReviewUrl],
  ] as const;

  return (
    <footer className="mt-16 text-white">
      <Wave preset="blob" fillClassName="fill-ink" />
      <div className="bg-ink">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-6 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <section aria-labelledby="footer-find">
            <h2 id="footer-find" className="mb-3 font-display text-2xl text-yellow">
              {t('findUs')}
            </h2>
            <address className="mb-4 text-white/90 not-italic">
              {facts.name}
              <br />
              {facts.address.full}
              <br />
              <a href={telHref(facts.phone)} dir="ltr" className={linkClass}>
                {formatPkPhone(facts.phone)}
              </a>
            </address>
            <div className="flex flex-wrap gap-3">
              <a
                href={telHref(facts.phone)}
                className={buttonClasses({ variant: 'ghost', size: 'sm' })}
              >
                {t('call')}
              </a>
              <a
                href={facts.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'whatsapp', size: 'sm' })}
              >
                {t('whatsapp')}
              </a>
            </div>
            <ul className="mt-4 space-y-2">
              {google.map(([key, url]) => (
                <li key={key}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {t(key)}
                    </a>
                  ) : (
                    // TODO_CONFIRM: Google Business Profile review link (docs/OPEN_QUESTIONS.md)
                    <span className="inline-flex items-center gap-2 text-white/70">
                      {t(key)} <Tag tone="white">TBC</Tag>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="mb-3 font-display text-2xl text-yellow">
              {t('explore')}
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
              {LINKS.map(([href, key]) => (
                <li key={href}>
                  <Link href={href} className={`${linkClass} inline-block py-1`}>
                    {t(`links.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

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
            <div className="mt-6">
              <p className="mb-2 text-sm text-white/70">{t('language')}</p>
              <LanguageToggle />
            </div>
          </section>

          <section aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="mb-3 font-display text-2xl text-yellow">
              {t('legal')}
            </h2>
            <ul className="space-y-2">
              {LEGAL.map(([href, key]) => (
                <li key={href}>
                  <Link href={href} className={`${linkClass} inline-block py-1`}>
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* "At a glance" facts for people and AI assistants: desktop only (About has the full one). */}
        <div className="mx-auto hidden max-w-6xl px-4 pb-10 lg:block">
          <FactsBlock facts={facts} variant="footer" />
        </div>

        <div className="overflow-hidden border-t-3 border-white/10 px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-10">
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
