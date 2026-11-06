'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { StatusTag } from '@/components/ui/StatusTag';
import { toast } from '@/components/ui/Toast';
import { startOfLocalDay } from '@/features/admin/board';
import { useStaff } from '@/features/admin/session';
import { api } from '@/lib/api';
import type { RiderSettlement } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { AdminPage, ConfirmSheet, Money, Panel, Switch } from './kit';

function Settlement({ s }: { s: RiderSettlement }) {
  const t = useTranslations('admin.riders');
  const format = useFormatter();
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const settle = useMutation({
    mutationFn: () => api.admin.settleRider(s.rider.id),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['admin', 'settlement'] });
      toast(t('settled', { name: s.rider.name }));
    },
    onError: (e) => toast(message(e)),
  });
  return (
    <Panel className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{s.rider.name}</h3>
        <Money value={s.openCash} className="text-4xl" />
      </div>
      {s.orders.length ? (
        <ul className="grid gap-1 text-sm">
          {s.orders.map((o) => (
            <li key={o.publicToken} className="flex justify-between border-b border-grid-line py-1">
              <span className="font-price text-xl" dir="ltr">
                {o.number}
              </span>
              <span>
                {o.deliveredAt
                  ? format.dateTime(new Date(o.deliveredAt), { hour: 'numeric', minute: '2-digit' })
                  : '—'}
              </span>
              <Money value={o.cashInHand} className="text-lg" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t('nothingOpen')}</p>
      )}
      <Button size="lg" disabled={!s.openCash} onClick={() => setOpen(true)}>
        {t('markSettled')}
      </Button>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('settleTitle', { name: s.rider.name })}
        body={t('settleBody')}
        typed={String(s.openCash)}
        confirmLabel={t('markSettled')}
        loading={settle.isPending}
        onConfirm={() => settle.mutate()}
      />
    </Panel>
  );
}

/** Riders + cash settlement (§5.7): open cash per rider, broken down by order. */
export function RidersAdmin() {
  const t = useTranslations('admin.riders');
  const message = useErrorMessage();
  useStaff('riders');
  const qc = useQueryClient();
  const riders = useQuery({ queryKey: ['admin', 'riders'], queryFn: () => api.admin.riders() });
  const settlement = useQuery({
    queryKey: ['admin', 'settlement'],
    queryFn: () => api.admin.settlement(),
    refetchInterval: 30_000,
  });
  const today = useMemo(() => ({ from: startOfLocalDay() }), []);
  const orders = useQuery({
    queryKey: ['admin', 'orders', today],
    queryFn: () => api.admin.orders(today),
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.admin.updateRider(id, { isActive }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'riders'] }),
    onError: (e) => toast(message(e)),
  });

  return (
    <AdminPage title={t('title')}>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="riders-h" className="grid content-start gap-3">
          <h2 id="riders-h" className="font-sticker text-xl font-black">
            {t('riders')}
          </h2>
          {riders.isError ? (
            <ErrorState onRetry={() => void riders.refetch()} />
          ) : !riders.data ? (
            <Skeleton className="h-32" />
          ) : riders.data.length ? (
            riders.data.map((r) => {
              const mine = (orders.data ?? []).filter((o) => o.rider?.id === r.id);
              return (
                <Panel key={r.id} className="grid gap-2">
                  <Switch
                    label={r.name}
                    description={r.phone ?? undefined}
                    checked={r.isActive}
                    onChange={(isActive) => toggle.mutate({ id: r.id, isActive })}
                  />
                  <p className="text-sm font-bold">{t('todayCount', { count: mine.length })}</p>
                  <ul className="grid gap-1">
                    {mine.map((o) => (
                      <li key={o.id} className="flex items-center justify-between text-sm">
                        <span className="font-price text-xl" dir="ltr">
                          {o.number}
                        </span>
                        <StatusTag status={o.status} />
                      </li>
                    ))}
                  </ul>
                </Panel>
              );
            })
          ) : (
            <EmptyState title={t('noRiders')} />
          )}
        </section>
        <section aria-labelledby="cash-h" className="grid content-start gap-3">
          <h2 id="cash-h" className="font-sticker text-xl font-black">
            {t('cash')}
          </h2>
          {settlement.isError ? (
            <ErrorState onRetry={() => void settlement.refetch()} />
          ) : !settlement.data ? (
            <Skeleton className="h-32" />
          ) : (
            settlement.data.map((s) => <Settlement key={s.rider.id} s={s} />)
          )}
        </section>
      </div>
    </AdminPage>
  );
}
