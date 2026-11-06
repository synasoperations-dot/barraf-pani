'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { SourceTag, StatusTag } from '@/components/ui/StatusTag';
import { toast } from '@/components/ui/Toast';
import { mapsLink, telLink, waLink } from '@/features/admin/links';
import { useLogout, useStaff } from '@/features/admin/session';
import { useOnline } from '@/features/net/useOnline';
import { api, newIdempotencyKey } from '@/lib/api';
import type { RiderAssignment } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatPkPhone } from '@/lib/phone';
import { Icon } from './icons';
import { ConfirmSheet, Money } from './kit';
import { OrderLines } from './OrderCard';

const KEY = ['rider', 'assignments'] as const;

function ActiveCard({ a }: { a: RiderAssignment }) {
  const t = useTranslations('admin.rider');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<'cash' | 'failed' | null>(null);
  // One key per button per assignment, so a retried tap can't double-apply.
  const [keys] = useState(() => ({
    picked: newIdempotencyKey(),
    delivered: newIdempotencyKey(),
    failed: newIdempotencyKey(),
  }));
  const o = a.order;
  const due = o.paymentMethod === 'cod' ? o.total : 0;
  const onDone = () => void qc.invalidateQueries({ queryKey: KEY });
  const onError = (e: unknown) => toast(message(e));

  const pickedUp = useMutation({
    mutationFn: () => api.rider.pickedUp(o.id, keys.picked),
    onSuccess: onDone,
    onError,
  });
  const delivered = useMutation({
    mutationFn: () => api.rider.delivered(o.id, { cashCollected: due }, keys.delivered),
    onSuccess: () => {
      setConfirm(null);
      toast(t('deliveredToast', { number: o.number }));
      onDone();
    },
    onError,
  });
  // Failed delivery = out_for_delivery → cancelled through the same transition endpoint (§4.2).
  const failed = useMutation({
    mutationFn: (note: string) =>
      api.admin.transition(o.id, { to: 'cancelled', version: o.version, note }, keys.failed),
    onSuccess: () => {
      setConfirm(null);
      onDone();
    },
    onError,
  });

  const phoneFull = o.customer.phone.startsWith('+92');
  return (
    <article
      aria-labelledby={`ra-${o.id}`}
      className="grid gap-4 rounded-panel border-3 border-ink bg-white p-4 shadow-hard-lg"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`ra-${o.id}`} className="font-price text-5xl leading-none" dir="ltr">
          {o.number}
        </h2>
        <span className="flex gap-2">
          <SourceTag source={o.source} />
          <StatusTag status={o.status} />
        </span>
      </header>

      <div className="rounded-card border-3 border-ink bg-yellow p-4 text-center">
        <p className="font-bold">{due ? t('collect') : t('prepaid')}</p>
        <Money value={due} className="block text-7xl leading-none" />
      </div>

      <div className="grid gap-2">
        <p className="text-xl font-bold">{o.customer.name ?? '—'}</p>
        {/* §7: the full number only shows for the active order. */}
        <p dir="ltr" className="text-lg">
          {phoneFull ? formatPkPhone(o.customer.phone) : o.customer.phone}
        </p>
        {phoneFull && (
          <div className="flex gap-2">
            <a
              href={telLink(o.customer.phone)}
              className={buttonClasses({ variant: 'ghost', size: 'lg', className: 'flex-1' })}
            >
              <Icon name="phone" />
              {t('call')}
            </a>
            <a
              href={waLink(o.customer.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: 'whatsapp', size: 'lg', className: 'flex-1' })}
            >
              <Icon name="chat" />
              {t('whatsapp')}
            </a>
          </div>
        )}
      </div>

      {o.address && (
        <div className="grid gap-2 rounded-input border-2 border-ink bg-paper p-3">
          <p className="text-lg font-bold">
            {o.address.line1}, {o.address.area}
          </p>
          {o.address.landmark && <p>{t('landmark', { landmark: o.address.landmark })}</p>}
          <a
            href={mapsLink(o.address.location)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'secondary', size: 'lg', block: true })}
          >
            <Icon name="map" />
            {t('openMaps')}
          </a>
        </div>
      )}

      <OrderLines order={o} big />
      {o.customerNote && (
        <p className="rounded-input border-2 border-dashed border-ink bg-yellow p-2">
          {o.customerNote}
        </p>
      )}

      {o.status === 'ready' && (
        <Button
          size="lg"
          block
          className="min-h-16"
          loading={pickedUp.isPending}
          onClick={() => pickedUp.mutate()}
        >
          {t('pickedUp')}
        </Button>
      )}
      {o.status === 'out_for_delivery' && (
        <div className="grid gap-3">
          <Button
            size="lg"
            block
            className="min-h-16"
            onClick={() => (due ? setConfirm('cash') : delivered.mutate())}
            loading={delivered.isPending}
          >
            {t('delivered')}
          </Button>
          <Button variant="ghost" size="lg" block onClick={() => setConfirm('failed')}>
            {t('failed')}
          </Button>
        </div>
      )}

      <ConfirmSheet
        open={confirm === 'cash'}
        onClose={() => setConfirm(null)}
        title={t('cashTitle')}
        body={
          <p className="text-center">
            {t('cashBody')}
            <Money value={due} className="mt-2 block text-6xl" />
          </p>
        }
        confirmLabel={t('cashConfirm')}
        loading={delivered.isPending}
        onConfirm={() => delivered.mutate()}
      />
      <ConfirmSheet
        open={confirm === 'failed'}
        onClose={() => setConfirm(null)}
        title={t('failedTitle')}
        body={t('failedBody')}
        reason={{ label: t('failedReason'), required: true }}
        confirmLabel={t('failedConfirm')}
        danger
        loading={failed.isPending}
        onConfirm={(note) => failed.mutate(note)}
      />
    </article>
  );
}

