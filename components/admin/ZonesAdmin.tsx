'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/form';
import { MapPinPicker } from '@/components/ui/MapPinPicker';
import { ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { useStaff } from '@/features/admin/session';
import { api } from '@/lib/api';
import { ZoneInput, type DeliveryZone, type GeoPoint } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { rankZones, ringArea } from '@/lib/geo';
import { AdminPage, Money, Panel, Switch } from './kit';
import { SvgZoneMap } from './ZoneMap';

const KEY = ['admin', 'zones'] as const;

function newZone(center: GeoPoint): Omit<DeliveryZone, 'id'> {
  const d = 0.01;
  return {
    name: '',
    polygon: [
      [center.lng - d, center.lat - d],
      [center.lng + d, center.lat - d],
      [center.lng + d, center.lat + d],
      [center.lng - d, center.lat + d],
      [center.lng - d, center.lat - d],
    ],
    fee: 150,
    minOrder: 500,
    etaMinutes: 40,
    priority: 0,
    isActive: true,
  };
}

/** Delivery zones (§5.3, §5.9): polygon editor + "which zone wins" checker. */
export function ZonesAdmin() {
  const t = useTranslations('admin.zones');
  const tc = useTranslations('admin.common');
  const message = useErrorMessage();
  useStaff('zones');
  const qc = useQueryClient();
  const zones = useQuery({ queryKey: KEY, queryFn: () => api.admin.zones() });
  const [draft, setDraft] = useState<DeliveryZone | null>(null);
  const [probe, setProbe] = useState<GeoPoint | null>(null);
  const check = useQuery({
    queryKey: ['admin', 'zone-check', probe],
    queryFn: () => api.deliveryQuote({ location: probe! }),
    enabled: !!probe,
    retry: false,
  });

  const save = useMutation({
    mutationFn: (z: DeliveryZone) => {
      const { id, ...body } = z;
      const parsed = ZoneInput.parse(body);
      return id.startsWith('new') ? api.admin.createZone(parsed) : api.admin.updateZone(id, parsed);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      setDraft(null);
      toast(tc('saved'));
    },
    onError: (e) => toast(message(e)),
  });

  if (zones.isError)
    return (
      <AdminPage title={t('title')}>
        <ErrorState onRetry={() => void zones.refetch()} />
      </AdminPage>
    );
  if (!zones.data)
    return (
      <AdminPage title={t('title')}>
        <Skeleton className="h-96 rounded-card" />
      </AdminPage>
    );
  const list = draft ? [...zones.data.filter((z) => z.id !== draft.id), draft] : zones.data;
  const ranked = probe ? rankZones(probe, list) : [];
  const valid = draft
    ? ZoneInput.safeParse({ ...draft, id: undefined }).success && draft.name.trim().length > 0
    : false;
  const set = (p: Partial<DeliveryZone>) => draft && setDraft({ ...draft, ...p });
  const int = (v: string) => Math.max(0, Math.round(Number(v) || 0));

  return (
    <AdminPage
      title={t('title')}
      actions={
        <Button
          size="lg"
          disabled={!!draft}
          onClick={() =>
            setDraft({ ...newZone(probe ?? { lat: 31.27, lng: 72.32 }), id: `new_${Date.now()}` })
          }
        >
          {t('new')}
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-3">
          <SvgZoneMap
            zones={list}
            editingId={draft?.id ?? null}
            probe={probe}
            onRingChange={(polygon) => set({ polygon })}
          />
          {draft && <p className="text-sm text-muted">{t('editHint')}</p>}
        </div>

        <div className="grid content-start gap-4">
          {draft ? (
            <Panel className="grid gap-3">
              <h2 className="font-sticker text-lg font-black">
                {draft.id.startsWith('new') ? t('new') : t('edit', { name: draft.name })}
              </h2>
              <Input
                label={t('name')}
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0}
                  label={t('fee')}
                  value={draft.fee}
                  onChange={(e) => set({ fee: int(e.target.value) })}
                />
                <Input
                  type="number"
                  min={0}
                  label={t('minOrder')}
                  value={draft.minOrder}
                  onChange={(e) => set({ minOrder: int(e.target.value) })}
                />
                <Input
                  type="number"
                  min={1}
                  label={t('eta')}
                  value={draft.etaMinutes}
                  onChange={(e) => set({ etaMinutes: Math.max(1, int(e.target.value)) })}
                />
                <Input
                  type="number"
                  label={t('priority')}
                  hint={t('priorityHint')}
                  value={draft.priority}
                  onChange={(e) => set({ priority: Math.round(Number(e.target.value) || 0) })}
                />
              </div>
              <Switch
                label={t('active')}
                checked={draft.isActive}
                onChange={(isActive) => set({ isActive })}
              />
              <p className="text-sm text-muted">
                {t('vertices', { count: draft.polygon.length - 1 })}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  {tc('cancel')}
                </Button>
                <Button
                  className="flex-1"
                  disabled={!valid}
                  loading={save.isPending}
                  onClick={() => save.mutate(draft)}
                >
                  {tc('save')}
                </Button>
              </div>
            </Panel>
          ) : (
            <ul className="grid gap-2">
              {[...zones.data]
                .sort((a, b) => b.priority - a.priority)
                .map((z) => (
                  <li key={z.id}>
                    <Panel className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">{z.name}</p>
                        <p className="flex flex-wrap gap-2 text-sm">
                          <Money value={z.fee} className="text-lg" /> · {t('minShort')}{' '}
                          <Money value={z.minOrder} className="text-lg" /> ·{' '}
                          {t('etaShort', { minutes: z.etaMinutes })} ·{' '}
                          {t('priorityShort', { n: z.priority })}
                        </p>
                      </div>
                      <span className="flex items-center gap-2">
                        {!z.isActive && <Tag tone="white">{t('inactive')}</Tag>}
                        <Button size="sm" variant="ghost" onClick={() => setDraft({ ...z })}>
                          {t('editShort')}
                        </Button>
                      </span>
                    </Panel>
                  </li>
                ))}
            </ul>
          )}

          <Panel className="grid gap-3">
            <h2 className="font-sticker text-lg font-black">{t('checkTitle')}</h2>
            <MapPinPicker value={probe} onChange={setProbe} />
            {probe && (
              <div aria-live="polite" className="grid gap-2 text-sm">
                {check.data ? (
                  <p className="font-bold">{t('wins', { name: check.data.zoneName })}</p>
                ) : check.error ? (
                  <p className="font-bold">{message(check.error)}</p>
                ) : null}
                {ranked.length > 1 && (
                  <ol className="grid gap-1 ps-5" style={{ listStyleType: 'decimal' }}>
                    {ranked.map((z) => (
                      <li key={z.id}>
                        {t('candidate', {
                          name: z.name,
                          priority: z.priority,
                          area: ringArea(z.polygon).toExponential(2),
                        })}
                      </li>
                    ))}
                  </ol>
                )}
                {draft && <p className="text-muted">{t('draftNote')}</p>}
                <p className="text-muted">{t('rule')}</p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
