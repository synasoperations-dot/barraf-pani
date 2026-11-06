'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { Button, buttonClasses } from '@/components/ui/Button';
import { BoltPair } from '@/components/ui/motifs';
import { Stamp } from '@/components/ui/Stamp';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import { useBooking } from '@/features/deals/hooks';
import { isApiError } from '@/lib/api';
import type { Booking, BookingStatus as Status } from '@/lib/contracts';
import { buildIcs } from '@/lib/ics';
import { SITE, waHref } from '@/lib/site';
import { useLocalTime } from './BookingSheet';

const TONE: Record<Status, 'yellow' | 'ink' | 'orange' | 'white'> = {
  requested: 'yellow',
  confirmed: 'ink',
  declined: 'orange',
  cancelled: 'white',
  completed: 'ink',
  no_show: 'white',
};

/** One booking's status sticker + details (prop-driven; /dev/ui renders every status). */
export function BookingStatusView({ booking }: { booking: Booking }) {
  const t = useTranslations('deals');
  const format = useFormatter();
  const timeText = useLocalTime();
  const s = booking.status;
  const when = `${format.dateTime(new Date(`${booking.date}T12:00:00+05:00`), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })} · ${timeText(booking.time)}`;

  function download() {
    const ics = buildIcs({
      uid: booking.publicToken,
      title: t('status.calendarTitle', { guests: booking.guests }),
      date: booking.date,
      time: booking.time,
      location: SITE.address,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'barraf-paani-booking.ics',
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Card className="flex flex-col items-center gap-5 p-6 text-center md:p-8">
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
        <Stamp tone={TONE[s]} size="lg" animate={s === 'confirmed'}>
          {t(`status.${s}`)}
        </Stamp>
        <p className="max-w-sm text-lg">{t(`status.${s}Body`)}</p>
        {s === 'declined' && booking.declineReason && (
          <p className="font-bold">{t('status.reason', { reason: booking.declineReason })}</p>
        )}
      </div>
      <dl className="grid w-full max-w-md gap-x-4 gap-y-2 border-t-2 border-dashed border-ink pt-4 text-start sm:grid-cols-[auto_1fr]">
        <dt className="font-bold">{t('status.type')}</dt>
        <dd>{t(`sheet.types.${booking.type}`)}</dd>
        <dt className="font-bold">{t('status.when')}</dt>
        <dd>{when}</dd>
        <dt className="font-bold">{t('status.guests')}</dt>
        <dd dir="ltr" className="text-start">
          {booking.guests}
        </dd>
        <dt className="font-bold">{t('status.name')}</dt>
        <dd>{booking.name}</dd>
      </dl>
      <div className="flex flex-wrap justify-center gap-3">
        {s === 'confirmed' && (
          <Button variant="secondary" onClick={download}>
            {t('status.addToCalendar')}
          </Button>
        )}
        <a
          href={waHref(
            SITE.whatsapp,
            t('status.whatsappText', { token: booking.publicToken.slice(0, 8) }),
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: 'whatsapp' })}
        >
          {t('status.whatsapp')}
        </a>
      </div>
    </Card>
  );
}

export function BookingNotFound() {
  const t = useTranslations('deals');
  return (
    <Card className="p-2">
      <EmptyState
        title={t('status.notFoundTitle')}
        body={t('status.notFoundBody')}
        action={
          <Link href="/deals" className={buttonClasses({ variant: 'secondary' })}>
            {t('status.bookAgain')}
          </Link>
        }
      />
    </Card>
  );
}

export function BookingStatusFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations('deals.status');
  return (
    <div className="grid-paper">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 md:py-14">
        <div className="flex items-center justify-center gap-3">
          <BoltPair side="start" />
          <h1 className="font-display text-4xl leading-none md:text-5xl">{t('title')}</h1>
          <BoltPair side="end" />
        </div>
        {children}
      </div>
    </div>
  );
}

/** /booking/[token]: live status (realtime + polling). */
export function BookingStatusPage({ token }: { token: string }) {
  const q = useBooking(token);
  let body;
  if (q.data) body = <BookingStatusView booking={q.data} />;
  else if (q.error && isApiError(q.error) && q.error.code === 'NOT_FOUND')
    body = <BookingNotFound />;
  else if (q.error)
    body = (
      <ErrorState
        offline={isApiError(q.error) && q.error.code === 'NETWORK_ERROR'}
        onRetry={() => void q.refetch()}
      />
    );
  else body = <Skeleton className="h-96 rounded-card" />;
  return <BookingStatusFrame>{body}</BookingStatusFrame>;
}
