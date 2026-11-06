'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { Input, TextArea } from '@/components/ui/form';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { itemProblems, priceDiff, reorder, soldOutUntil, withDefault } from '@/features/admin/menu';
import { useStaff } from '@/features/admin/session';
import { itemImage } from '@/features/menu/helpers';
import { api } from '@/lib/api';
import type { Category, Item, ItemInput, Menu, ModifierGroup } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatAmount, localized } from '@/lib/format';
import { Icon } from './icons';
import { ImageUpload } from './ImageUpload';
import { AdminPage, ConfirmSheet, Money, Panel, Switch } from './kit';

const KEY = ['admin', 'menu'] as const;

function useMenuMutations() {
  const qc = useQueryClient();
  const message = useErrorMessage();
  const t = useTranslations('admin.common');
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: KEY });
    void qc.invalidateQueries({ queryKey: ['menu'] }); // the public menu cache in this tab
  };
  return {
    soldOut: useMutation({
      mutationFn: (i: Item) =>
        api.admin.setSoldOut(i.id, {
          isSoldOut: !i.isSoldOut,
          soldOutUntil: i.isSoldOut ? null : soldOutUntil(),
        }),
      onMutate: (i) =>
        qc.setQueryData<Menu>(
          KEY,
          (m) =>
            m && {
              ...m,
              items: m.items.map((x) => (x.id === i.id ? { ...x, isSoldOut: !i.isSoldOut } : x)),
            },
        ),
      onSuccess: (i) => {
        refresh();
        toast(i.isSoldOut ? t('soldOutLive') : t('backOnLive'));
      },
      onError: (e) => {
        refresh();
        toast(message(e));
      },
    }),
    reorderCategories: useMutation({
      mutationFn: (cats: Category[]) =>
        Promise.all(cats.map((c) => api.admin.updateCategory(c.id, { sortOrder: c.sortOrder }))),
      onSuccess: refresh,
      onError: (e) => toast(message(e)),
    }),
    reorderItems: useMutation({
      mutationFn: (items: Item[]) =>
        Promise.all(items.map((i) => api.admin.updateItem(i.id, { sortOrder: i.sortOrder }))),
      onSuccess: refresh,
      onError: (e) => toast(message(e)),
    }),
    refresh,
  };
}

