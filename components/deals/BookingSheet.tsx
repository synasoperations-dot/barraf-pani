'use client';

import Link from 'next/link';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Turnstile } from '@/components/checkout/Turnstile';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { Input, RadioCards, TextArea } from '@/components/ui/form';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Stamp } from '@/components/ui/Stamp';
import { Stepper } from '@/components/ui/Stepper';
import { useMe } from '@/features/checkout/useProfile';
import { useCreateBooking } from '@/features/deals/hooks';
import { bookingSlots, isHoliday, localTime } from '@/features/deals/slots';
import { localDate } from '@/features/store/hours';
import { useStoreStatus } from '@/features/store/useStore';
import { newIdempotencyKey } from '@/lib/api';
import type { BookingType, Event } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { localized } from '@/lib/format';

const MAX_DAYS_AHEAD = 60;
const DAY = 86_400_000;

export interface BookingSheetProps {
  open: boolean;
  onClose: () => void;
  type?: BookingType;
  event?: Event | null;
}

/** "HH:MM" → localized time text (e.g. "8:30 PM"). */
export function useLocalTime() {
  const format = useFormatter();
  return (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return format.dateTime(new Date(Date.UTC(2024, 0, 1, h, m)), {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };
}

/**
 * Table / event / private-event booking request (§A2). Intent only; the server confirms later.
 * The idempotency key is created when the sheet opens and reused on every retry (§2.4 rule).
 */
export function BookingSheet({ open, onClose, type = 'table', event = null }: BookingSheetProps) {
  const t = useTranslations('deals.sheet');
  // Fresh key + form each time the sheet opens (state adjusted during render, no effect).
  const [session, setSession] = useState<{ key: string; open: boolean }>({ key: '', open: false });
  if (session.open !== open) setSession({ key: open ? newIdempotencyKey() : session.key, open });

  return (
    <Sheet open={open} onClose={onClose} title={t('title')}>
      {open && session.key && (
        <BookingForm
          key={session.key}
          idempotencyKey={session.key}
          initialType={event ? 'event' : type}
          event={event}
          onAnother={() => setSession({ key: newIdempotencyKey(), open: true })}
        />
      )}
    </Sheet>
  );
}

type Errors = Partial<Record<'date' | 'time' | 'name' | 'phone', string>>;

function BookingForm({
  idempotencyKey,
  initialType,
  event,
  onAnother,
}: {
  idempotencyKey: string;
  initialType: BookingType;
  event: Event | null;
  onAnother: () => void;
}) {
  const t = useTranslations('deals.sheet');
  const tc = useTranslations('common');
  const locale = useLocale();
  const format = useFormatter();
  const timeText = useLocalTime();
  const message = useErrorMessage();
  const formId = useId();
  const store = useStoreStatus().data;
  const me = useMe().data ?? null;
  const create = useCreateBooking(idempotencyKey);
  const [now] = useState(() => Date.now());

  const [type, setType] = useState<BookingType>(initialType);
  const today = localDate(now);
  const [date, setDate] = useState(today);
  const [timeDraft, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [nameDraft, setName] = useState<string | null>(null);
  const [phoneDraft, setPhone] = useState<string | null | undefined>(undefined);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const name = nameDraft ?? me?.name ?? '';
  const phone = phoneDraft === undefined ? (me?.phone ?? null) : phoneDraft;
  const forEvent = type === 'event' && event !== null;
  const maxGuests = forEvent && event.spotsLeft !== null ? Math.max(1, event.spotsLeft) : 200;

  const holidays = store?.holidays ?? [];
  const holiday = holidays.find((h) => h.date === date);
  const slots =
    store && !isHoliday(holidays, date) ? bookingSlots(store.openingHours, date, now) : [];
  const time = timeDraft && slots.includes(timeDraft) ? timeDraft : null;

  const dateText = (d: string) =>
    format.dateTime(new Date(`${d}T12:00:00+05:00`), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  if (create.data)
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <Stamp tone="yellow" size="lg" animate>
          {t('sentTitle')}
        </Stamp>
        <p className="max-w-xs text-lg">{t('sentBody')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={`/booking/${create.data.publicToken}`}
            className={buttonClasses({ variant: 'primary' })}
          >
            {t('viewStatus')}
          </Link>
          <Button variant="ghost" onClick={onAnother}>
            {t('another')}
          </Button>
        </div>
      </div>
    );

  function submit() {
    const eventDate = forEvent ? localDate(Date.parse(event.startsAt)) : null;
    const eventTime = forEvent ? localTime(Date.parse(event.startsAt)) : null;
    const next: Errors = {};
    if (!forEvent && holiday)
      next.date = t('holiday', { date: dateText(date), note: holiday.note ?? 'none' });
    else if (!forEvent && !time) next.time = slots.length ? t('pickTime') : t('noSlots');
    if (!name.trim()) next.name = t('nameError');
    if (!phone) next.phone = t('phoneError');
    setErrors(next);
    if (Object.keys(next).length || !phone) return;
    create.mutate({
      type,
      eventId: forEvent ? event.id : null,
      date: eventDate ?? date,
      time: eventTime ?? time!,
      guests: Math.min(guests, maxGuests),
      name: name.trim(),
      phone,
      note: note.trim() || null,
    });
  }

  const types: BookingType[] = event
    ? ['event', 'table', 'private_event']
    : ['table', 'private_event'];

  return (
    <form
      id={formId}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <RadioCards
        legend={t('type')}
        value={type}
        onChange={setType}
        options={types.map((v) => ({
          value: v,
          label: t(`types.${v}`),
          description:
            v === 'event' && event
              ? t('typeHints.event', { name: localized(event.title, locale) })
              : v === 'event'
                ? undefined
                : t(`typeHints.${v}`),
        }))}
      />

      {forEvent ? (
        <p className="rounded-input border-3 border-ink bg-white p-4 font-bold">
          {t('eventWhen', {
            date: format.dateTime(new Date(event.startsAt), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }),
            time: format.dateTime(new Date(event.startsAt), { hour: 'numeric', minute: '2-digit' }),
          })}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            type="date"
            label={t('date')}
            value={date}
            min={today}
            max={localDate(now + MAX_DAYS_AHEAD * DAY)}
            onChange={(e) => {
              setDate(e.target.value || today);
              setErrors((x) => ({ ...x, date: undefined, time: undefined }));
            }}
            error={
              errors.date ??
              (holiday
                ? t('holiday', { date: dateText(date), note: holiday.note ?? 'none' })
                : undefined)
            }
          />
          <div>
            <label htmlFor={`${formId}-time`} className="mb-1.5 block text-sm font-bold">
              {t('time')}
            </label>
            <select
              id={`${formId}-time`}
              value={time ?? ''}
              disabled={!slots.length}
              aria-invalid={errors.time ? true : undefined}
              onChange={(e) => {
                setTime(e.target.value || null);
                setErrors((x) => ({ ...x, time: undefined }));
              }}
              className="min-h-12 w-full rounded-input border-3 border-ink bg-white px-4 py-3 text-base text-ink disabled:bg-paper disabled:text-muted"
            >
              <option value="">{slots.length ? t('pickTime') : t('noSlots')}</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {timeText(s)}
                </option>
              ))}
            </select>
            {errors.time && (
              <p role="alert" className="mt-1.5 text-sm font-medium">
                <span aria-hidden="true" className="me-1 text-orange-deep">
                  !
                </span>
                {errors.time}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-sm font-bold">{t('guests')}</p>
        <Stepper value={Math.min(guests, maxGuests)} onChange={setGuests} min={1} max={maxGuests} />
        {forEvent && event.spotsLeft !== null && (
          <p className="mt-1.5 text-sm text-muted">{t('guestsMax', { max: maxGuests })}</p>
        )}
      </div>

      <Input
        label={t('name')}
        autoComplete="name"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <PhoneInput value={phone} onChange={setPhone} error={errors.phone} />
      <TextArea
        label={t('note')}
        optionalLabel={tc('optional')}
        placeholder={t('notePlaceholder')}
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
      />
      <Turnstile />
      {create.error && (
        <p
          role="alert"
          className="flex gap-2 rounded-input border-3 border-ink bg-white p-3 font-bold"
        >
          <span aria-hidden="true" className="text-orange-deep">
            !
          </span>
          {message(create.error)}
        </p>
      )}
      <Button type="submit" size="lg" block loading={create.isPending}>
        {t('submit')}
      </Button>
    </form>
  );
}
