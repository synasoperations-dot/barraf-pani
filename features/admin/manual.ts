/**
 * Manual order entry helpers (pure, unit tested). The tablet never prices anything: these only
 * build intent (item / variant / modifiers / qty); the server quote is the total (§0.1, §2.4).
 */
import type { AdminOrder, CartLine, Locale } from '@/lib/contracts';

const sameLine = (a: CartLine, b: CartLine) =>
  a.itemId === b.itemId &&
  a.variantId === b.variantId &&
  a.note === b.note &&
  [...a.modifierIds].sort().join() === [...b.modifierIds].sort().join();

/** Adding the same item + variant + add-ons again bumps the qty (max 50) instead of a new line. */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const i = lines.findIndex((l) => sameLine(l, line));
  if (i === -1) return [...lines, line];
  return lines.map((l, j) => (j === i ? { ...l, qty: Math.min(50, l.qty + line.qty) } : l));
}

export const setQty = (lines: CartLine[], index: number, qty: number) =>
  qty <= 0
    ? lines.filter((_, i) => i !== index)
    : lines.map((l, i) => (i === index ? { ...l, qty } : l));

/** "Repeat last order": the previous order's intent, re-quoted at today's prices. */
export const repeatLines = (order: AdminOrder): CartLine[] =>
  order.lines.map((l) => ({
    itemId: l.itemId,
    variantId: l.variantId,
    modifierIds: l.modifiers.map((m) => m.id),
    qty: l.qty,
    note: l.note,
  }));

/** Prefilled WhatsApp text with the tracking link, in the customer's language. */
export function trackingMessage(
  locale: Locale,
  p: { name: string | null; number: string; url: string },
) {
  const name = p.name?.trim();
  if (locale === 'ur')
    // REVIEW: machine-drafted Urdu. Number and link wrapped in LTR isolates.
    return `${name ? `${name}، ` : ''}آپ کا برف پانی آرڈر ⁦${p.number}⁩ مل گیا ہے۔ یہاں لائیو دیکھیں: ⁦${p.url}⁩`;
  return `${name ? `Hi ${name}! ` : ''}Your Barraf Paani order ${p.number} is in. Track it live: ${p.url}`;
}
