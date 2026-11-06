/**
 * Pakistani mobile numbers. People type "0300 1234567", "+92 300-1234567", "923001234567"…
 * The API only ever sees E.164: +923001234567 (§5.4 phone_e164, normalised before every lookup).
 */

/** Any common Pakistani mobile format → "+923XXXXXXXXX", or null if it isn't one. */
export function normalizePkPhone(input: string): string | null {
  const compact = input.trim().replace(/[\s\-().]/g, '');
  const m = /^(?:\+92|0092|92|0)?(3\d{9})$/.exec(compact);
  return m ? `+92${m[1]}` : null;
}

/** "+923001234567" → "0300 1234567" (local display format). */
export function formatPkPhone(e164: string): string {
  const m = /^\+92(3\d{2})(\d{7})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]}` : e164;
}

/** Progressive formatting while typing: keeps digits, groups as "03XX XXXXXXX", max 11 digits. */
export function formatPkPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('92')) digits = `0${digits.slice(2)}`;
  digits = digits.slice(0, 11);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}
