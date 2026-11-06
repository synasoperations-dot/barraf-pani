/**
 * /llms.txt and /llms-full.txt (llmstxt.org): plain markdown for AI assistants, generated from
 * the same business facts and menu as every page, so the answers can't disagree with the site.
 */
import { hoursLines, type BusinessFacts } from '@/lib/business-facts';
import type { Menu } from '@/lib/contracts';
import { formatAmount } from '@/lib/format';

export function llmsTxt(f: BusinessFacts): string {
  const u = (p: string) => `${f.url}${p}`;
  return [
    `# ${f.name}`,
    '',
    `> ${f.name} is a fast-food restaurant in ${f.address.locality}, ${f.address.city}, ${f.address.region}, Pakistan: fries, loaded fries, burgers, wings, wraps and pizza for delivery or pickup. "${f.tagline}"`,
    '',
    '## Key facts',
    `- Address: ${f.address.full}`,
    `- Phone: ${f.phone} (WhatsApp: ${f.whatsapp})`,
    `- Opening hours (Pakistan time, Asia/Karachi): ${hoursLines(f.openingHours).join('; ') || 'see the website'}`,
    ...(f.holidays.length
      ? [
          `- Closed on: ${f.holidays.map((h) => `${h.date}${h.note ? ` (${h.note})` : ''}`).join(', ')}`,
        ]
      : []),
    `- Delivery: ${f.deliveryArea}`,
    '- Pickup: yes, order online and collect at the counter',
    `- Payment: ${f.payments.join(', ')}`,
    ...(f.priceRange ? [`- Prices: ${f.priceRange} (PKR)`] : []),
    `- Known for: ${f.knownFor.join(', ')}`,
    `- Cuisine: ${f.cuisine.join(', ')}`,
    '- Table bookings, event bookings and private events/catering: request online, confirmed by WhatsApp/SMS',
    `- Menu categories: ${f.categories.join(', ')}`,
    '',
    '## Pages',
    `- [Menu](${u('/menu')}): every item and price, order online`,
    `- [Full menu as text](${u('/llms-full.txt')})`,
    `- [Deals & Events](${u('/deals')}): current deals, events and table booking`,
    `- [Visit & contact](${u('/contact')}): address, hours, directions, contact form`,
    `- [FAQ](${u('/faq')}): ordering, delivery, payments, pre-orders, cancellations`,
    `- [About](${u('/about')}): the spot and Barraf Paani at a glance`,
    '',
  ].join('\n');
}

export function llmsFullTxt(f: BusinessFacts, menu: Menu | null): string {
  const lines = [llmsTxt(f), '## Full menu (prices in PKR, whole rupees)', ''];
  if (!menu)
    return [...lines, `The menu is temporarily unavailable here; see ${f.url}/menu.`, ''].join(
      '\n',
    );
  const cats = menu.categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  for (const c of cats) {
    const items = menu.items
      .filter((i) => i.isActive && i.categoryId === c.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (!items.length) continue;
    lines.push(`### ${c.name.en}`);
    for (const i of items) {
      const prices = i.variants
        .filter((v) => v.isAvailable)
        .map((v) =>
          i.variants.length > 1
            ? `${v.name} Rs ${formatAmount(v.price)}`
            : `Rs ${formatAmount(v.price)}`,
        )
        .join(' / ');
      lines.push(`- ${i.name.en}: ${prices}${i.description ? `. ${i.description.en}` : ''}`);
    }
    lines.push('');
  }
  lines.push(
    'Prices are confirmed at checkout. Delivery fee and minimum order depend on the delivery area.',
    '',
  );
  return lines.join('\n');
}
