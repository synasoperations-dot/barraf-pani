'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { SourceTag } from '@/components/ui/StatusTag';
import {
  BOARD_COLUMNS,
  groupBoard,
  localDate,
  releaseAt,
  ringing,
  type BoardColumn,
} from '@/features/admin/board';
import { useRepeatingChime, useTitleBadge } from '@/features/admin/chime';
import { readMine, useLiveOrders } from '@/features/admin/orders';
import { useStaff, useStaffSettings } from '@/features/admin/session';
import { SHORT_TIME, useNow } from '@/features/admin/useNow';
import { useOnline } from '@/features/net/useOnline';
import { OrderSource, type AdminOrder, type Fulfilment, type OrderStatus } from '@/lib/contracts';
import { AdminPage, ConnectionDot, TabPanel, Tabs, usePrint } from './kit';
import { Icon } from './icons';
import { OrderCard } from './OrderCard';

type Tab = 'board' | 'awaiting_payment' | 'scheduled' | 'closed';

const DEFAULT_TIMINGS = {
  autoRejectMinutes: 8,
  managerAlertMinutes: 6,
  preorderReleaseMinutes: 60,
};

/** "1042", "bp-1042" or phone digits ("0300…", "+92300…", last 4). */
function matches(o: AdminOrder, q: string) {
  const digits = q.replace(/\D/g, '');
  if (!digits) return true;
  if (o.number.slice(3).startsWith(digits)) return true;
  const phone = o.customer.phone.replace(/\D/g, '');
  const local = digits.startsWith('0') ? `92${digits.slice(1)}` : digits;
  return digits.length >= 3 && (phone.includes(digits) || phone.includes(local));
}

