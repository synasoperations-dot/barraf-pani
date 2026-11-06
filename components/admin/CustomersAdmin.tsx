'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { SourceTag, StatusTag } from '@/components/ui/StatusTag';
import { toast } from '@/components/ui/Toast';
import { useDebounced } from '@/features/cart/useQuote';
import { useStaff } from '@/features/admin/session';
import { api } from '@/lib/api';
import type { AdminCustomer } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { normalizePkPhone } from '@/lib/phone';
import { AdminPage, ConfirmSheet, Facts, Money, Switch } from './kit';

function History({ customer }: { customer: AdminCustomer }) {
  const t = useTranslations('admin.customers');
  const format = useFormatter();
  const orders = useQuery({
    queryKey: ['admin', 'orders', { customerId: customer.id }],
    queryFn: () => api.admin.orders({ customerId: customer.id }),
  });
  if (orders.isLoading) return <Skeleton className="h-24" />;
  if (!orders.data?.length) return <p className="text-sm text-muted">{t('noOrders')}</p>;
  return (
    <ul className="grid gap-2">
      {orders.data.map((o) => (
        <li
          key={o.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-input border-2 border-ink p-2 text-sm"
        >
          <span className="font-price text-xl" dir="ltr">
            {o.number}
          </span>
          <span>
            {format.dateTime(new Date(o.createdAt), {
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          <SourceTag source={o.source} />
          <StatusTag status={o.status} />
          <Money value={o.total} className="text-lg" />
        </li>
      ))}
    </ul>
  );
}

function CustomerSheet({
  customer,
  isOwner,
  onClose,
}: {
  customer: AdminCustomer;
  isOwner: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('admin.customers');
  const message = useErrorMessage();
  const format = useFormatter();
  const qc = useQueryClient();
  const [sheet, setSheet] = useState<'block' | 'anon' | null>(null);
  const [c, setC] = useState(customer);
  const done = (next: AdminCustomer) => {
    setC(next);
    setSheet(null);
    void qc.invalidateQueries({ queryKey: ['admin', 'customers'] });
    toast(t('updated'));
  };
  const onError = (e: unknown) => toast(message(e));
  const block = useMutation({
    mutationFn: (reason: string) => api.admin.blockCustomer(c.id, { reason }),
    onSuccess: done,
    onError,
  });
  const unblock = useMutation({
    mutationFn: () => api.admin.unblockCustomer(c.id),
    onSuccess: done,
    onError,
  });
  const cod = useMutation({
    mutationFn: (codAllowed: boolean) => api.admin.setCustomerCod(c.id, { codAllowed }),
    onSuccess: done,
    onError,
  });
  const anon = useMutation({
    mutationFn: () => api.admin.anonymizeCustomer(c.id),
    onSuccess: done,
    onError,
  });
  const anonymized = !!c.anonymizedAt;

  return (
    <Sheet open onClose={onClose} title={c.name ?? t('noName')} className="md:max-w-2xl!">
      <div className="grid gap-4">
        <Facts
          rows={[
            [
              t('phone'),
              <span key="p" dir="ltr">
                {c.phone}
              </span>,
            ],
            [t('orders'), c.orderCount],
            [
              t('lastOrder'),
              c.lastOrderAt
                ? format.dateTime(new Date(c.lastOrderAt), { dateStyle: 'medium' })
                : '—',
            ],
            [t('spent'), <Money key="s" value={c.totalSpent} className="text-lg" />],
            [t('failedCod'), c.failedCodCount],
            [t('whatsapp'), c.whatsappOptIn ? t('yes') : t('no')],
          ]}
        />
        {c.isBlocked && (
          <p className="rounded-input border-3 border-ink bg-orange p-3 font-bold">
            {t('blockedBecause', { reason: c.blockReason ?? '—' })}
          </p>
        )}
        {anonymized && <Tag tone="ink">{t('anonymized')}</Tag>}
        {!anonymized && (
          <>
            <Switch
              label={t('codAllowed')}
              description={t('codHint')}
              checked={c.codAllowed}
              disabled={cod.isPending}
              onChange={(on) => cod.mutate(on)}
            />
            <div className="flex flex-wrap gap-2">
              {c.isBlocked ? (
                <Button
                  variant="secondary"
                  size="lg"
                  loading={unblock.isPending}
                  onClick={() => unblock.mutate()}
                >
                  {t('unblock')}
                </Button>
              ) : (
                <Button variant="ghost" size="lg" onClick={() => setSheet('block')}>
                  {t('block')}
                </Button>
              )}
              {isOwner && (
                <Button variant="dark" size="lg" onClick={() => setSheet('anon')}>
                  {t('anonymize')}
                </Button>
              )}
            </div>
          </>
        )}
        <h3 className="font-sticker text-lg font-black">{t('history')}</h3>
        <History customer={c} />
      </div>
      <ConfirmSheet
        open={sheet === 'block'}
        onClose={() => setSheet(null)}
        title={t('blockTitle')}
        body={t('blockBody')}
        reason={{ label: t('reason'), required: true }}
        confirmLabel={t('block')}
        danger
        loading={block.isPending}
        onConfirm={(reason) => block.mutate(reason)}
      />
      <ConfirmSheet
        open={sheet === 'anon'}
        onClose={() => setSheet(null)}
        title={t('anonTitle')}
        body={t('anonBody')}
        typed="ANONYMIZE"
        confirmLabel={t('anonymize')}
        danger
        loading={anon.isPending}
        onConfirm={() => anon.mutate()}
      />
    </Sheet>
  );
}

/** Customers (§5.4, §7): search by phone, block/unblock, COD allowed, anonymise (owner). */
export function CustomersAdmin() {
  const t = useTranslations('admin.customers');
  const staff = useStaff('customers');
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 300);
  // A full mobile number is normalised to E.164 first; partial digits search as typed.
  const term = normalizePkPhone(debounced) ?? debounced.replace(/[^\d+a-z ]/gi, '').trim();
  const customers = useQuery({
    queryKey: ['admin', 'customers', term],
    queryFn: () => api.admin.customers(term || undefined),
  });
  const [open, setOpen] = useState<AdminCustomer | null>(null);

  return (
    <AdminPage title={t('title')}>
      <label className="mb-4 grid max-w-md gap-1 text-sm font-bold">
        {t('search')}
        <input
          type="search"
          inputMode="tel"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="03XX XXXXXXX"
          dir="ltr"
          className="min-h-14 rounded-input border-3 border-ink px-3 text-base font-normal"
        />
      </label>
      {customers.isError ? (
        <ErrorState onRetry={() => void customers.refetch()} />
      ) : !customers.data ? (
        <Skeleton className="h-48 rounded-card" />
      ) : customers.data.length ? (
        <div className="relative overflow-x-auto rounded-card border-3 border-ink bg-white shadow-hard-md">
          <table className="w-full min-w-[48rem] text-start text-sm">
            <caption className="sr-only">{t('title')}</caption>
            <thead className="border-b-3 border-ink bg-paper">
              <tr>
                {(['name', 'phone', 'orders', 'spent', 'failedCod', 'cod', 'status'] as const).map(
                  (h) => (
                    <th key={h} scope="col" className="p-3 text-start">
                      {t(`col.${h}`)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {customers.data.map((c) => (
                <tr key={c.id} className="border-b border-grid-line">
                  <td className="p-3">
                    <button
                      type="button"
                      className="min-h-11 text-start font-bold underline decoration-2 underline-offset-4"
                      onClick={() => setOpen(c)}
                    >
                      {c.name ?? t('noName')}
                    </button>
                  </td>
                  <td className="p-3" dir="ltr">
                    {c.phone}
                  </td>
                  <td className="p-3">{c.orderCount}</td>
                  <td className="p-3">
                    <Money value={c.totalSpent} className="text-lg" />
                  </td>
                  <td className="p-3">{c.failedCodCount}</td>
                  <td className="p-3">{c.codAllowed ? t('yes') : t('no')}</td>
                  <td className="p-3">
                    {c.anonymizedAt ? (
                      <Tag tone="ink">{t('anonymized')}</Tag>
                    ) : c.isBlocked ? (
                      <Tag tone="orange">{t('blocked')}</Tag>
                    ) : (
                      <Tag tone="white">{t('ok')}</Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t('empty')} />
      )}
      {open && (
        <CustomerSheet
          customer={open}
          isOwner={staff.data?.role === 'owner'}
          onClose={() => setOpen(null)}
        />
      )}
    </AdminPage>
  );
}
