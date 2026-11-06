/**
 * Opening-hours maths in the store timezone (Asia/Karachi, UTC+5, no DST). Mirrors the backend's
 * is_store_open (§5.9): `closes < opens` means the window runs past midnight into the next day.
 * Pure functions so they can be unit tested; the server still validates every scheduled time.
 */
import type { OpeningHours } from '@/lib/contracts';

const PKT_OFFSET_MS = 5 * 3_600_000;
const DAY_MS = 86_400_000;

const minutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Local (PKT) calendar date "YYYY-MM-DD" of an instant. */
export const localDate = (at: number) => new Date(at + PKT_OFFSET_MS).toISOString().slice(0, 10);

/** UTC instant of a local date + minutes-after-midnight. */
const instant = (date: string, mins: number) =>
  Date.parse(`${date}T00:00:00Z`) - PKT_OFFSET_MS + mins * 60_000;

export interface Window {
  /** Local date the window opens on. */
  date: string;
  start: number;
  end: number;
}

/** Every opening window that overlaps [from, to], in order (past-midnight windows included). */
export function windowsBetween(hours: OpeningHours[], from: number, to: number): Window[] {
  const out: Window[] = [];
  // Start a day early so a window that opened yesterday and runs past midnight is included.
  for (let d = -1; ; d++) {
    const date = localDate(from + d * DAY_MS);
    const dayStart = instant(date, 0);
    if (dayStart > to) break;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    for (const h of hours.filter((x) => x.weekday === weekday)) {
      const open = minutes(h.opens);
      let close = minutes(h.closes);
      if (close <= open) close += 24 * 60; // past midnight
      const start = instant(date, open);
      const end = instant(date, close);
      if (end > from && start <= to) out.push({ date, start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export const isOpenAt = (hours: OpeningHours[], at: number) =>
  windowsBetween(hours, at, at).some((w) => at >= w.start && at < w.end);

export interface SlotDay {
  /** Local date "YYYY-MM-DD" the slots belong to (by the slot's own local date). */
  date: string;
  /** ISO instants. */
  slots: string[];
}

/**
 * Pre-order slots: every `stepMinutes` inside opening hours, starting `leadMinutes` from now,
 * up to `maxDays` ahead (PREORDER_INVALID rules, §4.1). Slot times are rounded to the step.
 * The last slot of a window is `step` minutes before it closes.
 */
export function preorderSlots({
  hours,
  now,
  maxDays,
  stepMinutes = 30,
  leadMinutes = 45,
  holidays = [],
}: {
  hours: OpeningHours[];
  now: number;
  maxDays: number;
  stepMinutes?: number;
  leadMinutes?: number;
  /** Local dates with no service. A past-midnight window belongs to the day it opened. */
  holidays?: string[];
}): SlotDay[] {
  const step = stepMinutes * 60_000;
  const from = now + leadMinutes * 60_000;
  const to = now + maxDays * DAY_MS;
  const days = new Map<string, string[]>();
  for (const w of windowsBetween(hours, from, to)) {
    if (holidays.includes(w.date)) continue;
    for (let t = Math.ceil(Math.max(w.start, from) / step) * step; t <= w.end - step; t += step) {
      if (t > to) break;
      const date = localDate(t);
      days.set(date, [...(days.get(date) ?? []), new Date(t).toISOString()]);
    }
  }
  return [...days].map(([date, slots]) => ({ date, slots }));
}

/** COD is refused for pre-orders more than `codMaxHours` out (COD_NOT_ALLOWED preorder_too_far). */
export const codAllowedFor = (scheduledFor: string | null, now: number, codMaxHours: number) =>
  scheduledFor === null || Date.parse(scheduledFor) - now <= codMaxHours * 3_600_000;

export interface HoursRow {
  /** Weekdays (0 = Sunday) sharing this window, Monday-first order. */
  weekdays: number[];
  opens: string;
  closes: string;
  /** Closes after midnight (e.g. 12:00–02:00). */
  overnight: boolean;
}

/** Group consecutive days with the same window for display ("Mon–Thu 12:00–23:30"). */
export function groupHours(hours: OpeningHours[]): HoursRow[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: HoursRow[] = [];
  for (const weekday of order) {
    for (const h of hours.filter((x) => x.weekday === weekday)) {
      const last = rows.at(-1);
      const prevDay = last?.weekdays.at(-1);
      const consecutive =
        prevDay !== undefined && order.indexOf(prevDay) === order.indexOf(weekday) - 1;
      if (last && consecutive && last.opens === h.opens && last.closes === h.closes)
        last.weekdays.push(weekday);
      else
        rows.push({
          weekdays: [weekday],
          opens: h.opens,
          closes: h.closes,
          overnight: minutes(h.closes) <= minutes(h.opens),
        });
    }
  }
  return rows;
}
