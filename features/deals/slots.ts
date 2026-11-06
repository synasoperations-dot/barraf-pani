/**
 * Booking time slots for a local date: every 30 min inside the opening window(s) that OPEN on
 * that date (a past-midnight window belongs to the day it opened, like is_store_open §5.9).
 * Pure (unit tested). The server re-validates (mocks: VALIDATION_FAILED on date/time).
 */
import type { Holiday, OpeningHours } from '@/lib/contracts';
import { windowsBetween } from '@/features/store/hours';

const STEP = 30 * 60_000;
const PKT = 5 * 3_600_000;

/** "HH:MM" local (Asia/Karachi) of an instant. */
export const localTime = (at: number) => new Date(at + PKT).toISOString().slice(11, 16);

/** Slots ("HH:MM") for `date`; the last is 30 min before closing; past ones (with lead) dropped. */
export function bookingSlots(
  hours: OpeningHours[],
  date: string,
  now: number,
  leadMinutes = 30,
): string[] {
  const dayStart = Date.parse(`${date}T00:00:00+05:00`);
  const earliest = now + leadMinutes * 60_000;
  return windowsBetween(hours, dayStart, dayStart + 86_400_000 - 1)
    .filter((w) => w.date === date)
    .flatMap((w) => {
      const out: string[] = [];
      for (let t = w.start; t <= w.end - STEP; t += STEP) if (t >= earliest) out.push(localTime(t));
      return out;
    });
}

export const isHoliday = (holidays: Holiday[], date: string) =>
  holidays.some((h) => h.date === date);
