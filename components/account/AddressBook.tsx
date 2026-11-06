'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Sheet } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/form';
import { MapPinPicker } from '@/components/ui/MapPinPicker';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import { toast } from '@/components/ui/Toast';
import {
  checkZone,
  useAddresses,
  useDeleteAddress,
  useMe,
  useSaveAddress,
} from '@/features/account/hooks';
import { isApiError } from '@/lib/api';
import { ADDRESS_LABELS, AddressInput, type Address, type GeoPoint } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { tilt } from '@/lib/tilt';

type Label = (typeof ADDRESS_LABELS)[number];
const asLabel = (l: string): Label =>
  (ADDRESS_LABELS as readonly string[]).includes(l) ? (l as Label) : 'other';

/** Translated label for a saved address ("home" → "Home"; free text from older data as-is). */
export function useAddressLabel() {
  const t = useTranslations('account.labels');
  return (a: Pick<Address, 'label'>) =>
    (ADDRESS_LABELS as readonly string[]).includes(a.label)
      ? t(a.label as Label)
      : a.label || t('other');
}

/** Sticker icon per label: house, briefcase, pin. */
export function LabelIcon({ label, className }: { label: string; className?: string }) {
  const kind = asLabel(label);
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid size-12 shrink-0 place-items-center rounded-sticker border-3 border-ink shadow-hard-sm',
        kind === 'home' ? 'bg-yellow' : kind === 'work' ? 'bg-blue-light' : 'bg-orange',
        className,
      )}
      style={{ rotate: tilt(kind === 'work' ? 4 : -4) }}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {kind === 'home' ? (
          <path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5h4v5" fill="var(--color-white)" />
        ) : kind === 'work' ? (
          <>
            <rect x="3" y="7.5" width="18" height="12" rx="2" fill="var(--color-white)" />
            <path d="M9 7.5V5h6v2.5M3 12.5h18" />
          </>
        ) : (
          <>
            <path
              d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"
              fill="var(--color-white)"
            />
            <circle cx="12" cy="10" r="2.3" />
          </>
        )}
      </svg>
    </span>
  );
}

