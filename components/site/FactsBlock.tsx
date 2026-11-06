import clsx from 'clsx';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import type { BusinessFacts } from '@/lib/business-facts';
import { groupHours } from '@/features/store/hours';

const PAY_KEYS = {
  'Cash on delivery': 'cod',
  'Cash at the counter': 'counter',
  JazzCash: 'jazzcash',
  Easypaisa: 'easypaisa',
} as const;

/**
 * "Barraf Paani at a glance": short, plain answers to what people ask search and AI assistants.
 * Everything comes from BusinessFacts (one source). No client hooks beyond next-intl, so it renders
 * in Server Components (About) and inside the client Footer (`variant="footer"`, on ink).
 */
export function FactsBlock({
  facts,
  variant = 'full',
  className,
}: {
  facts: BusinessFacts;
  variant?: 'full' | 'footer';
  className?: string;
}) {
  const t = useTranslations('about.facts');
  const format = useFormatter();
  const footer = variant === 'footer';
  // 2024-01-07 is a Sunday: weekday n (0 = Sunday) → Jan 7 + n. Names come from Intl.
  const day = (n: number) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 7 + n)), { weekday: 'short', timeZone: 'UTC' });
  const time = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return format.dateTime(new Date(Date.UTC(2024, 0, 1, h, m)), {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };
  const rows = groupHours(facts.openingHours);
  const pay = facts.payments
    .map((p) => (p in PAY_KEYS ? t(`pay.${PAY_KEYS[p as keyof typeof PAY_KEYS]}`) : p))
    .join(' · ');

  const qa: [q: string, a: ReactNode][] = [
    [
      t('whereQ'),
      t('whereA', {
        address: facts.address.full,
        city: facts.address.city,
        region: facts.address.region,
      }),
    ],
    [
      t('hoursQ'),
      rows.length ? (
        <>
          <span className="block">
            {rows.map((r) => {
              const first = r.weekdays[0] ?? 0;
              const last = r.weekdays.at(-1) ?? first;
              return (
                <span key={r.weekdays.join()} className="block">
                  {t('hoursRow', {
                    days:
                      first === last ? day(first) : t('days', { from: day(first), to: day(last) }),
                    opens: time(r.opens),
                    closes: time(r.closes),
                  })}
                  {r.overnight && <span className="ms-1">{t('nextDay')}</span>}
                </span>
              );
            })}
          </span>
          {facts.holidays.length > 0 && (
            <span className="mt-1 block">
              {t('holidays', {
                dates: facts.holidays
                  .map((h) =>
                    format.dateTime(new Date(`${h.date}T12:00:00Z`), {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                    }),
                  )
                  .join(', '),
              })}
            </span>
          )}
        </>
      ) : (
        t('hoursSoon')
      ),
    ],
    [t('deliverQ'), t('deliverA', { area: facts.deliveryArea })],
    [t('payQ'), pay],
    [t('knownQ'), t('knownA', { list: facts.knownFor.join(', ') })],
    ...(facts.priceRange
      ? ([
          [
            t('priceQ'),
            <span key="p" dir="ltr">
              {facts.priceRange}
            </span>,
          ],
        ] as [string, ReactNode][])
      : []),
    [t('bookQ'), t('bookA')],
  ];

  return (
    <section
      aria-labelledby={`facts-${variant}`}
      className={clsx(
        footer
          ? 'text-white'
          : 'rounded-card border-3 border-ink bg-white p-5 shadow-hard-md md:p-7',
        className,
      )}
    >
      <h2
        id={`facts-${variant}`}
        className={clsx(
          'font-display',
          footer ? 'mb-3 text-2xl text-yellow' : 'mb-5 text-3xl md:text-4xl',
        )}
      >
        {t('title')}
      </h2>
      <dl
        className={clsx(
          'grid gap-x-8',
          footer ? 'gap-y-3 md:grid-cols-2 lg:grid-cols-3' : 'gap-y-4 md:grid-cols-2',
        )}
      >
        {qa.map(([q, a]) => (
          <div key={q}>
            <dt className={clsx('font-bold', footer ? 'text-white' : 'font-sticker font-black')}>
              {q}
            </dt>
            <dd className={clsx('mt-0.5', footer ? 'text-sm text-white/80' : 'text-muted')}>{a}</dd>
          </div>
        ))}
      </dl>
      {!footer && (
        <p className="mt-6">
          <Link href="/deals" className={buttonClasses({ variant: 'secondary' })}>
            {t('book')}
          </Link>
        </p>
      )}
    </section>
  );
}
