'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { DealCoupon, EventPoster } from '@/components/deals/cards';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { Checkbox, Input, TextArea } from '@/components/ui/form';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { Stepper } from '@/components/ui/Stepper';
import { toast } from '@/components/ui/Toast';
import { dealMenuTotal, labelMismatch } from '@/features/admin/deals';
import { useStaff } from '@/features/admin/session';
import { defaultVariant, modifierGroupsFor } from '@/features/menu/helpers';
import { api } from '@/lib/api';
import { DealInput, EventInput, type Deal, type Event, type Menu } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatAmount, localized } from '@/lib/format';
import { ImageUpload } from './ImageUpload';
import { AdminPage, ConfirmSheet, Panel, Switch, TabPanel, Tabs } from './kit';

const toLocalInput = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 16) : '';
const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+05:00`).toISOString() : null);

const blankDeal = (): DealInput => ({
  title: { en: '', ur: null },
  description: null,
  imagePath: null,
  priceLabel: null,
  promoCode: null,
  items: [],
  validFrom: null,
  validUntil: null,
  isActive: true,
  sortOrder: 0,
});
const blankEvent = (): EventInput => {
  const start = new Date(Date.now() + 86_400_000);
  start.setUTCHours(15, 0, 0, 0); // 20:00 PKT
  return {
    title: { en: '', ur: null },
    description: null,
    imagePath: null,
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + 3 * 3_600_000).toISOString(),
    bookable: true,
    capacity: null,
    isActive: true,
  };
};

function TextPair({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: { en: string; ur: string | null } | null;
  onChange: (v: { en: string; ur: string | null } | null) => void;
  multiline?: boolean;
}) {
  const t = useTranslations('admin.common');
  const Field = multiline ? TextArea : Input;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label={`${label} (${t('english')})`}
        value={value?.en ?? ''}
        onChange={(e) =>
          onChange(
            e.target.value || value?.ur ? { en: e.target.value, ur: value?.ur ?? null } : null,
          )
        }
      />
      <Field
        label={`${label} (${t('urdu')})`}
        dir="rtl"
        lang="ur"
        value={value?.ur ?? ''}
        onChange={(e) => onChange({ en: value?.en ?? '', ur: e.target.value || null })}
      />
    </div>
  );
}

function LinkedItems({
  menu,
  items,
  onChange,
}: {
  menu: Menu;
  items: Deal['items'];
  onChange: (i: Deal['items']) => void;
}) {
  const t = useTranslations('admin.deals');
  const locale = useLocale();
  const active = menu.items.filter((i) => i.isActive);
  const set = (idx: number, patch: Partial<Deal['items'][number]>) =>
    onChange(items.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-bold">{t('items')}</legend>
      {items.map((l, idx) => {
        const item = menu.items.find((i) => i.id === l.itemId);
        return (
          <div key={idx} className="grid gap-2 rounded-input border-2 border-ink bg-paper p-3">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
              <label className="grid gap-1 text-sm font-bold">
                {t('item')}
                <select
                  value={l.itemId}
                  onChange={(e) => {
                    const it = menu.items.find((i) => i.id === e.target.value)!;
                    set(idx, { itemId: it.id, variantId: defaultVariant(it).id, modifierIds: [] });
                  }}
                  className="min-h-14 rounded-input border-3 border-ink bg-white px-2 font-normal"
                >
                  {active.map((i) => (
                    <option key={i.id} value={i.id}>
                      {localized(i.name, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {t('variant')}
                <select
                  value={l.variantId}
                  onChange={(e) => set(idx, { variantId: e.target.value })}
                  className="min-h-14 rounded-input border-3 border-ink bg-white px-2 font-normal"
                >
                  {item?.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {formatAmount(v.price)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-1 text-sm font-bold">
                {t('qty')}
                <Stepper value={l.qty} min={1} max={50} onChange={(qty) => set(idx, { qty })} />
              </div>
            </div>
            {item &&
              modifierGroupsFor(menu, item).map((g) => (
                <div key={g.id} className="flex flex-wrap gap-2">
                  {g.modifiers.map((m) => (
                    <Checkbox
                      key={m.id}
                      label={`${localized(m.name, locale)} +${formatAmount(m.price)}`}
                      checked={l.modifierIds.includes(m.id)}
                      onChange={(e) =>
                        set(idx, {
                          modifierIds: e.target.checked
                            ? [...l.modifierIds, m.id]
                            : l.modifierIds.filter((x) => x !== m.id),
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
            >
              {t('removeItem')}
            </Button>
          </div>
        );
      })}
      <Button
        variant="secondary"
        onClick={() => {
          const first = active[0];
          if (first)
            onChange([
              ...items,
              { itemId: first.id, variantId: defaultVariant(first).id, modifierIds: [], qty: 1 },
            ]);
        }}
      >
        {t('addItem')}
      </Button>
    </fieldset>
  );
}

function DealEditor({
  menu,
  deal,
  onClose,
}: {
  menu: Menu;
  deal: Deal | 'new';
  onClose: () => void;
}) {
  const t = useTranslations('admin.deals');
  const tc = useTranslations('admin.common');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [form, setForm] = useState<DealInput>(() => (deal === 'new' ? blankDeal() : { ...deal }));
  const [del, setDel] = useState(false);
  const parsed = DealInput.safeParse(form);
  const mismatch = labelMismatch(form.priceLabel, form.items, menu);
  const total = dealMenuTotal(form.items, menu);
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'deals'] });
    toast(tc('liveOnSite'));
    onClose();
  };
  const save = useMutation({
    mutationFn: () =>
      deal === 'new'
        ? api.admin.createDeal(parsed.data!)
        : api.admin.updateDeal(deal.id, parsed.data!),
    onSuccess: done,
    onError: (e) => toast(message(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.admin.deleteDeal((deal as Deal).id),
    onSuccess: done,
    onError: (e) => toast(message(e)),
  });
  const set = (p: Partial<DealInput>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Sheet
      open
      onClose={onClose}
      title={deal === 'new' ? t('new') : t('edit')}
      className="md:max-w-3xl!"
      footer={
        <div className="flex gap-3">
          {deal !== 'new' && (
            <Button variant="ghost" onClick={() => setDel(true)}>
              {tc('delete')}
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1"
            disabled={!parsed.success}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {tc('save')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <TextPair
          label={t('dealTitle')}
          value={form.title}
          onChange={(v) => v && set({ title: v })}
        />
        <TextPair
          label={t('description')}
          value={form.description}
          onChange={(v) => set({ description: v })}
          multiline
        />
        <ImageUpload
          label={t('image')}
          value={form.imagePath}
          onChange={(imagePath) => set({ imagePath })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t('priceLabel')}
            hint={t('priceLabelHint')}
            value={form.priceLabel ?? ''}
            maxLength={40}
            onChange={(e) => set({ priceLabel: e.target.value || null })}
          />
          <Input
            label={t('promoCode')}
            value={form.promoCode ?? ''}
            dir="ltr"
            onChange={(e) => set({ promoCode: e.target.value.toUpperCase() || null })}
          />
        </div>
        <LinkedItems menu={menu} items={form.items} onChange={(items) => set({ items })} />
        {total !== null && form.items.length > 0 && (
          <p className="text-sm font-bold">{t('menuTotal', { total: formatAmount(total) })}</p>
        )}
        {mismatch && (
          <p role="alert" className="rounded-input border-3 border-ink bg-orange p-3 font-bold">
            {t('mismatch', {
              shown: formatAmount(mismatch.shown),
              real: formatAmount(mismatch.real),
            })}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            type="datetime-local"
            label={t('validFrom')}
            value={toLocalInput(form.validFrom)}
            onChange={(e) => set({ validFrom: fromLocalInput(e.target.value) })}
          />
          <Input
            type="datetime-local"
            label={t('validUntil')}
            value={toLocalInput(form.validUntil)}
            onChange={(e) => set({ validUntil: fromLocalInput(e.target.value) })}
          />
          <Input
            type="number"
            label={t('sortOrder')}
            value={form.sortOrder}
            onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
          />
        </div>
        <Switch
          label={t('active')}
          checked={form.isActive}
          onChange={(isActive) => set({ isActive })}
        />
        <div>
          <p className="mb-2 text-sm font-bold">{t('preview')}</p>
          {parsed.success ? (
            <div className="max-w-sm">
              <DealCoupon
                deal={{ ...parsed.data, id: 'preview' }}
                menu={menu}
                onOrder={() => {}}
                onCopyCode={() => {}}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">{t('previewHint')}</p>
          )}
        </div>
      </div>
      <ConfirmSheet
        open={del}
        onClose={() => setDel(false)}
        title={t('deleteTitle')}
        confirmLabel={tc('delete')}
        danger
        onConfirm={() => remove.mutate()}
      />
    </Sheet>
  );
}

function EventEditor({ event, onClose }: { event: Event | 'new'; onClose: () => void }) {
  const t = useTranslations('admin.deals');
  const tc = useTranslations('admin.common');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [form, setForm] = useState<EventInput>(() => {
    if (event === 'new') return blankEvent();
    const { id: _id, spotsLeft: _s, ...rest } = event;
    return rest;
  });
  const [del, setDel] = useState(false);
  const parsed = EventInput.safeParse(form);
  const endsOk = new Date(form.endsAt) > new Date(form.startsAt);
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'events'] });
    toast(tc('liveOnSite'));
    onClose();
  };
  const save = useMutation({
    mutationFn: () =>
      event === 'new'
        ? api.admin.createEvent(parsed.data!)
        : api.admin.updateEvent(event.id, parsed.data!),
    onSuccess: done,
    onError: (e) => toast(message(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.admin.deleteEvent((event as Event).id),
    onSuccess: done,
    onError: (e) => toast(message(e)),
  });
  const set = (p: Partial<EventInput>) => setForm((f) => ({ ...f, ...p }));

  return (
    <Sheet
      open
      onClose={onClose}
      title={event === 'new' ? t('newEvent') : t('editEvent')}
      className="md:max-w-3xl!"
      footer={
        <div className="flex gap-3">
          {event !== 'new' && (
            <Button variant="ghost" onClick={() => setDel(true)}>
              {tc('delete')}
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1"
            disabled={!parsed.success || !endsOk}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {tc('save')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <TextPair
          label={t('eventTitle')}
          value={form.title}
          onChange={(v) => v && set({ title: v })}
        />
        <TextPair
          label={t('description')}
          value={form.description}
          onChange={(v) => set({ description: v })}
          multiline
        />
        <ImageUpload
          label={t('image')}
          ratio={4 / 3}
          value={form.imagePath}
          onChange={(imagePath) => set({ imagePath })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="datetime-local"
            label={t('startsAt')}
            value={toLocalInput(form.startsAt)}
            onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) ?? form.startsAt })}
          />
          <Input
            type="datetime-local"
            label={t('endsAt')}
            value={toLocalInput(form.endsAt)}
            error={endsOk ? undefined : t('endsAfter')}
            onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) ?? form.endsAt })}
          />
        </div>
        <Switch
          label={t('bookable')}
          checked={form.bookable}
          onChange={(bookable) => set({ bookable })}
        />
        <Input
          type="number"
          min={1}
          label={t('capacity')}
          hint={t('capacityHint')}
          value={form.capacity ?? ''}
          onChange={(e) =>
            set({
              capacity: e.target.value ? Math.max(1, Math.round(Number(e.target.value))) : null,
            })
          }
        />
        <Switch
          label={t('active')}
          checked={form.isActive}
          onChange={(isActive) => set({ isActive })}
        />
        <div>
          <p className="mb-2 text-sm font-bold">{t('preview')}</p>
          {parsed.success ? (
            <div className="max-w-sm">
              <EventPoster
                event={{ ...parsed.data, id: 'preview', spotsLeft: parsed.data.capacity }}
                onBook={() => {}}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">{t('previewHint')}</p>
          )}
        </div>
      </div>
      <ConfirmSheet
        open={del}
        onClose={() => setDel(false)}
        title={t('deleteEventTitle')}
        confirmLabel={tc('delete')}
        danger
        onConfirm={() => remove.mutate()}
      />
    </Sheet>
  );
}

/** Deals & Events manager (ADDITION §A2): deals are normal items at normal prices. */
export function DealsAdmin() {
  const t = useTranslations('admin.deals');
  const locale = useLocale();
  useStaff('deals');
  const [tab, setTab] = useState<'deals' | 'events'>('deals');
  const menu = useQuery({ queryKey: ['admin', 'menu'], queryFn: () => api.admin.menu() });
  const deals = useQuery({ queryKey: ['admin', 'deals'], queryFn: () => api.admin.deals() });
  const events = useQuery({ queryKey: ['admin', 'events'], queryFn: () => api.admin.events() });
  const [editDeal, setEditDeal] = useState<Deal | 'new' | null>(null);
  const [editEvent, setEditEvent] = useState<Event | 'new' | null>(null);
  const q = tab === 'deals' ? deals : events;

  return (
    <AdminPage
      title={t('title')}
      actions={
        <Button
          size="lg"
          onClick={() => (tab === 'deals' ? setEditDeal('new') : setEditEvent('new'))}
          disabled={!menu.data}
        >
          {tab === 'deals' ? t('new') : t('newEvent')}
        </Button>
      }
    >
      <Tabs
        idBase="de"
        label={t('tabs')}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'deals', label: t('tab.deals'), count: deals.data?.length },
          { value: 'events', label: t('tab.events'), count: events.data?.length },
        ]}
      />
      <TabPanel idBase="de" active={tab} className="mt-4">
        {q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : q.isLoading ? (
          <Skeleton className="h-48 rounded-card" />
        ) : tab === 'deals' ? (
          deals.data!.length ? (
            <ul className="grid gap-3">
              {[...deals.data!]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((d) => {
                  const mismatch = menu.data && labelMismatch(d.priceLabel, d.items, menu.data);
                  return (
                    <li key={d.id}>
                      <Panel className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{localized(d.title, locale)}</p>
                          <p className="text-sm text-muted">
                            {d.priceLabel ?? '—'} · {t('itemsCount', { count: d.items.length })}
                          </p>
                          {mismatch && <p className="text-sm font-bold">{t('mismatchShort')}</p>}
                        </div>
                        <span className="flex items-center gap-2">
                          <Tag tone={d.isActive ? 'yellow' : 'white'}>
                            {d.isActive ? t('activeTag') : t('inactiveTag')}
                          </Tag>
                          <Button
                            variant="ghost"
                            onClick={() => setEditDeal(d)}
                            disabled={!menu.data}
                          >
                            {t('editShort')}
                          </Button>
                        </span>
                      </Panel>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <EmptyState title={t('emptyDeals')} />
          )
        ) : events.data!.length ? (
          <ul className="grid gap-3">
            {events.data!.map((e) => (
              <li key={e.id}>
                <Panel className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{localized(e.title, locale)}</p>
                    <p className="text-sm text-muted" dir="ltr">
                      {new Date(e.startsAt).toLocaleString(locale === 'ur' ? 'ur-PK' : 'en-PK', {
                        timeZone: 'Asia/Karachi',
                      })}
                      {e.capacity ? ` · ${e.capacity}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setEditEvent(e)}>
                    {t('editShort')}
                  </Button>
                </Panel>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('emptyEvents')} />
        )}
      </TabPanel>
      {editDeal && menu.data && (
        <DealEditor menu={menu.data} deal={editDeal} onClose={() => setEditDeal(null)} />
      )}
      {editEvent && <EventEditor event={editEvent} onClose={() => setEditEvent(null)} />}
    </AdminPage>
  );
}
