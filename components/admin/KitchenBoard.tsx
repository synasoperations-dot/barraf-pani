'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Sheet } from '@/components/ui/Dialog';
import { SourceTag } from '@/components/ui/StatusTag';
import { toast } from '@/components/ui/Toast';
import {
  acceptWindow,
  allDay,
  isAlerting,
  isUnreleased,
  ringing,
  startOfLocalDay,
} from '@/features/admin/board';
import { unlockSound, useRepeatingChime, useTitleBadge } from '@/features/admin/chime';
import { flushQueue, moveQueue, type QueuedMove } from '@/features/admin/offlineQueue';
import { boardKey, useLiveOrders } from '@/features/admin/orders';
import { useStaff, useStaffSettings } from '@/features/admin/session';
import { clock, useNow } from '@/features/admin/useNow';
import { useWakeLock } from '@/features/admin/wakeLock';
import { useOnline } from '@/features/net/useOnline';
import { api, isApiError, newIdempotencyKey } from '@/lib/api';
import { canRoleMove, type AdminOrder, type OrderStatus, type StaffRole } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { localized } from '@/lib/format';
import { maskPkPhone } from '@/lib/phone';
import { useQueryClient } from '@tanstack/react-query';
import { ConnectionDot } from './kit';
import { PrepSheet } from './OrderActions';

const COLUMNS: { status: OrderStatus; next: OrderStatus | null }[] = [
  { status: 'placed', next: 'accepted' },
  { status: 'accepted', next: 'preparing' },
  { status: 'preparing', next: 'ready' },
  { status: 'ready', next: null }, // front of house / rider hands it over
];
const UNDO_MS = 5000;
const undoDeadline = () => Date.now() + UNDO_MS;
const DEFAULT_TIMINGS = {
  autoRejectMinutes: 8,
  managerAlertMinutes: 6,
  preorderReleaseMinutes: 60,
};

interface Staged extends QueuedMove {
  sendAt: number;
}

/* The offline queue lives in localStorage; this tiny store lets React re-render on change. */
const queueListeners = new Set<() => void>();
const kitchenQueue = () => (typeof window === 'undefined' ? null : moveQueue(localStorage));
const notifyQueue = () => queueListeners.forEach((l) => l());
const queuedCount = () => kitchenQueue()?.list().length ?? 0;
const subscribeQueue = (cb: () => void) => {
  queueListeners.add(cb);
  return () => void queueListeners.delete(cb);
};

