'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/form';
import { ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { useStaff } from '@/features/admin/session';
import { api } from '@/lib/api';
import {
  StoreSettingsPatch,
  type OpeningHours,
  type PaymentMethod,
  type StoreSettings,
} from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { AdminPage, ConfirmSheet, Panel, Switch } from './kit';

const DAYS = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const; // Monday first; weekday 0 = Sunday (contract)
/** closes < opens (or equal) means the window ends after midnight. */
export const pastMidnight = (h: Pick<OpeningHours, 'opens' | 'closes'>) => h.closes <= h.opens;

function HoursEditor() {
  const hours = useQuery({ queryKey: ['admin', 'hours'], queryFn: () => api.admin.hours() });
  if (hours.isError) return <ErrorState onRetry={() => void hours.refetch()} />;
  if (!hours.data) return <Skeleton className="h-64" />;
  return <HoursForm initial={hours.data} />;
}

function HoursForm({ initial }: { initial: OpeningHours[] }) {
  const t = useTranslations('admin.settings');
  const tc = useTranslations('admin.common');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [rows, setRows] = useState(initial);
  const save = useMutation({
    mutationFn: (h: OpeningHours[]) => api.admin.setHours({ hours: h }),
    onSuccess: (h) => {
      qc.setQueryData(['admin', 'hours'], h);
      void qc.invalidateQueries({ queryKey: ['store', 'status'] });
      toast(tc('saved'));
    },
    onError: (e) => toast(message(e)),
  });
  // Primary key (weekday, opens): two windows can't open at the same minute on one day.
  const dupes = DAYS.some((d) => {
    const opens = rows.filter((r) => r.weekday === d).map((r) => r.opens);
    return new Set(opens).size !== opens.length;
  });

  return (
    <Panel className="grid gap-4">
      <h2 className="font-sticker text-xl font-black">{t('hours')}</h2>
      {DAYS.map((d) => {
        const windows = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.weekday === d);
        return (
          <fieldset key={d} className="grid gap-2 border-b border-grid-line pb-3">
            <legend className="font-bold">{t(`day.${DAY_KEY[d]}`)}</legend>
            {!windows.length && <p className="text-sm text-muted">{t('closedAllDay')}</p>}
            {windows.map(({ r, i }) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Input
                  type="time"
                  label={t('opens')}
                  value={r.opens}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, opens: e.target.value } : x)))
                  }
                  className="w-36"
                />
                <Input
                  type="time"
                  label={t('closes')}
                  value={r.closes}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, closes: e.target.value } : x)))
                  }
                  className="w-36"
                />
                {pastMidnight(r) && (
                  <Tag tone="blue" tilt={-3}>
                    {t('nextDay')}
                  </Tag>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                >
                  {t('removeWindow')}
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="secondary"
              className="justify-self-start"
              onClick={() => setRows([...rows, { weekday: d, opens: '12:00', closes: '23:00' }])}
            >
              {t('addWindow')}
            </Button>
          </fieldset>
        );
      })}
      {dupes && <p className="font-bold">{t('dupes')}</p>}
      <Button size="lg" disabled={dupes} loading={save.isPending} onClick={() => save.mutate(rows)}>
        {t('saveHours')}
      </Button>
    </Panel>
  );
}

function Holidays() {
  const t = useTranslations('admin.settings');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const holidays = useQuery({
    queryKey: ['admin', 'holidays'],
    queryFn: () => api.admin.holidays(),
  });
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const onDone = (h: { date: string; note: string | null }[]) => {
    qc.setQueryData(['admin', 'holidays'], h);
    void qc.invalidateQueries({ queryKey: ['store', 'status'] });
  };
  const add = useMutation({
    mutationFn: () => api.admin.addHoliday({ date, note: note.trim() || null }),
    onSuccess: (h) => {
      onDone(h);
      setDate('');
      setNote('');
    },
    onError: (e) => toast(message(e)),
  });
  const remove = useMutation({
    mutationFn: (d: string) => api.admin.removeHoliday(d),
    onSuccess: onDone,
    onError: (e) => toast(message(e)),
  });
  return (
    <Panel className="grid gap-3">
      <h2 className="font-sticker text-xl font-black">{t('holidays')}</h2>
      <ul className="grid gap-2">
        {(holidays.data ?? []).map((h) => (
          <li
            key={h.date}
            className="flex items-center justify-between gap-2 rounded-input border-2 border-ink p-2"
          >
            <span>
              <span className="font-price text-xl" dir="ltr">
                {h.date}
              </span>{' '}
              {h.note}
            </span>
            <Button size="sm" variant="ghost" onClick={() => remove.mutate(h.date)}>
              {t('removeHoliday')}
            </Button>
          </li>
        ))}
        {holidays.data && !holidays.data.length && (
          <li className="text-sm text-muted">{t('noHolidays')}</li>
        )}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (date) add.mutate();
        }}
      >
        <Input
          type="date"
          label={t('date')}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label={t('note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" loading={add.isPending}>
          {t('addHoliday')}
        </Button>
      </form>
    </Panel>
  );
}

