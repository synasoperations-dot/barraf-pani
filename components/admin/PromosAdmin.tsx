'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/form';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { useStaff } from '@/features/admin/session';
import { useNow } from '@/features/admin/useNow';
import { api } from '@/lib/api';
import { PromoInput, type Promo, type PromoKind } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { FEATURE_COMBOS } from '@/lib/flags';
import { formatAmount } from '@/lib/format';
import { AdminPage, Panel, Switch } from './kit';

const toLocal = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 16) : '';
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:00`).toISOString() : null);

const blank = (): PromoInput => ({
  code: '',
  kind: 'percent',
  value: 10,
  minOrder: 0,
  maxUses: null,
  maxUsesPerCustomer: 1, // §5.6 default
  validFrom: null,
  validUntil: null,
  isActive: true,
});

function PromoEditor({ promo, onClose }: { promo: Promo | 'new'; onClose: () => void }) {
  const t = useTranslations('admin.promos');
  const tc = useTranslations('admin.common');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [form, setForm] = useState<PromoInput>(() => {
    if (promo === 'new') return blank();
    const { id: _id, usedCount: _u, ...rest } = promo;
    return rest;
  });
  const set = (p: Partial<PromoInput>) => setForm((f) => ({ ...f, ...p }));
  const parsed = PromoInput.safeParse(form);
  const percentBad = form.kind === 'percent' && (form.value < 1 || form.value > 100);
  const save = useMutation({
    mutationFn: () =>
      promo === 'new'
        ? api.admin.createPromo(parsed.data!)
        : api.admin.updatePromo(promo.id, parsed.data!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'promos'] });
      toast(tc('saved'));
      onClose();
    },
    onError: (e) => toast(message(e)),
  });
  const int = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  return (
    <Sheet
      open
      onClose={onClose}
      title={promo === 'new' ? t('new') : t('edit', { code: promo.code })}
      footer={
        <Button
          size="lg"
          block
          disabled={!parsed.success || percentBad}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {tc('save')}
        </Button>
      }
    >
      <div className="grid gap-4">
        <Input
          label={t('code')}
          dir="ltr"
          value={form.code}
          onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
          hint={t('codeHint')}
          disabled={promo !== 'new'}
        />
        <label className="grid gap-1 text-sm font-bold">
          {t('kind')}
          <select
            value={form.kind}
            onChange={(e) => set({ kind: e.target.value as PromoKind })}
            className="min-h-14 rounded-input border-3 border-ink bg-white px-3 font-normal"
          >
            {(['percent', 'flat', 'free_delivery'] as const).map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
        </label>
        {form.kind !== 'free_delivery' && (
          <Input
            type="number"
            min={0}
            label={form.kind === 'percent' ? t('valuePercent') : t('valueRs')}
            value={form.value}
            onChange={(e) => set({ value: int(e.target.value) })}
            error={percentBad ? t('percentRange') : undefined}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            type="number"
            min={0}
            label={t('minOrder')}
            value={form.minOrder}
            onChange={(e) => set({ minOrder: int(e.target.value) })}
          />
          <Input
            type="number"
            min={1}
            label={t('maxUses')}
            hint={t('unlimited')}
            value={form.maxUses ?? ''}
            onChange={(e) =>
              set({ maxUses: e.target.value ? Math.max(1, int(e.target.value)) : null })
            }
          />
          <Input
            type="number"
            min={1}
            label={t('perCustomer')}
            value={form.maxUsesPerCustomer}
            onChange={(e) => set({ maxUsesPerCustomer: Math.max(1, int(e.target.value)) })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="datetime-local"
            label={t('validFrom')}
            value={toLocal(form.validFrom)}
            onChange={(e) => set({ validFrom: fromLocal(e.target.value) })}
          />
          <Input
            type="datetime-local"
            label={t('validUntil')}
            value={toLocal(form.validUntil)}
            onChange={(e) => set({ validUntil: fromLocal(e.target.value) })}
          />
        </div>
        <Switch
          label={t('active')}
          checked={form.isActive}
          onChange={(isActive) => set({ isActive })}
        />
      </div>
    </Sheet>
  );
}

/** Promo codes (§5.6): one code per order (no stacking in v1), per-customer limit default 1. */
export function PromosAdmin() {
  const t = useTranslations('admin.promos');
  const tp = useTranslations('price');
  useStaff('promos');
  const promos = useQuery({ queryKey: ['admin', 'promos'], queryFn: () => api.admin.promos() });
  const [edit, setEdit] = useState<Promo | 'new' | null>(null);
  const now = useNow(60_000);
  const value = (p: Promo) =>
    p.kind === 'percent'
      ? `${p.value}%`
      : p.kind === 'flat'
        ? tp('rs', { amount: formatAmount(p.value) })
        : t('kinds.free_delivery');

  return (
    <AdminPage
      title={t('title')}
      actions={
        <Button size="lg" onClick={() => setEdit('new')}>
          {t('new')}
        </Button>
      }
    >
      <p className="mb-4 rounded-input border-3 border-ink bg-yellow p-3 font-bold">
        {t('noStacking')}
      </p>
      {promos.isError ? (
        <ErrorState onRetry={() => void promos.refetch()} />
      ) : !promos.data ? (
        <Skeleton className="h-48 rounded-card" />
      ) : promos.data.length ? (
        <div className="relative overflow-x-auto rounded-card border-3 border-ink bg-white shadow-hard-md">
          <table className="w-full min-w-[44rem] text-start text-sm">
            <caption className="sr-only">{t('title')}</caption>
            <thead className="border-b-3 border-ink bg-paper">
              <tr>
                {(
                  ['code', 'discount', 'minOrder', 'usage', 'perCustomer', 'status', ''] as const
                ).map((h) => (
                  <th key={h} scope="col" className="p-3 text-start">
                    {h ? t(`col.${h}`) : <span className="sr-only">{t('col.actions')}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.data.map((p) => {
                const expired = !!p.validUntil && new Date(p.validUntil).getTime() < now;
                return (
                  <tr key={p.id} className="border-b border-grid-line">
                    <td className="p-3 font-price text-xl" dir="ltr">
                      {p.code}
                    </td>
                    <td className="p-3" dir="ltr">
                      {value(p)}
                    </td>
                    <td className="p-3" dir="ltr">
                      {p.minOrder ? formatAmount(p.minOrder) : '—'}
                    </td>
                    <td className="p-3" dir="ltr">
                      {p.usedCount}
                      {p.maxUses ? ` / ${p.maxUses}` : ''}
                    </td>
                    <td className="p-3">{p.maxUsesPerCustomer}</td>
                    <td className="p-3">
                      <Tag tone={!p.isActive || expired ? 'white' : 'yellow'}>
                        {!p.isActive ? t('inactive') : expired ? t('expired') : t('live')}
                      </Tag>
                    </td>
                    <td className="p-3 text-end">
                      <Button size="sm" variant="ghost" onClick={() => setEdit(p)}>
                        {t('editShort')}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t('empty')} />
      )}
      <Panel className="mt-6">
        <h2 className="mb-1 font-sticker text-lg font-black">{t('combosTitle')}</h2>
        <p className="text-sm">{FEATURE_COMBOS ? t('combosOn') : t('combosOff')}</p>
      </Panel>
      {edit && <PromoEditor promo={edit} onClose={() => setEdit(null)} />}
    </AdminPage>
  );
}