/** Rider PWA (§1, §5.7): my active assignment, cash in hand, today's deliveries. */
export function RiderApp() {
  const t = useTranslations('admin.rider');
  const staff = useStaff('rider');
  const logout = useLogout();
  const online = useOnline();
  const q = useQuery({
    queryKey: KEY,
    queryFn: () => api.rider.assignments(),
    refetchInterval: 12_000,
    enabled: !!staff.data,
  });
  const list = q.data ?? [];
  const active = list.filter(
    (a) => a.order.status === 'ready' || a.order.status === 'out_for_delivery',
  );
  const done = list.filter((a) => a.deliveredAt || a.order.status === 'delivered');
  const cash = list.filter((a) => a.cashInHand > 0).reduce((s, a) => s + a.cashInHand, 0);

  return (
    <div className="mx-auto grid min-h-dvh max-w-xl content-start gap-4 bg-paper p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl">{t('title')}</h1>
        <Button variant="ghost" size="md" onClick={() => logout.mutate()}>
          {t('logout')}
        </Button>
      </header>
      {!online && (
        <p className="rounded-input border-3 border-ink bg-orange p-3 font-bold">{t('offline')}</p>
      )}

      <section
        aria-labelledby="cash-h"
        className="flex items-center justify-between rounded-card border-3 border-ink bg-ink p-4 text-white shadow-hard-orange"
      >
        <h2 id="cash-h" className="font-bold">
          {t('cashInHand')}
        </h2>
        <Money value={cash} className="text-5xl text-yellow" />
      </section>

      {q.isError && <ErrorState onRetry={() => void q.refetch()} offline={!online} />}
      {q.isLoading && <Skeleton className="h-96 rounded-panel" />}
      {q.data && !active.length && <EmptyState title={t('noneTitle')} body={t('noneBody')} />}
      {active.map((a) => (
        <ActiveCard key={a.orderId} a={a} />
      ))}

      {done.length > 0 && (
        <section aria-labelledby="done-h" className="rounded-card border-3 border-ink bg-white p-4">
          <h2 id="done-h" className="mb-2 font-sticker text-lg font-black">
            {t('today', { count: done.length })}
          </h2>
          <ul className="grid gap-2">
            {done.map((a) => (
              <li
                key={a.orderId}
                className="flex items-center justify-between border-b border-grid-line pb-2"
              >
                <span className="font-price text-2xl" dir="ltr">
                  {a.order.number}
                </span>
                <span className="text-sm">
                  {a.cashInHand > 0 ? (
                    <Money value={a.cashInHand} className="text-xl" />
                  ) : (
                    t('settledOrPrepaid')
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