export function OrdersBoard() {
  const t = useTranslations('admin.board');
  const ts = useTranslations();
  const format = useFormatter();
  const staff = useStaff('orders');
  const settings = useStaffSettings();
  const timings = settings.data ?? DEFAULT_TIMINGS;
  const online = useOnline();
  const now = useNow(1000);
  const { print, slot } = usePrint();

  const [day, setDay] = useState(() => localDate());
  const query = useMemo(() => {
    const from = new Date(`${day}T00:00:00+05:00`);
    return {
      from: from.toISOString(),
      to: new Date(from.getTime() + 86_400_000).toISOString(),
    };
  }, [day]);
  // Scheduled pre-orders can be days ahead; they're fetched separately so the date filter never hides them.
  const live = useLiveOrders(query);
  const [scheduledQuery] = useState(() => ({
    status: ['placed' as const],
    from: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  }));
  const scheduled = useLiveOrders(scheduledQuery);

  const [tab, setTab] = useState<Tab>('board');
  const [q, setQ] = useState('');
  const [type, setType] = useState<Fulfilment | 'all'>('all');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [sources, setSources] = useState<OrderSource[]>([]);
  // Re-read when orders change (a manual order from this tab just landed).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mine = useMemo(() => readMine(), [live.data]);

  const all = useMemo(() => {
    const byId = new Map<string, AdminOrder>();
    for (const o of [...(scheduled.data ?? []), ...(live.data ?? [])]) byId.set(o.id, o);
    return [...byId.values()];
  }, [live.data, scheduled.data]);

  const filtered = all.filter(
    (o) =>
      matches(o, q) &&
      (type === 'all' || o.fulfilment === type) &&
      (status === 'all' || o.status === status) &&
      (!sources.length || sources.includes(o.source)),
  );
  const { columns, tabs } = groupBoard(filtered, timings, now);

  // §4.6 alert: repeating chime + tab title until someone accepts.
  const waiting = ringing(all, timings, now, mine);
  useRepeatingChime(waiting.length > 0);
  const titleLabel = useCallback((n: number) => t('titleBadge', { count: n }), [t]);
  useTitleBadge(waiting.length, titleLabel);

  // Screen readers hear each new order once.
  const [announce, setAnnounce] = useState('');
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(waiting.map((o) => o.id));
    if (seen.current) {
      const fresh = waiting.filter((o) => !seen.current!.has(o.id));
      if (fresh.length)
        setAnnounce(
          fresh
            .map((o) => t('announce', { number: o.number, source: ts(`source.${o.source}`) }))
            .join('. '),
        );
    }
    seen.current = ids;
  }, [waiting, t, ts]);

  const role = staff.data?.role;
  const loading = live.isLoading || !role;

  const card = (o: AdminOrder) => (
    <li key={o.id}>
      <OrderCard
        order={o}
        role={role!}
        timings={timings}
        now={now}
        mine={mine.has(o.id)}
        onPrint={print}
      />
    </li>
  );

  const listOf = (
    orders: AdminOrder[],
    empty: string,
    extra?: (o: AdminOrder) => ReactNode,
    readOnly = false,
  ) =>
    orders.length ? (
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => (
          <li key={o.id} className="grid gap-2">
            {extra?.(o)}
            <OrderCard
              order={o}
              role={role!}
              timings={timings}
              now={now}
              readOnly={readOnly}
              onPrint={print}
            />
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState title={empty} />
    );

  return (
    <AdminPage
      title={t('title')}
      actions={
        <>
          <ConnectionDot status={live.connection} online={online} />
          <Link href="/admin/orders/new" className={buttonClasses({ size: 'lg' })}>
            <Icon name="plus" />
            {t('newOrder')}
          </Link>
        </>
      }
    >
      <p aria-live="assertive" className="sr-only">
        {announce}
      </p>

      <div className="mb-4 grid gap-3 rounded-card border-3 border-ink bg-white p-3 shadow-hard-sm lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="grid gap-1 text-sm font-bold">
          {t('search')}
          <input
            type="search"
            inputMode="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchHint')}
            className="min-h-14 rounded-input border-3 border-ink px-3 text-base font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          {t('status')}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')}
            className="min-h-14 rounded-input border-3 border-ink bg-white px-3 text-base font-normal"
          >
            <option value="all">{t('all')}</option>
            {(
              [
                'placed',
                'accepted',
                'preparing',
                'ready',
                'out_for_delivery',
                'delivered',
                'picked_up',
                'cancelled',
                'rejected',
              ] as const
            ).map((s) => (
              <option key={s} value={s}>
                {ts(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          {t('type')}
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Fulfilment | 'all')}
            className="min-h-14 rounded-input border-3 border-ink bg-white px-3 text-base font-normal"
          >
            <option value="all">{t('all')}</option>
            <option value="delivery">{ts('fulfilment.delivery')}</option>
            <option value="pickup">{ts('fulfilment.pickup')}</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          {t('date')}
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="min-h-14 rounded-input border-3 border-ink px-3 text-base font-normal"
          />
        </label>
        <fieldset className="flex flex-wrap items-center gap-2 lg:col-span-4">
          <legend className="sr-only">{t('source')}</legend>
          <span aria-hidden="true" className="text-sm font-bold">
            {t('source')}
          </span>
          {OrderSource.options.map((s) => {
            const on = sources.includes(s);
            return (
              <label
                key={s}
                className={clsx(
                  'cursor-pointer rounded-full',
                  on && 'outline-3 outline-offset-2 outline-ink',
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() =>
                    setSources((cur) => (on ? cur.filter((x) => x !== s) : [...cur, s]))
                  }
                />
                <SourceTag
                  source={s}
                  className={clsx('min-h-11', !on && sources.length > 0 && 'opacity-60')}
                />
              </label>
            );
          })}
        </fieldset>
      </div>

      <Tabs
        idBase="board"
        label={t('tabs')}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'board', label: t('tab.board'), count: columns.new.length },
          {
            value: 'awaiting_payment',
            label: t('tab.awaiting_payment'),
            count: tabs.awaiting_payment.length,
          },
          { value: 'scheduled', label: t('tab.scheduled'), count: tabs.scheduled.length },
          { value: 'closed', label: t('tab.closed'), count: tabs.closed.length },
        ]}
      />

      <TabPanel idBase="board" active={tab} className="mt-4">
        {live.isError ? (
          <ErrorState onRetry={() => void live.refetch()} offline={!online} />
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-card" />
            ))}
          </div>
        ) : tab === 'board' ? (
          <div className="relative flex snap-x gap-4 overflow-x-auto pb-4">
            {BOARD_COLUMNS.map((c: BoardColumn) => (
              <section
                key={c}
                aria-labelledby={`col-${c}`}
                className="w-[min(22rem,85vw)] shrink-0 snap-start rounded-panel border-3 border-ink bg-paper p-3"
              >
                <h2
                  id={`col-${c}`}
                  className="mb-3 flex items-center justify-between font-sticker text-lg font-black"
                >
                  {t(`column.${c}`)}
                  <span className="rounded-full border-2 border-ink bg-white px-2 font-price text-xl">
                    {columns[c].length}
                  </span>
                </h2>
                {columns[c].length ? (
                  <ul className="grid gap-4">{columns[c].map(card)}</ul>
                ) : (
                  <p className="py-6 text-center text-sm text-muted">{t('columnEmpty')}</p>
                )}
              </section>
            ))}
          </div>
        ) : tab === 'awaiting_payment' ? (
          <>
            <p className="mb-3 text-sm text-muted">{t('awaitingHint')}</p>
            {listOf(tabs.awaiting_payment, t('emptyAwaiting'), undefined, true)}
          </>
        ) : tab === 'scheduled' ? (
          listOf(tabs.scheduled, t('emptyScheduled'), (o) => (
            <p className="rounded-chip border-2 border-ink bg-blue-light px-2 py-1 text-sm font-bold">
              {t('releasesAt', {
                time: format.dateTime(new Date(releaseAt(o, timings)!), SHORT_TIME),
              })}
            </p>
          ))
        ) : (
          listOf(tabs.closed, t('emptyClosed'))
        )}
      </TabPanel>
      {slot}
    </AdminPage>
  );
}
