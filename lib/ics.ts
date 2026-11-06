/**
 * Minimal iCalendar (RFC 5545) file for a confirmed booking. Local date/time are Asia/Karachi
 * (UTC+5, no DST) and written as UTC.
 */
const utc = (ms: number) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');

export interface IcsEvent {
  uid: string;
  title: string;
  /** Local "YYYY-MM-DD" and "HH:MM" in Asia/Karachi. */
  date: string;
  time: string;
  durationMinutes?: number;
  location?: string;
  description?: string;
}

export function buildIcs(e: IcsEvent, now = Date.now()): string {
  const start = Date.parse(`${e.date}T${e.time}:00+05:00`);
  const end = start + (e.durationMinutes ?? 120) * 60_000;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barraf Paani//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${e.uid}@barrafpaani`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