function StoreForm({ initial }: { initial: StoreSettings }) {
  const t = useTranslations('admin.settings');
  const tc = useTranslations('admin.common');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const [s, setS] = useState(initial);
  const [confirmMaint, setConfirmMaint] = useState(false);
  const set = (p: Partial<StoreSettings>) => setS((x) => ({ ...x, ...p }));
  const { timezone: _tz, ...patch } = s;
  const parsed = StoreSettingsPatch.safeParse(patch);
  const save = useMutation({
    mutationFn: () => api.admin.updateSettings(parsed.data!),
    onSuccess: (n) => {
      qc.setQueryData(['admin', 'settings'], n);
      void qc.invalidateQueries({ queryKey: ['store', 'status'] });
      toast(tc('saved'));
    },
    onError: (e) => toast(message(e)),
  });
  const int = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const num = (key: keyof StoreSettings, label: string, hint?: string, min = 0) => (
    <Input
      type="number"
      min={min}
      label={label}
      hint={hint}
      value={s[key] as number}
      onChange={(e) => set({ [key]: Math.max(min, int(e.target.value)) } as Partial<StoreSettings>)}
    />
  );
  const togglePay = (m: PaymentMethod, on: boolean) =>
    set({
      enabledPaymentMethods: on
        ? [...new Set([...s.enabledPaymentMethods, m])]
        : s.enabledPaymentMethods.filter((x) => x !== m),
    });
  const link = (k: keyof StoreSettings['links'], label: string) => (
    <Input
      label={label}
      dir="ltr"
      value={s.links[k] ?? ''}
      onChange={(e) => set({ links: { ...s.links, [k]: e.target.value.trim() || null } })}
    />
  );

  return (
    <Panel className="grid gap-5">
      <h2 className="font-sticker text-xl font-black">{t('store')}</h2>
      <Switch
        label={t('accepting')}
        description={t('acceptingHint')}
        checked={s.isAcceptingOrders}
        onChange={(isAcceptingOrders) =>
          set({ isAcceptingOrders, pauseReason: isAcceptingOrders ? null : s.pauseReason })
        }
      />
      {!s.isAcceptingOrders && (
        <Input
          label={t('pauseReason')}
          value={s.pauseReason ?? ''}
          onChange={(e) => set({ pauseReason: e.target.value || null })}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {num('minOrderValue', t('minOrder'))}
        {num('maxCodValue', t('maxCod'))}
        {num('autoRejectMinutes', t('autoReject'), t('minutes'), 1)}
        {num('managerAlertMinutes', t('managerAlert'), t('minutes'), 1)}
      </div>
      {s.managerAlertMinutes >= s.autoRejectMinutes && (
        <p className="font-bold">{t('alertBeforeReject')}</p>
      )}
      <Switch
        label={t('allowPreorders')}
        checked={s.allowPreorders}
        onChange={(allowPreorders) => set({ allowPreorders })}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {num('preorderMaxDays', t('preorderMaxDays'), undefined, 1)}
        {num('preorderCodMaxHours', t('preorderCodMaxHours'))}
        {num('preorderReleaseMinutes', t('preorderRelease'), t('minutes'), 1)}
      </div>
      <Input
        label={t('shopPhone')}
        dir="ltr"
        value={s.shopPhone}
        onChange={(e) => set({ shopPhone: e.target.value })}
      />

      <fieldset className="grid gap-1">
        <legend className="mb-1 font-bold">{t('payments')}</legend>
        {(['cod', 'jazzcash', 'easypaisa'] as const).map((m) => (
          <Switch
            key={m}
            label={t(`pay.${m}`)}
            checked={s.enabledPaymentMethods.includes(m)}
            onChange={(on) => togglePay(m, on)}
            disabled={on(m)}
          />
        ))}
        <p className="text-sm text-muted">{t('onlineFlag')}</p>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 font-bold">{t('links')}</legend>
        {link('whatsapp', t('whatsapp'))}
        {link('instagram', t('instagram'))}
        {link('facebook', t('facebook'))}
        {link('tiktok', t('tiktok'))}
      </fieldset>

      <Switch
        label={t('maintenance')}
        description={t('maintenanceHint')}
        checked={s.maintenanceMode}
        onChange={(on) => (on ? setConfirmMaint(true) : set({ maintenanceMode: false }))}
      />
      {!parsed.success && <p className="font-bold">{t('invalid')}</p>}
      <Button
        size="lg"
        disabled={!parsed.success || s.managerAlertMinutes >= s.autoRejectMinutes}
        loading={save.isPending}
        onClick={() => save.mutate()}
      >
        {t('saveStore')}
      </Button>
      <ConfirmSheet
        open={confirmMaint}
        onClose={() => setConfirmMaint(false)}
        title={t('maintenanceTitle')}
        body={t('maintenanceBody')}
        typed="MAINTENANCE"
        confirmLabel={t('maintenanceOn')}
        danger
        onConfirm={() => {
          set({ maintenanceMode: true });
          setConfirmMaint(false);
        }}
      />
    </Panel>
  );

  // COD can't be the one switched off if it's the last method left.
  function on(m: PaymentMethod) {
    return s.enabledPaymentMethods.length === 1 && s.enabledPaymentMethods[0] === m;
  }
}

/** Owner-only: hours, holidays, store_settings, payments, links, maintenance (§5.3). */
export function SettingsAdmin() {
  const t = useTranslations('admin.settings');
  useStaff('settings');
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.admin.settings(),
  });
  return (
    <AdminPage title={t('title')}>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="grid content-start gap-5">
          {settings.isError ? (
            <ErrorState onRetry={() => void settings.refetch()} />
          ) : settings.data ? (
            <StoreForm initial={settings.data} />
          ) : (
            <Skeleton className="h-96" />
          )}
        </div>
        <div className="grid content-start gap-5">
          <HoursEditor />
          <Holidays />
        </div>
      </div>
    </AdminPage>
  );
}