/** /account/addresses: list, add, edit, delete, one default; zone check on save. */
export function AddressBook() {
  const t = useTranslations('account.addresses');
  const me = useMe();
  const list = useAddresses(!!me.data);
  const save = useSaveAddress();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);

  let body;
  if (list.data) {
    const sorted = [...list.data].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    body = sorted.length ? (
      <ul className="grid gap-5">
        {sorted.map((a) => (
          <li key={a.id}>
            <AddressCard
              address={a}
              onEdit={() => setEditing(a)}
              onDelete={() => setDeleting(a)}
              onDefault={() =>
                save.mutate(
                  { id: a.id, body: { isDefault: true } },
                  { onSuccess: () => toast(t('defaultSet')) },
                )
              }
              busy={save.isPending}
            />
          </li>
        ))}
      </ul>
    ) : (
      <Card className="p-2">
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={<Button onClick={() => setEditing('new')}>{t('add')}</Button>}
        />
      </Card>
    );
  } else if (list.error || me.error) {
    const e = list.error ?? me.error;
    body = (
      <ErrorState
        offline={isApiError(e) && e.code === 'NETWORK_ERROR'}
        onRetry={() => void (me.error ? me.refetch() : list.refetch())}
      />
    );
  } else {
    body = (
      <div aria-busy="true" className="grid gap-5">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl leading-none md:text-5xl">{t('title')}</h1>
        {!!list.data?.length && <Button onClick={() => setEditing('new')}>{t('add')}</Button>}
      </div>
      {body}
      {editing && (
        <AddressSheet
          key={editing === 'new' ? 'new' : editing.id}
          address={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteSheet address={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

export function AddressCard({
  address: a,
  onEdit,
  onDelete,
  onDefault,
  busy,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onDefault: () => void;
  busy?: boolean;
}) {
  const t = useTranslations('account.addresses');
  const label = useAddressLabel()(a);
  return (
    <article className="flex flex-col gap-4 rounded-card border-3 border-ink bg-white p-5 shadow-hard-md sm:flex-row sm:items-start">
      <LabelIcon label={a.label} />
      <div className="min-w-0 flex-1">
        <h2 className="flex flex-wrap items-center gap-2 font-sticker text-xl font-black">
          {label}
          {a.isDefault && <Tag tone="yellow">{t('default')}</Tag>}
        </h2>
        <p className="mt-1">{a.line1}</p>
        {a.area && <p className="text-muted">{a.area}</p>}
        {a.landmark && <p className="text-sm text-muted">{a.landmark}</p>}
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
        {!a.isDefault && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={onDefault}>
            {t('makeDefault')}
          </Button>
        )}
        <Button size="sm" variant="ghost" aria-label={t('editLabel', { label })} onClick={onEdit}>
          {t('edit')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('deleteLabel', { label })}
          onClick={onDelete}
        >
          {t('delete')}
        </Button>
      </div>
    </article>
  );
}

type ZoneState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'in'; zone: string; minutes: number }
  | { kind: 'outside' };

/** Add / edit form. OUTSIDE_ZONE is a warning: "Save anyway" keeps it for pickup reference. */
export function AddressSheet({
  address,
  onClose,
}: {
  address: Address | null;
  onClose: () => void;
}) {
  const t = useTranslations('account.addresses');
  const tl = useTranslations('account.labels');
  const message = useErrorMessage();
  const save = useSaveAddress();
  const [label, setLabel] = useState<Label>(asLabel(address?.label ?? 'home'));
  const [line1, setLine1] = useState(address?.line1 ?? '');
  const [area, setArea] = useState(address?.area ?? '');
  const [landmark, setLandmark] = useState(address?.landmark ?? '');
  const [pin, setPin] = useState<GeoPoint | null>(address?.location ?? null);
  const [zone, setZone] = useState<ZoneState>({ kind: 'idle' });
  const [tried, setTried] = useState(false);
  const [checkError, setCheckError] = useState<unknown>(null);

  const input = {
    label,
    line1: line1.trim(),
    area: area.trim(),
    landmark: landmark.trim() || null,
    location: pin,
  };
  const parsed = AddressInput.safeParse(input);
  const line1Error = tried && input.line1.length < 3 ? t('line1Error') : undefined;
  const pinError = tried && !pin ? t('pinError') : undefined;

  async function submit() {
    setTried(true);
    if (!parsed.success) return;
    // Check once per pin; a warned "outside" pin saves on the second tap.
    if (zone.kind !== 'outside' && zone.kind !== 'in') {
      setZone({ kind: 'checking' });
      setCheckError(null);
      try {
        const r = await checkZone(parsed.data.location);
        if (r.outside) return setZone({ kind: 'outside' });
        setZone({ kind: 'in', zone: r.zone.zoneName, minutes: r.zone.etaMinutes });
      } catch (e) {
        setZone({ kind: 'idle' });
        return setCheckError(e);
      }
    }
    save.mutate(
      { id: address?.id ?? null, body: parsed.data },
      {
        onSuccess: () => {
          toast(t('saved'));
          onClose();
        },
      },
    );
  }

  const err = save.error ?? checkError;
  return (
    <Sheet
      open
      onClose={onClose}
      title={address ? t('sheetEdit') : t('sheetAdd')}
      footer={
        <Button
          block
          loading={save.isPending || zone.kind === 'checking'}
          onClick={() => void submit()}
          variant={zone.kind === 'outside' ? 'secondary' : 'primary'}
        >
          {zone.kind === 'outside' ? t('saveAnyway') : t('save')}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <ChoiceChips<Label>
          legend={t('label')}
          value={label}
          onChange={setLabel}
          options={ADDRESS_LABELS.map((l) => ({ value: l, label: tl(l) }))}
        />
        <Input
          label={t('line1')}
          placeholder={t('line1Placeholder')}
          autoComplete="address-line1"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          error={line1Error}
          maxLength={200}
        />
        <Input
          label={t('area')}
          placeholder={t('areaPlaceholder')}
          autoComplete="address-level2"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          maxLength={100}
        />
        <Input
          label={t('landmark')}
          placeholder={t('landmarkPlaceholder')}
          hint={t('landmarkHint')}
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          maxLength={200}
        />
        <div>
          <MapPinPicker
            value={pin}
            onChange={(p) => {
              setPin(p);
              setZone({ kind: 'idle' }); // a moved pin is checked again
            }}
            message={
              zone.kind === 'checking'
                ? t('checking')
                : zone.kind === 'in'
                  ? t('inZone', { zone: zone.zone, minutes: zone.minutes })
                  : undefined
            }
          />
          {pinError && (
            <p role="alert" className="mt-1.5 text-sm font-bold">
              {pinError}
            </p>
          )}
        </div>
        {zone.kind === 'outside' && (
          <div
            role="alert"
            className="rounded-sticker border-3 border-ink bg-yellow p-4 shadow-hard-sm"
          >
            <p className="font-bold">{t('outsideTitle')}</p>
            <p className="text-sm">{t('outsideBody')}</p>
          </div>
        )}
        {err != null && (
          <p role="alert" className="flex gap-2 font-bold">
            <span aria-hidden="true" className="text-orange-deep">
              !
            </span>
            {message(err)}
          </p>
        )}
        {/* Enter submits from any field. */}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function DeleteSheet({ address, onClose }: { address: Address | null; onClose: () => void }) {
  const t = useTranslations('account.addresses');
  const del = useDeleteAddress();
  const message = useErrorMessage();
  return (
    <Sheet
      open={address !== null}
      onClose={onClose}
      title={t('deleteTitle')}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {t('keep')}
          </Button>
          <Button
            variant="dark"
            loading={del.isPending}
            onClick={() =>
              address &&
              del.mutate(address.id, {
                onSuccess: () => {
                  toast(t('deleted'));
                  onClose();
                },
              })
            }
          >
            {t('deleteConfirm')}
          </Button>
        </div>
      }
    >
      {address && <p>{t('deleteBody', { line1: address.line1 })}</p>}
      {del.error && (
        <p role="alert" className="mt-3 font-bold">
          {message(del.error)}
        </p>
      )}
    </Sheet>
  );
}
