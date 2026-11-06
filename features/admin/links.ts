/** Contact + export helpers for staff screens (pure, unit tested). */

/** "+923001234567" → "923001234567" (wa.me wants digits only). */
export const waDigits = (e164: string) => e164.replace(/\D/g, '');

export const waLink = (e164: string, text?: string) =>
  `https://wa.me/${waDigits(e164)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const telLink = (e164: string) => `tel:${e164.replace(/[^\d+]/g, '')}`;

/** "Open in Maps" for the rider: a Google Maps search on the pin (works in every maps app). */
export const mapsLink = ({ lat, lng }: { lat: number; lng: number }) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** RFC 4180 CSV: quotes fields with commas, quotes or newlines; CRLF rows. */
export function toCsv(rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    // A leading = + - @ would run as a formula in Excel: prefix with a quote (CSV injection).
    const safe = /^[=+\-@]/.test(s) && typeof v === 'string' ? `'${s}` : s;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

/** Saves text as a file in the browser (CSV export). */
export function downloadText(fileName: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
}