function Ticket({
  order,
  role,
  now,
  staged,
  alerting,
  rejectAt,
  onTap,
  onLongPress,
}: {
  order: AdminOrder;
  role: StaffRole;
  now: number;
  staged: Staged | undefined;
  alerting: boolean;
  rejectAt: number | null;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const t = useTranslations('admin.kitchen');
  const ts = useTranslations();
  const locale = useLocale();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const next = COLUMNS.find((c) => c.status === order.status)?.next;
  const canTap = !!next && canRoleMove(role, order, next);
  const age = now - new Date(order.acceptedAt ?? order.createdAt).getTime();

  return (
    <button
      type="button"
      onPointerDown={() => {
        long.current = false;
        timer.current = setTimeout(() => {
          long.current = true;
          onLongPress();
        }, 600);
      }}
      onPointerUp={() => timer.current && clearTimeout(timer.current)}
      onPointerLeave={() => timer.current && clearTimeout(timer.current)}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      onClick={() => !long.current && canTap && !staged && onTap()}
      aria-describedby={`kt-${order.id}-hint`}
      className={clsx(
        'relative grid w-full gap-2 rounded-card border-3 border-ink p-3 text-start text-ink shadow-hard-orange',
        alerting
          ? 'bg-orange'
          : order.status === 'placed'
            ? 'bg-yellow motion-safe:animate-flash'
            : 'bg-white',
        staged && 'opacity-70',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-price text-5xl leading-none tracking-[0.02em]" dir="ltr">
          {order.number}
        </span>
        <span className="text-end">
          <span className="block font-price text-3xl leading-none tabular-nums" dir="ltr">
            {clock(age)}
          </span>
          <span className="text-sm font-bold">{ts(`fulfilment.${order.fulfilment}`)}</span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <SourceTag source={order.source} />
        {/* §7: phone numbers stay masked in kitchen views. */}
        <span dir="ltr" className="text-sm">
          {order.customer.name ?? '—'} · {maskPkPhone(order.customer.phone)}
        </span>
      </span>
      {rejectAt !== null && (
        <span className="text-sm font-bold">
          {t('autoRejectIn')}{' '}
          <span className="font-price text-2xl tabular-nums" dir="ltr">
            {clock(rejectAt - now)}
          </span>
          {alerting && (
            <span className="ms-2 rounded-chip bg-ink px-2 text-white">{t('managerAlerted')}</span>
          )}
        </span>
      )}
      <span className="grid gap-1.5">
        {order.lines.map((l, i) => (
          <span key={i} className="block">
            <span className="block font-price text-3xl leading-tight tracking-[0.02em]">
              <span dir="ltr">{l.qty} ×</span> {localized(l.name, locale)}
              {l.variantName !== 'Standard' && ` · ${l.variantName}`}
            </span>
            {l.modifiers.length > 0 && (
              <span className="mt-0.5 flex flex-wrap gap-1">
                {l.modifiers.map((m) => (
                  <span
                    key={m.id}
                    className="rounded-chip border-2 border-ink bg-yellow px-1.5 text-base font-bold"
                  >
                    + {localized(m.name, locale)}
                  </span>
                ))}
              </span>
            )}
            {l.note && <span className="block text-base font-bold">» {l.note}</span>}
          </span>
        ))}
      </span>
      {order.customerNote && (
        <span className="rounded-input border-2 border-dashed border-ink bg-yellow p-2 text-base font-bold">
          {order.customerNote}
        </span>
      )}
      <span id={`kt-${order.id}-hint`} className="text-sm font-bold">
        {staged
          ? t('moving', {
              to: ts(`status.${staged.to}`),
              seconds: Math.max(0, Math.ceil((staged.sendAt - now) / 1000)),
            })
          : canTap
            ? t('tapTo', { to: ts(`status.${next!}`) })
            : order.status === 'ready'
              ? t('readyHint')
              : null}
      </span>
    </button>
  );
}

/**
 * Kitchen PWA: ink background, giant tickets per status, tap to move forward with a 5 s undo
 * window (long-press to undo). Phones masked (§7). Wake Lock; moves made offline are queued with
 * their idempotency keys and replayed when the connection returns.
 */
export function KitchenBoard() {
  const t = useTranslations('admin.kitchen');
  const ts = useTranslations();
  const locale = useLocale();
  const message = useErrorMessage();
  const qc = useQueryClient();
  const staff = useStaff('kitchen');
  const settings = useStaffSettings();
  const timings = settings.data ?? DEFAULT_TIMINGS;
  const online = useOnline();
  const now = useNow(1000);
  const wake = useWakeLock();
  const [query] = useState(() => ({
    status: ['placed', 'accepted', 'preparing', 'ready'] as OrderStatus[],
    from: startOfLocalDay(Date.now(), 1),
  }));
  const live = useLiveOrders(query);
  const role = staff.data?.role ?? 'kitchen';

  const [staged, setStaged] = useState<Staged[]>([]);
  const [accepting, setAccepting] = useState<AdminOrder | null>(null);
  const [undoInfo, setUndoInfo] = useState<AdminOrder | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queued = useSyncExternalStore(subscribeQueue, queuedCount, () => 0);

  const orders = (live.data ?? []).filter((o) => !isUnreleased(o, timings, now));
  const latest = useRef(orders);
  useEffect(() => {
    latest.current = orders;
  });
  const waiting = ringing(orders, timings, now, new Set());
  useRepeatingChime(waiting.length > 0);
  const titleLabel = useCallback((n: number) => t('titleBadge', { count: n }), [t]);
  useTitleBadge(waiting.length, titleLabel);

  const patch = (o: AdminOrder) =>
    qc.setQueriesData<AdminOrder[]>({ queryKey: ['admin', 'orders'] }, (list) =>
      Array.isArray(list) ? list.map((x) => (x.id === o.id ? o : x)) : list,
    );

  const send = useCallback(
    (m: QueuedMove) =>
      api.admin.transition(
        m.orderId,
        {
          to: m.to,
          version: m.version,
          note: m.note,
          ...(m.prepMinutes ? { prepMinutes: m.prepMinutes } : {}),
        },
        m.key,
      ),
    [],
  );

  const flush = useCallback(async () => {
    const queue = kitchenQueue();
    if (!queue) return;
    const out = await flushQueue(
      queue,
      async (m) => patch(await send(m)),
      (e) => isApiError(e) && e.code === 'NETWORK_ERROR',
    );
    for (const o of out)
      if (o.result === 'dropped')
        toast(t('dropped', { number: o.move.orderNumber, reason: message(o.error) }));
    notifyQueue();
    if (out.length) void qc.invalidateQueries({ queryKey: boardKey(query) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send, t, message, qc, query]);

  // Replay offline moves when the connection returns (and once on load).
  useEffect(() => {
    void flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [flush]);

  /** The undo window ended: send it (or queue it when offline). */
  const commit = (m: QueuedMove) => {
    timers.current.delete(m.orderId);
    setStaged((cur) => cur.filter((s) => s.key !== m.key));
    const order = latest.current.find((o) => o.id === m.orderId);
    if (order) patch({ ...order, status: m.to }); // optimistic
    const park = () => {
      kitchenQueue()?.push(m);
      notifyQueue();
    };
    if (!navigator.onLine) return park();
    send(m)
      .then(patch)
      .catch((e: unknown) => {
        if (isApiError(e) && e.code === 'NETWORK_ERROR') return park();
        if (order) patch(order); // rollback
        toast(isApiError(e) && e.code === 'VERSION_CONFLICT' ? t('conflict') : message(e));
        void qc.invalidateQueries({ queryKey: boardKey(query) });
      });
  };

  const stage = (order: AdminOrder, to: OrderStatus, prepMinutes?: QueuedMove['prepMinutes']) => {
    const move: Staged = {
      key: newIdempotencyKey(),
      orderId: order.id,
      orderNumber: order.number,
      to,
      version: order.version,
      note: null,
      prepMinutes,
      queuedAt: new Date().toISOString(),
      sendAt: undoDeadline(),
    };
    clearTimeout(timers.current.get(order.id));
    timers.current.set(
      order.id,
      setTimeout(() => commit(move), UNDO_MS),
    );
    setStaged((cur) => [...cur.filter((s) => s.orderId !== order.id), move]);
  };

  const longPress = (order: AdminOrder) => {
    if (staged.some((s) => s.orderId === order.id)) {
      clearTimeout(timers.current.get(order.id));
      timers.current.delete(order.id);
      setStaged((cur) => cur.filter((s) => s.orderId !== order.id));
      toast(t('undone', { number: order.number }));
    } else setUndoInfo(order);
  };

  const summary = allDay(orders);
  const goFullscreen = () => void document.documentElement.requestFullscreen?.().catch(() => {});

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-white">
      <header className="flex flex-wrap items-center gap-3 border-b-3 border-white/20 px-4 py-3">
        <h1 className="font-display text-3xl">{t('title')}</h1>
        <ConnectionDot status={live.connection} online={online} />
        {queued > 0 && (
          <span className="rounded-full border-2 border-white bg-orange px-3 py-1 font-bold text-ink">
            {t('queued', { count: queued })}
          </span>
        )}
        {!wake && <span className="text-sm text-white/80">{t('noWakeLock')}</span>}
        <span className="ms-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void unlockSound()}
            className="min-h-14 rounded-button border-3 border-white bg-yellow px-4 font-bold text-ink"
          >
            {t('sound')}
          </button>
          <button
            type="button"
            onClick={goFullscreen}
            className="min-h-14 rounded-button border-3 border-white bg-white px-4 font-bold text-ink"
          >
            {t('fullscreen')}
          </button>
          {role !== 'kitchen' && (
            <Link
              href="/admin/orders"
              className="inline-flex min-h-14 items-center rounded-button border-3 border-white px-4 font-bold"
            >
              {t('back')}
            </Link>
          )}
        </span>
      </header>

      <section
        aria-label={t('allDay')}
        tabIndex={0}
        className="flex gap-2 overflow-x-auto border-b-3 border-white/20 px-4 py-2"
      >
        <span className="shrink-0 font-sticker font-black text-yellow uppercase">
          {t('allDay')}
        </span>
        {summary.length ? (
          summary.map((s) => (
            <span
              key={s.key}
              className="shrink-0 rounded-chip border-2 border-white px-2 font-price text-2xl tracking-[0.02em]"
            >
              {localized(s.name, locale)}
              {s.variantName !== 'Standard' && ` ${s.variantName}`} <span dir="ltr">× {s.qty}</span>
            </span>
          ))
        ) : (
          <span className="text-white/80">{t('nothingCooking')}</span>
        )}
      </section>

      <main className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((c) => {
          const list = orders
            .filter((o) => o.status === c.status)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          return (
            <section
              key={c.status}
              aria-labelledby={`kc-${c.status}`}
              className="flex min-w-0 flex-col gap-3"
            >
              <h2
                id={`kc-${c.status}`}
                className="flex items-center justify-between font-sticker text-xl font-black uppercase"
              >
                {ts(`status.${c.status}`)}
                <span className="rounded-full bg-white px-3 font-price text-2xl text-ink">
                  {list.length}
                </span>
              </h2>
              <ul className="grid gap-3">
                {list.map((o) => (
                  <li key={o.id}>
                    <Ticket
                      order={o}
                      role={role}
                      now={now}
                      staged={staged.find((s) => s.orderId === o.id)}
                      alerting={isAlerting(o, timings, now)}
                      rejectAt={o.status === 'placed' ? acceptWindow(o, timings).rejectAt : null}
                      onTap={() =>
                        c.next === 'accepted' ? setAccepting(o) : c.next && stage(o, c.next)
                      }
                      onLongPress={() => longPress(o)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>

      <PrepSheet
        open={!!accepting}
        number={accepting?.number ?? ''}
        onClose={() => setAccepting(null)}
        onPick={(m) => {
          if (accepting) stage(accepting, 'accepted', m);
          setAccepting(null);
        }}
      />
      <Sheet
        open={!!undoInfo}
        onClose={() => setUndoInfo(null)}
        title={t('undoTitle', { number: undoInfo?.number ?? '' })}
      >
        <p>{t('undoBody')}</p>
      </Sheet>
    </div>
  );
}