/** Drag (pointer) + up/down buttons (keyboard) over one list. */
function Sortable<T extends { id: string; sortOrder: number }>({
  rows,
  onReorder,
  render,
  label,
}: {
  rows: T[];
  onReorder: (changed: T[], all: T[]) => void;
  render: (row: T) => ReactNode;
  label: (row: T) => string;
}) {
  const t = useTranslations('admin.menu');
  const [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return;
    const { rows: all, changed } = reorder(rows, from, to);
    onReorder(changed, all);
  };
  return (
    <ul className="grid gap-2">
      {rows.map((r, i) => (
        <li
          key={r.id}
          draggable
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (drag !== null) move(drag, i);
            setDrag(null);
          }}
          className={clsx(
            'flex items-center gap-2 rounded-input border-2 border-ink bg-white p-2',
            drag === i && 'opacity-50',
          )}
        >
          <span aria-hidden="true" className="cursor-grab text-muted">
            <Icon name="drag" />
          </span>
          <div className="min-w-0 flex-1">{render(r)}</div>
          <span className="flex flex-col gap-1">
            <button
              type="button"
              aria-label={t('moveUp', { name: label(r) })}
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
              className="grid size-9 place-items-center rounded-chip border-2 border-ink bg-paper disabled:opacity-40"
            >
              <Icon name="up" className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t('moveDown', { name: label(r) })}
              disabled={i === rows.length - 1}
              onClick={() => move(i, i + 1)}
              className="grid size-9 place-items-center rounded-chip border-2 border-ink bg-paper disabled:opacity-40"
            >
              <Icon name="down" className="size-4" />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function GroupLimits({ group }: { group: ModifierGroup }) {
  const t = useTranslations('admin.menu');
  const locale = useLocale();
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [min, setMin] = useState(group.minSelect);
  const [max, setMax] = useState(group.maxSelect);
  const save = useMutation({
    mutationFn: () => api.admin.updateModifierGroup(group.id, { minSelect: min, maxSelect: max }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast(t('groupSaved'));
    },
    onError: (e) => toast(message(e)),
  });
  const bad = min > max;
  return (
    <div className="flex flex-wrap items-end gap-2 text-sm">
      <span className="min-w-32 font-bold">{localized(group.name, locale)}</span>
      <Input
        type="number"
        min={0}
        label={t('min')}
        value={min}
        onChange={(e) => setMin(Math.max(0, Number(e.target.value) || 0))}
        className="w-20"
      />
      <Input
        type="number"
        min={1}
        label={t('max')}
        value={max}
        onChange={(e) => setMax(Math.max(1, Number(e.target.value) || 1))}
        className="w-20"
        error={bad ? t('minMax') : undefined}
      />
      {(min !== group.minSelect || max !== group.maxSelect) && (
        <Button size="sm" disabled={bad} loading={save.isPending} onClick={() => save.mutate()}>
          {t('saveGroup')}
        </Button>
      )}
    </div>
  );
}

const blankItem = (categoryId: string, sortOrder: number): ItemInput => ({
  categoryId,
  slug: '',
  name: { en: '', ur: null },
  description: null,
  basePrice: 0,
  imagePath: null,
  isActive: true,
  isSoldOut: false,
  soldOutUntil: null,
  prepMinutes: null,
  sortOrder,
  variants: [
    {
      id: `new_${Date.now()}`,
      name: 'Standard',
      size: null,
      option: null,
      price: 0,
      isDefault: true,
      isAvailable: true,
    },
  ],
  modifierGroupIds: [],
});

function ItemEditor({
  menu,
  item,
  categoryId,
  onClose,
}: {
  menu: Menu;
  item: Item | null;
  categoryId: string;
  onClose: () => void;
}) {
  const t = useTranslations('admin.menu');
  const tc = useTranslations('admin.common');
  const locale = useLocale();
  const message = useErrorMessage();
  const { refresh } = useMenuMutations();
  const [form, setForm] = useState<ItemInput>(() => {
    if (!item)
      return blankItem(categoryId, menu.items.filter((i) => i.categoryId === categoryId).length);
    const { id: _id, ...rest } = item;
    return rest;
  });
  const [review, setReview] = useState(false);
  const [bigOk, setBigOk] = useState(false);
  const set = (p: Partial<ItemInput>) => setForm((f) => ({ ...f, ...p }));
  const diff = item ? priceDiff(item.variants, form.variants) : [];
  const big = diff.some((d) => d.big);
  const problems = itemProblems(form);
  const nameOk = form.name.en.trim().length > 0;
  const ok =
    nameOk &&
    !problems.slug &&
    !problems.defaults &&
    form.variants.every((v) => v.name.trim() && Number.isInteger(v.price) && v.price >= 0);

  const save = useMutation({
    mutationFn: () => (item ? api.admin.updateItem(item.id, form) : api.admin.createItem(form)),
    onSuccess: () => {
      refresh();
      toast(tc('liveOnSite')); // the backend clears the `menu` cache tag on save
      onClose();
    },
    onError: (e) => toast(message(e)),
  });
  const deactivate = useMutation({
    mutationFn: () => api.admin.deactivateItem(item!.id),
    onSuccess: () => {
      refresh();
      onClose();
    },
  });

  const variant = (idx: number, p: Partial<ItemInput['variants'][number]>) =>
    set({ variants: form.variants.map((v, i) => (i === idx ? { ...v, ...p } : v)) });
  const setDefault = (id: string) => set(withDefault(form.variants, id));
  const preview = { ...form, id: item?.id ?? 'preview' } as Item;
  const photo = form.imagePath ?? itemImage(menu, preview);

  return (
    <Sheet
      open
      onClose={onClose}
      title={item ? t('editItem', { name: localized(item.name, locale) }) : t('newItem')}
      className="md:max-w-4xl!"
      footer={
        <div className="flex flex-wrap gap-3">
          {item?.isActive && (
            <Button
              variant="ghost"
              onClick={() => deactivate.mutate()}
              loading={deactivate.isPending}
            >
              {t('deactivate')}
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1"
            disabled={!ok}
            onClick={() => (diff.length ? setReview(true) : save.mutate())}
            loading={save.isPending}
          >
            {diff.length ? t('reviewPrices') : tc('save')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="grid gap-4">
          <Input
            label={t('slug')}
            dir="ltr"
            value={form.slug}
            onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            error={form.slug && problems.slug ? t('slugBad') : undefined}
            hint={t('slugHint')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t('nameEn')}
              value={form.name.en}
              onChange={(e) => set({ name: { ...form.name, en: e.target.value } })}
              required
            />
            <Input
              label={t('nameUr')}
              dir="rtl"
              lang="ur"
              value={form.name.ur ?? ''}
              onChange={(e) => set({ name: { ...form.name, ur: e.target.value || null } })}
            />
            <TextArea
              label={t('descEn')}
              value={form.description?.en ?? ''}
              onChange={(e) =>
                set({
                  description: e.target.value
                    ? { en: e.target.value, ur: form.description?.ur ?? null }
                    : null,
                })
              }
              rows={2}
            />
            <TextArea
              label={t('descUr')}
              dir="rtl"
              lang="ur"
              value={form.description?.ur ?? ''}
              onChange={(e) =>
                set({
                  description: form.description
                    ? { ...form.description, ur: e.target.value || null }
                    : null,
                })
              }
              disabled={!form.description}
              rows={2}
            />
          </div>
          <ImageUpload
            label={t('photo')}
            value={form.imagePath}
            onChange={(imagePath) => set({ imagePath })}
          />

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-bold">{t('variants')}</legend>
            {form.variants.map((v, i) => (
              <div key={v.id} className="grid grid-cols-[auto_1fr_8rem_auto] items-end gap-2">
                <label className="grid min-h-14 place-items-center" title={t('default')}>
                  <input
                    type="radio"
                    name="default-variant"
                    checked={v.isDefault}
                    onChange={() => setDefault(v.id)}
                    className="size-6 accent-ink"
                    aria-label={t('makeDefault', { name: v.name })}
                  />
                </label>
                <Input
                  label={t('variantName')}
                  value={v.name}
                  onChange={(e) => variant(i, { name: e.target.value })}
                />
                <Input
                  label={t('price')}
                  type="number"
                  min={0}
                  step={1}
                  dir="ltr"
                  value={v.price}
                  onChange={(e) =>
                    variant(i, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={form.variants.length === 1}
                  onClick={() => {
                    const rest = form.variants.filter((_, j) => j !== i);
                    set(
                      withDefault(
                        rest,
                        v.isDefault ? rest[0]!.id : rest.find((x) => x.isDefault)!.id,
                      ),
                    );
                  }}
                >
                  {t('removeVariant')}
                </Button>
              </div>
            ))}
            {problems.defaults && <p className="text-sm font-bold">{t('oneDefault')}</p>}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                set({
                  variants: [
                    ...form.variants,
                    {
                      id: `new_${Date.now()}`,
                      name: '',
                      size: null,
                      option: null,
                      price: 0,
                      isDefault: false,
                      isAvailable: true,
                    },
                  ],
                })
              }
            >
              {t('addVariant')}
            </Button>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-bold">{t('groups')}</legend>
            {menu.modifierGroups.map((g) => (
              <div key={g.id} className="grid gap-1 rounded-input border-2 border-ink bg-paper p-2">
                <label className="flex items-center gap-2 font-bold">
                  <input
                    type="checkbox"
                    className="size-5 accent-ink"
                    checked={form.modifierGroupIds.includes(g.id)}
                    onChange={(e) =>
                      set({
                        modifierGroupIds: e.target.checked
                          ? [...form.modifierGroupIds, g.id]
                          : form.modifierGroupIds.filter((x) => x !== g.id),
                      })
                    }
                  />
                  {localized(g.name, locale)}
                </label>
                {form.modifierGroupIds.includes(g.id) && <GroupLimits group={g} />}
              </div>
            ))}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t('prep')}
              type="number"
              min={1}
              value={form.prepMinutes ?? ''}
              onChange={(e) =>
                set({
                  prepMinutes: e.target.value
                    ? Math.max(1, Math.round(Number(e.target.value)))
                    : null,
                })
              }
            />
            <Input
              label={t('sortOrder')}
              type="number"
              value={form.sortOrder}
              onChange={(e) => set({ sortOrder: Math.round(Number(e.target.value) || 0) })}
            />
          </div>
          <Switch
            label={t('active')}
            checked={form.isActive}
            onChange={(isActive) => set({ isActive })}
          />
        </div>

        {/* Live preview: the item as it shows on its menu board and in the item sheet. */}
        <aside aria-label={t('preview')} className="grid content-start gap-4">
          <p className="text-sm font-bold">{t('previewBoard')}</p>
          <div className="rounded-panel border-3 border-ink bg-orange p-3 shadow-hard-md">
            <div className="flex items-center gap-3 rounded-card border-3 border-ink bg-white p-2">
              <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-sticker border-2 border-ink bg-paper">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element -- editor preview of an unsaved upload
                  <img src={photo} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-price text-2xl leading-tight uppercase">
                  {localized(form.name, locale) || '—'}
                </p>
                <span className="inline-block rounded-chip border-2 border-ink bg-white px-2 font-price text-xl">
                  {formatAmount(
                    withDefault(form.variants, form.variants.find((v) => v.isDefault)?.id ?? '')
                      .basePrice,
                  )}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm font-bold">{t('previewSheet')}</p>
          <div className="overflow-hidden rounded-panel border-3 border-ink bg-paper shadow-hard-md">
            <div className="relative aspect-square border-b-3 border-ink bg-white">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element -- editor preview of an unsaved upload
                <img src={photo} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="grid gap-1 p-3">
              <p className="font-display text-2xl">{localized(form.name, locale) || '—'}</p>
              {form.description && <p className="text-sm">{localized(form.description, locale)}</p>}
              <div className="flex flex-wrap gap-1">
                {form.variants.map((v) => (
                  <span
                    key={v.id}
                    className={clsx(
                      'rounded-chip border-2 border-ink px-2 font-price text-lg',
                      v.isDefault ? 'bg-yellow' : 'bg-white',
                    )}
                  >
                    {v.name} {formatAmount(v.price)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmSheet
        open={review}
        onClose={() => {
          setReview(false);
          setBigOk(false);
        }}
        title={t('diffTitle')}
        confirmLabel={tc('save')}
        loading={save.isPending}
        blocked={big && !bigOk}
        onConfirm={() => {
          setReview(false);
          save.mutate();
        }}
      >
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-1 text-start">{t('variantName')}</th>
              <th className="text-start">{t('before')}</th>
              <th className="text-start">{t('after')}</th>
              <th className="text-start">%</th>
            </tr>
          </thead>
          <tbody>
            {diff.map((d) => (
              <tr
                key={d.variant}
                className={clsx('border-b border-grid-line', d.big && 'bg-orange')}
              >
                <td className="py-1">{d.variant}</td>
                <td dir="ltr">{formatAmount(d.before)}</td>
                <td dir="ltr" className="font-bold">
                  {formatAmount(d.after)}
                </td>
                <td dir="ltr">{d.pct > 0 ? `+${d.pct}` : d.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {big && (
          <label className="flex items-start gap-2 rounded-input border-3 border-ink bg-yellow p-3 font-bold">
            <input
              type="checkbox"
              className="mt-1 size-5 accent-ink"
              checked={bigOk}
              onChange={(e) => setBigOk(e.target.checked)}
            />
            {t('bigChange')}
          </label>
        )}
      </ConfirmSheet>
    </Sheet>
  );
}

/** Menu manager (§7): printed-menu order, drag to reorder, one-tap sold out, item editor. */
export function MenuAdmin() {
  const t = useTranslations('admin.menu');
  const locale = useLocale();
  useStaff('menu');
  const menu = useQuery({ queryKey: KEY, queryFn: () => api.admin.menu() });
  const m = useMenuMutations();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<{ item: Item | null; categoryId: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  if (menu.isError)
    return (
      <AdminPage title={t('title')}>
        <ErrorState onRetry={() => void menu.refetch()} />
      </AdminPage>
    );
  if (!menu.data)
    return (
      <AdminPage title={t('title')}>
        <Skeleton className="h-96 rounded-card" />
      </AdminPage>
    );
  const data = menu.data;
  const cats = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <AdminPage title={t('title')}>
      <p className="mb-4 text-sm text-muted">{t('intro')}</p>
      <Sortable
        rows={cats}
        label={(c) => localized(c.name, locale)}
        onReorder={(changed, all) => {
          qc.setQueryData<Menu>(KEY, { ...data, categories: all });
          m.reorderCategories.mutate(changed);
        }}
        render={(c) => {
          const items = data.items
            .filter((i) => i.categoryId === c.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const isOpen = open === c.id;
          return (
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  className="flex min-h-14 items-center gap-2 font-sticker text-lg font-black"
                >
                  <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  {localized(c.name, locale)}
                  <span className="font-body text-sm font-normal text-muted">
                    {t('itemsCount', { count: items.length })}
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEdit({ item: null, categoryId: c.id })}
                >
                  {t('addItem')}
                </Button>
              </div>
              {isOpen &&
                (items.length ? (
                  <Sortable
                    rows={items}
                    label={(i) => localized(i.name, locale)}
                    onReorder={(changed, all) => {
                      qc.setQueryData<Menu>(KEY, {
                        ...data,
                        items: data.items.map((i) => all.find((x) => x.id === i.id) ?? i),
                      });
                      m.reorderItems.mutate(changed);
                    }}
                    render={(i) => (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className={clsx('font-bold', !i.isActive && 'text-muted line-through')}
                          >
                            {localized(i.name, locale)}
                          </p>
                          <p className="flex items-center gap-2 text-sm">
                            <Money value={i.basePrice} className="text-lg" />
                            {i.variants.length > 1 && (
                              <span className="text-muted">
                                {t('variantsCount', { count: i.variants.length })}
                              </span>
                            )}
                            {!i.isActive && <Tag tone="white">{t('inactive')}</Tag>}
                          </p>
                        </div>
                        {/* Big one-tap toggle; broadcast live to the menu page. */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={i.isSoldOut}
                          onClick={() => m.soldOut.mutate(i)}
                          className={clsx(
                            'min-h-14 min-w-36 press rounded-button border-3 border-ink px-3 font-bold shadow-hard-sm',
                            i.isSoldOut ? 'bg-ink text-white' : 'bg-white text-ink',
                          )}
                        >
                          {i.isSoldOut ? t('soldOutToday') : t('available')}
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEdit({ item: i, categoryId: c.id })}
                        >
                          {t('edit')}
                        </Button>
                      </div>
                    )}
                  />
                ) : (
                  <EmptyState title={t('noItems')} />
                ))}
            </div>
          );
        }}
      />
      {edit && (
        <ItemEditor
          menu={data}
          item={edit.item}
          categoryId={edit.categoryId}
          onClose={() => setEdit(null)}
        />
      )}
      <Panel className="mt-6">
        <p className="text-sm">{t('soldOutNote')}</p>
      </Panel>
    </AdminPage>
  );
}
