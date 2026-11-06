'use client';

import clsx from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { BookingSheet } from '@/components/deals/BookingSheet';
import { MapBoard } from '@/components/home/FindUs';
import { PageHeader } from '@/components/site/PageHeader';
import { Button, buttonClasses } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import { localDate } from '@/features/store/hours';
import { useStoreStatus } from '@/features/store/useStore';
import type { BusinessFacts } from '@/lib/business-facts';
import type { ContactTopic, StoreStatus } from '@/lib/contracts';
import { formatPkPhone } from '@/lib/phone';
import { telHref, waHref } from '@/lib/site';
import { tilt } from '@/lib/tilt';
import { ContactForm } from './ContactForm';

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

/** Weekly hours table: today highlighted, past-midnight windows marked "(next day)", holidays listed. */
export function HoursTable({ status, now }: { status: StoreStatus; now: number }) {
  const t = useTranslations('contact');
  const format = useFormatter();
  const todayWeekday = new Date(`${localDate(now)}T00:00:00Z`).getUTCDay();
  // 2024-01-07 is a Sunday, so weekday n is Jan 7 + n. Names come from Intl.
  const day = (n: number) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 7 + n)), { weekday: 'long', timeZone: 'UTC' });
  const time = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return format.dateTime(new Date(Date.UTC(2024, 0, 1, h, m)), {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  return (
    <>
      <table className="w-full border-collapse text-start">
        <tbody>
          {MONDAY_FIRST.map((d) => {
            const rows = status.openingHours.filter((h) => h.weekday === d);
            const today = d === todayWeekday;
            return (
              <tr
                key={d}
                aria-current={today ? 'date' : undefined}
                className={clsx('border-b-2 border-grid-line', today && 'bg-yellow font-bold')}
              >
                <th scope="row" className="px-2 py-2.5 text-start font-bold">
                  {day(d)}
                  {today && (
                    <span className="ms-2 rounded-chip border-2 border-ink bg-white px-1.5 text-xs">
                      {t('today')}
                    </span>
                  )}
                </th>
                <td className="px-2 py-2.5 text-end">
                  {rows.length
                    ? rows.map((h) => (
                        <span key={h.opens} className="block">
                          <span dir="ltr">
                            {t('range', { opens: time(h.opens), closes: time(h.closes) })}
                          </span>
                          {h.closes <= h.opens && (
                            <span className="ms-1 text-muted">{t('nextDay')}</span>
                          )}
                        </span>
                      ))
                    : t('closedDay')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3 className="mt-6 font-sticker text-lg font-black">{t('holidays')}</h3>
      {status.holidays.length ? (
        <ul className="mt-2 flex flex-col gap-1">
          {status.holidays.map((h) => (
            <li key={h.date} className="flex items-center gap-2">
              <span aria-hidden="true" className="text-orange-deep">
                ●
              </span>
              {t('holidayLine', {
                date: format.dateTime(new Date(`${h.date}T12:00:00+05:00`), {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
                note: h.note ?? 'none',
              })}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted">{t('noHolidays')}</p>
      )}
    </>
  );
}

export function ContactPage({
  facts,
  initialStatus,
  initialTopic,
}: {
  facts: BusinessFacts;
  initialStatus?: StoreStatus;
  initialTopic?: ContactTopic;
}) {
  const t = useTranslations('contact');
  const q = useStoreStatus(initialStatus);
  const [now] = useState(() => Date.now());
  const [booking, setBooking] = useState(false);
  const phone = q.data?.shopPhone ?? facts.phone;

  return (
    <>
      <PageHeader title={t('title')} sub={t('sub')} />
      <div className="grid-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:py-16">
          <Card className="flex flex-col gap-6 p-5 md:p-7">
            <section>
              <h2 className="font-sticker text-lg font-black">{t('address')}</h2>
              <address className="mt-1 text-lg not-italic">{facts.address.full}</address>
            </section>
            <section>
              <h2 className="font-sticker text-lg font-black">{t('phone')}</h2>
              <p className="mt-1 font-price text-3xl tracking-[0.02em]" dir="ltr">
                <a href={telHref(phone)} className="underline-offset-4 hover:underline">
                  {formatPkPhone(phone)}
                </a>
              </p>
            </section>
            <div className="flex flex-wrap gap-3">
              <a href={telHref(phone)} className={buttonClasses({ variant: 'ghost' })}>
                {t('call')}
              </a>
              <a
                href={waHref(facts.whatsapp, t('whatsappText'))}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'whatsapp' })}
              >
                {t('whatsapp')}
              </a>
              <a
                href={facts.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'secondary' })}
              >
                {t('directions')}
              </a>
            </div>
            <section>
              <h2 className="mb-2 font-sticker text-lg font-black">{t('hours')}</h2>
              {q.data ? (
                <HoursTable status={q.data} now={now} />
              ) : q.error ? (
                <ErrorState
                  className="py-4"
                  title={t('hoursError')}
                  onRetry={() => void q.refetch()}
                />
              ) : (
                <div aria-busy="true" className="flex flex-col gap-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              )}
            </section>
          </Card>

          <div className="flex flex-col gap-8">
            <MapBoard />
            <div
              style={{ rotate: tilt(-1.5) }}
              className="flex flex-wrap items-center gap-4 rounded-card border-3 border-ink bg-yellow p-5 shadow-hard-md"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-3xl leading-tight">{t('eventTitle')}</h2>
                <p>{t('eventBody')}</p>
              </div>
              <Button onClick={() => setBooking(true)}>{t('eventCta')}</Button>
            </div>
          </div>

          <div className="md:col-span-2">
            <ContactForm initialTopic={initialTopic} />
          </div>
        </div>
      </div>
      <BookingSheet open={booking} onClose={() => setBooking(false)} type="private_event" />
    </>
  );
}
