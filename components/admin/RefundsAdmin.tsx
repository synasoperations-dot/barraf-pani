'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { Input, TextArea } from '@/components/ui/form';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { useStaff } from '@/features/admin/session';
import { api, newIdempotencyKey } from '@/lib/api';
import type { AdminOrder, Refund, RefundStatus } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { AdminPage, ConfirmSheet, Money, Panel } from './kit';

const KEY = ['admin', 'refunds'] as const;
const TONE: Record<RefundStatus, 'yellow' | 'blue' | 'ink' | 'white'> = {
  requested: 'yellow',
  approved: 'blue',
  processed: 'ink',
  rejected: 'white',
};

function RequestSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations('admin.refunds');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [key] = useState(() => newIdempotencyKey());
  const [number, setNumber] = useState('');
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const find = useMutation({
    mutationFn: async () =>
      (await api.admin.orders({ q: number })).find(
        (o) => o.number.slice(3) === number.replace(/\D/g, ''),
      ) ?? null,
    onSuccess: (o) => {
      setOrder(o);
      if (o) setAmount(o.total);
      else toast(t('notFound'));
    },
  });
  const paidOnline = order && order.paymentMethod !== 'cod' && order.paymentStatus === 'paid';
  const submit = useMutation({
    mutationFn: () =>
      api.admin.requestRefund(
        { orderToken: order!.publicToken, amount, reason: reason.trim() },
        key,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast(t('requested'));
      onClose();
    },
    onError: (e) => toast(message(e)),
  });
  const ok = paidOnline && amount > 0 && amount <= order!.total && reason.trim().length >= 3;
  return (
    <Sheet
      open
      onClose={onClose}
      title={t('requestTitle')}
      footer={
        <Button
          size="lg"
          block
          disabled={!ok}
          loading={submit.isPending}
          onClick={() => submit.mutate()}
        >
          {t('request')}
        </Button>
      }
    >
      <div className="grid gap-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            find.mutate();
          }}
        >
          <Input
            label={t('orderNumber')}
            dir="ltr"
            placeholder="BP-1042"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={find.isPending}>
            {t('find')}
          </Button>
        </form>
        {order && (
          <p className="text-sm">
            {order.number} · <Money value={order.total} className="text-lg" /> ·{' '}
            {t(`method.${order.paymentMethod}`)}
          </p>
        )}
        {order && !paidOnline && <p className="font-bold">{t('onlyOnline')}</p>}
        {paidOnline && (
          <>
            <Input
              type="number"
              min={1}
              max={order!.total}
              label={t('amount')}
              hint={t('amountHint', { max: order!.total })}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              error={amount > order!.total ? t('tooMuch') : undefined}
            />
            <TextArea
              label={t('reason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              maxLength={300}
            />
          </>
        )}
      </div>
    </Sheet>
  );
}

function RefundRow({ r, isOwner }: { r: Refund; isOwner: boolean }) {
  const t = useTranslations('admin.refunds');
  const format = useFormatter();
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [processed, setProcessed] = useState(false);
  const act = useMutation({
    mutationFn: (a: 'approve' | 'reject' | 'mark-processed') => api.admin.refundAction(r.id, a),
    onSuccess: () => {
      setProcessed(false);
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e) => toast(message(e)),
  });
  return (
    <Panel className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-price text-2xl" dir="ltr">
          {r.orderNumber}
        </span>
        <Tag tone={TONE[r.status]}>{t(`status.${r.status}`)}</Tag>
      </div>
      <p className="flex flex-wrap items-center gap-2">
        <Money value={r.amount} className="text-3xl" />
        <span className="text-sm text-muted">
          {t('ofPaid', { paid: r.paidAmount })} · {t(`method.${r.provider}`)}
        </span>
      </p>
      <p className="text-sm">{r.reason}</p>
      <p className="text-xs text-muted">
        {t('by', {
          name: r.requestedBy,
          date: format.dateTime(new Date(r.createdAt), { dateStyle: 'medium', timeStyle: 'short' }),
        })}
        {r.processedBy && ` · ${t('processedBy', { name: r.processedBy })}`}
      </p>
      <div className="flex flex-wrap gap-2">
        {r.status === 'requested' && isOwner && (
          <Button
            size="md"
            className="min-h-14"
            loading={act.isPending && act.variables === 'approve'}
            onClick={() => act.mutate('approve')}
          >
            {t('approve')}
          </Button>
        )}
        {r.status === 'requested' && (
          <Button
            size="md"
            variant="ghost"
            className="min-h-14"
            onClick={() => act.mutate('reject')}
          >
            {t('reject')}
          </Button>
        )}
        {r.status === 'requested' && !isOwner && (
          <p className="text-sm text-muted">{t('ownerApproves')}</p>
        )}
        {r.status === 'approved' && (
          <Button
            size="md"
            variant="secondary"
            className="min-h-14"
            onClick={() => setProcessed(true)}
          >
            {t('markProcessed')}
          </Button>
        )}
      </div>
      <ConfirmSheet
        open={processed}
        onClose={() => setProcessed(false)}
        title={t('processedTitle')}
        body={t('processedBody')}
        confirmLabel={t('markProcessed')}
        loading={act.isPending}
        onConfirm={() => act.mutate('mark-processed')}
      />
    </Panel>
  );
}

/** Refunds queue (§4.3, §13.2): manager requests, owner approves, then processed by hand. */
export function RefundsAdmin() {
  const t = useTranslations('admin.refunds');
  const staff = useStaff('refunds');
  const refunds = useQuery({
    queryKey: KEY,
    queryFn: () => api.admin.refunds(),
    refetchInterval: 30_000,
  });
  const [request, setRequest] = useState(false);
  const groups: RefundStatus[] = ['requested', 'approved', 'processed', 'rejected'];
  return (
    <AdminPage
      title={t('title')}
      actions={
        <Button size="lg" onClick={() => setRequest(true)}>
          {t('new')}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-muted">{t('intro')}</p>
      {refunds.isError ? (
        <ErrorState onRetry={() => void refunds.refetch()} />
      ) : !refunds.data ? (
        <Skeleton className="h-48 rounded-card" />
      ) : refunds.data.length ? (
        <div className="grid gap-6">
          {groups.map((g) => {
            const list = refunds.data.filter((r) => r.status === g);
            if (!list.length) return null;
            return (
              <section key={g} aria-labelledby={`rf-${g}`}>
                <h2 id={`rf-${g}`} className="mb-2 font-sticker text-lg font-black">
                  {t(`status.${g}`)} ({list.length})
                </h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((r) => (
                    <li key={r.id}>
                      <RefundRow r={r} isOwner={staff.data?.role === 'owner'} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title={t('empty')} />
      )}
      {request && <RequestSheet onClose={() => setRequest(false)} />}
    </AdminPage>
  );
}
