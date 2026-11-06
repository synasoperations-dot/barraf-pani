'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { localDate } from '@/features/admin/board';
import { telLink, waLink } from '@/features/admin/links';
import { useStaff } from '@/features/admin/session';
import { api } from '@/lib/api';
import { BOOKING_TRANSITIONS, type Booking, type BookingAction, type Event } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { localized } from '@/lib/format';
import { formatPkPhone } from '@/lib/phone';
import { Icon } from './icons';
import { AdminPage, ConfirmSheet, Panel, TabPanel, Tabs, usePrint } from './kit';
import { BookingsSheet } from './print';

type Tab = 'requests' | 'upcoming' | 'past' | 'closed';
const KEY = ['admin', 'bookings', 'all'] as const;

/** Confirmed guests per event (capacity bar). Requests don't count until confirmed. */
const confirmedGuests = (bookings: Booking[], eventId: string) =>
  bookings
    .filter((b) => b.eventId === eventId && b.status === 'confirmed')
    .reduce((s, b) => s + b.guests, 0);

function CapacityBar({ event, taken }: { event: Event; taken: number }) {
  const t = useTranslations('admin.bookings');
  const locale = useLocale();
  if (!event.capacity) return null;
  const pct = Math.min(100, Math.round((taken / event.capacity) * 100));
  return (
    <div className="grid gap-1">
      <p className="flex justify-between text-sm font-bold">
        <span>{localized(event.title, locale)}</span>
        <span dir="ltr">
          {taken} / {event.capacity}
        </span>
      </p>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={event.capacity}
        aria-valuenow={taken}
        aria-label={t('capacity', { title: localized(event.title, locale) })}
        className="h-4 overflow-hidden rounded-full border-2 border-ink bg-paper"
      >
        <div
          className={clsx('h-full', pct >= 100 ? 'bg-orange' : 'bg-blue')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BookingCard({ b, events, all }: { b: Booking; events: Event[]; all: Booking[] }) {
  const t = useTranslations('admin.bookings');
  const ts = useTranslations();
  const locale = useLocale();
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [sheet, setSheet] = useState<'decline' | 'confirm' | 'cancel' | null>(null);
  const event = events.find((e) => e.id === b.eventId) ?? null;
  const act = useMutation({
    mutationFn: (a: BookingAction) => api.admin.updateBooking(b.publicToken, a),
    onSuccess: (nb) => {
      setSheet(null);
      qc.setQueryData<Booking[]>(KEY, (list) =>
        list?.map((x) => (x.publicToken === nb.publicToken ? nb : x)),
      );
      void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      toast(t(`done.${nb.status}`));
    },
    onError: (e) => toast(message(e)),
  });
  const moves = BOOKING_TRANSITIONS[b.status];
  const over = event?.capacity ? confirmedGuests(all, event.id) + b.guests > event.capacity : false;

  return (
    <article className="grid gap-3 rounded-card border-3 border-ink bg-white p-4 shadow-hard-md">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Tag
          tone={b.type === 'table' ? 'blue' : b.type === 'event' ? 'yellow' : 'orange'}
          tilt={-3}
        >
          {t(`type.${b.type}`)}
        </Tag>
        <span className="font-price text-2xl" dir="ltr">
          {b.date} · {b.time}
        </span>
      </header>
      <p className="text-lg font-bold">
        {b.name} · {t('guestsCount', { count: b.guests })}
      </p>
      {event && (
        <p className="text-sm">{t('forEvent', { title: localized(event.title, locale) })}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span dir="ltr">{formatPkPhone(b.phone)}</span>
        <a
          href={telLink(b.phone)}
          className="inline-flex min-h-11 press items-center gap-1 rounded-button border-2 border-ink bg-white px-2 font-bold shadow-hard-sm"
        >
          <Icon name="phone" />
          {t('call')}
        </a>
        <a
          href={waLink(b.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 press items-center gap-1 rounded-button border-2 border-ink bg-whatsapp px-2 font-bold shadow-hard-sm"
        >
          <Icon name="chat" />
          {t('whatsapp')}
        </a>
      </div>
      {b.note && (
        <p className="rounded-input border-2 border-dashed border-ink bg-paper p-2 text-sm">
          {b.note}
        </p>
      )}
      {b.declineReason && (
        <p className="text-sm">
          <span className="font-bold">{t('declinedBecause')}: </span>
          {b.declineReason}
        </p>
      )}
      <p className="text-sm font-bold">{ts(`admin.bookings.status.${b.status}`)}</p>
      <div className="flex flex-wrap gap-2">
        {moves.includes('confirmed') && (
          <Button
            size="lg"
            className="flex-1"
            onClick={() => (over ? setSheet('confirm') : act.mutate({ action: 'confirm' }))}
            loading={act.isPending}
          >
            {t('confirm')}
          </Button>
        )}
        {moves.includes('completed') && (
          <Button
            size="lg"
            variant="secondary"
            className="flex-1"
            onClick={() => act.mutate({ action: 'complete' })}
          >
            {t('complete')}
          </Button>
        )}
        {moves.includes('no_show') && (
          <Button
            size="md"
            variant="ghost"
            className="min-h-14"
            onClick={() => act.mutate({ action: 'no_show' })}
          >
            {t('noShow')}
          </Button>
        )}
        {moves.includes('declined') && (
          <Button
            size="md"
            variant="ghost"
            className="min-h-14"
            onClick={() => setSheet('decline')}
          >
            {t('decline')}
          </Button>
        )}
        {moves.includes('cancelled') && (
          <Button size="md" variant="ghost" className="min-h-14" onClick={() => setSheet('cancel')}>
            {t('cancel')}
          </Button>
        )}
      </div>
      <ConfirmSheet
        open={sheet === 'decline'}
        onClose={() => setSheet(null)}
        title={t('declineTitle')}
        body={t('declineBody')}
        reason={{ label: t('declineReason'), required: true }}
        confirmLabel={t('decline')}
        danger
        loading={act.isPending}
        onConfirm={(reason) => act.mutate({ action: 'decline', reason })}
      />
      <ConfirmSheet
        open={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title={t('overTitle')}
        body={t('overBody', {
          guests: b.guests,
          capacity: event?.capacity ?? 0,
          taken: event ? confirmedGuests(all, event.id) : 0,
        })}
        confirmLabel={t('confirmAnyway')}
        loading={act.isPending}
        onConfirm={() => act.mutate({ action: 'confirm' })}
      />
      <ConfirmSheet
        open={sheet === 'cancel'}
        onClose={() => setSheet(null)}
        title={t('cancelTitle')}
        confirmLabel={t('cancel')}
        danger
        loading={act.isPending}
        onConfirm={() => act.mutate({ action: 'cancel' })}
      />
    </article>
  );
}

/** Bookings queue (ADDITION §A2): requests, upcoming, past, declined / cancelled; tonight's sheet. */
export function BookingsAdmin() {
  const t = useTranslations('admin.bookings');
  useStaff('bookings');
  const { print, slot } = usePrint();
  const [tab, setTab] = useState<Tab>('requests');
  const bookings = useQuery({
    queryKey: KEY,
    queryFn: () => api.admin.bookings(),
    refetchInterval: 15_000,
  });
  const events = useQuery({ queryKey: ['admin', 'events'], queryFn: () => api.admin.events() });
  const all = bookings.data ?? [];
  const today = localDate();
  const byTab: Record<Tab, Booking[]> = {
    requests: all.filter((b) => b.status === 'requested'),
    upcoming: all
      .filter((b) => b.status === 'confirmed' && b.date >= today)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    past: all.filter(
      (b) =>
        b.status === 'completed' ||
        b.status === 'no_show' ||
        (b.status === 'confirmed' && b.date < today),
    ),
    closed: all.filter((b) => b.status === 'declined' || b.status === 'cancelled'),
  };
  const tonight = byTab.upcoming.filter((b) => b.date === today);
  const capacityEvents = (events.data ?? []).filter((e) => e.capacity && e.isActive);

  return (
    <AdminPage
      title={t('title')}
      actions={
        <Button
          variant="ghost"
          size="lg"
          disabled={!tonight.length}
          onClick={() => print(<BookingsSheet date={today} bookings={tonight} />)}
        >
          <Icon name="print" />
          {t('printTonight', { count: tonight.length })}
        </Button>
      }
    >
      {capacityEvents.length > 0 && (
        <Panel className="mb-4 grid gap-3">
          {capacityEvents.map((e) => (
            <CapacityBar key={e.id} event={e} taken={confirmedGuests(all, e.id)} />
          ))}
        </Panel>
      )}
      <Tabs
        idBase="bk"
        label={t('tabs')}
        value={tab}
        onChange={setTab}
        tabs={(['requests', 'upcoming', 'past', 'closed'] as const).map((v) => ({
          value: v,
          label: t(`tab.${v}`),
          count: byTab[v].length,
        }))}
      />
      <TabPanel idBase="bk" active={tab} className="mt-4">
        {bookings.isError ? (
          <ErrorState onRetry={() => void bookings.refetch()} />
        ) : bookings.isLoading ? (
          <Skeleton className="h-64 rounded-card" />
        ) : byTab[tab].length ? (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {byTab[tab].map((b) => (
              <li key={b.publicToken}>
                <BookingCard b={b} events={events.data ?? []} all={all} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t(`empty.${tab}`)} />
        )}
      </TabPanel>
      {slot}
    </AdminPage>
  );
}
