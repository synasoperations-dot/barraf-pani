import { expect, test, type Page } from '@playwright/test';
import { go, open, staffLogin, typeCode } from './helpers';

/*
 * Staff flows. Customer and staff pages share ONE browser context, so they share the mock DB in
 * localStorage (like two tabs of the same browser): staff actions drive the customer's screen.
 */

const db = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('bp-mock-db-v4') ?? '{}'));

async function customerOrder(page: Page, items = ['Fillet Fury', 'Long Fries']) {
  await open(page, '/menu');
  for (const name of items)
    await page
      .getByRole('button', { name: new RegExp(`add ${name}( \\(.+\\))?$`) }) // "(Regular)" on variant chips
      .first()
      .click();
  await go(page, '/checkout');
  const main = page.getByRole('main');
  await page.getByLabel('Your name').fill('E2E Live');
  await page.getByLabel('Phone number').first().fill('0300 7654321');
  await main.getByRole('radio', { name: 'Pickup' }).first().check({ force: true });
  await main.getByRole('radio', { name: /^Cash/ }).first().check({ force: true });
  // First order from this number asks for OTP; later ones in the same session don't.
  const send = page.getByRole('button', { name: 'Send code' });
  await page.waitForTimeout(500); // the quote (debounced) decides whether OTP is needed
  await page.waitForLoadState('networkidle');
  if (await send.isVisible()) {
    await send.click();
    await typeCode(page);
  }
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL(/\/order\/[0-9a-f]{32}/);
  const token = page.url().match(/order\/([0-9a-f]{32})/)![1]!;
  await go(page, `/track/${token}`);
  return token;
}

test('11. new order alert → accept → the customer comic strip updates; version conflict; auto-reject', async ({
  context,
}) => {
  test.setTimeout(100_000);
  const staff = await context.newPage();
  await staffLogin(staff, 'owner');
  const customer = await context.newPage();
  await customerOrder(customer);

  // The board picks it up live: flashing New card, tab title badge.
  await staff.bringToFront();
  const card = staff.getByRole('article').filter({ hasText: 'Auto-reject in' }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(staff).toHaveTitle(/^\(1\) New order/);
  await card.getByRole('button', { name: 'Accept' }).click();
  await staff.getByRole('button', { name: /15\s*min/ }).click();
  await staff.getByRole('button', { name: 'Start preparing' }).first().click();
  // Staff action → customer's comic strip moves (realtime/polling between the two pages).
  await expect(customer.getByText(/Cooking it furious/i).first()).toBeVisible({ timeout: 30_000 });

  // Version conflict: another tablet got there first → toast + fresh card, no crash.
  await open(staff, '/admin/orders', 'version_conflict');
  await staff.getByRole('button', { name: 'Mark ready' }).first().click();
  await expect(staff.getByText('Someone else just updated this order. Refreshed.')).toBeVisible();

  // Auto-reject: a placed order older than 8 minutes is rejected by the system job.
  // (A different cart, so it isn't the "place it again?" duplicate.)
  await customerOrder(customer, ['Crunch Kick', 'Masala Fries']);
  await staff.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('bp-mock-db-v4')!);
    const rec = d.orders.find((o: { order: { status: string } }) => o.order.status === 'placed');
    rec.order.createdAt = new Date(Date.now() - 8.5 * 60_000).toISOString();
    localStorage.setItem('bp-mock-db-v4', JSON.stringify(d));
  });
  await go(staff, '/admin/orders');
  await staff.getByRole('tab', { name: /Cancelled/ }).click();
  await expect(staff.getByText('Auto-rejected: not accepted in time').first()).toBeVisible({
    timeout: 20_000,
  });
});

test('12. rider: picked up → delivered with cash → settlement shows it → mark settled', async ({
  page,
}) => {
  await staffLogin(page, 'rider', 'admin_demo');
  await page.getByRole('button', { name: 'Picked up' }).click();
  await page.getByRole('button', { name: 'Delivered', exact: true }).click();
  const amount = (await page.getByRole('dialog').innerText())
    .match(/RS ([\d,]+)/i)![1]!
    .replace(/,/g, '');
  await page.getByRole('button', { name: 'Yes, cash collected' }).click();
  await expect(page.getByText(/delivered$/).first()).toBeVisible();

  await staffLogin(page, 'owner', 'admin_demo');
  await go(page, '/admin/riders');
  const panel = page.locator('section', { hasText: 'Cash to settle' });
  const open = (await panel.locator('.font-price').first().innerText()).replace(/\D/g, '');
  expect(Number(open)).toBeGreaterThanOrEqual(Number(amount));
  await panel.getByRole('button', { name: 'Mark settled' }).click();
  await page.getByLabel(/Type .* to confirm/).fill(open);
  await page.getByRole('dialog').getByRole('button', { name: 'Mark settled' }).click();
  await expect(page.getByText(/cash settled/)).toBeVisible();
  await expect(panel.getByText('No cash waiting')).toBeVisible();
});

test('13. kitchen: customer phone numbers are masked', async ({ page }) => {
  await staffLogin(page, 'kitchen', 'admin_demo');
  await expect(page.getByRole('heading', { level: 1, name: 'Kitchen' })).toBeVisible();
  await expect(page.getByText(/•••/).first()).toBeVisible();
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\+92\d{10}|03\d{2} \d{7}/);
});

test('14. cashier enters a WhatsApp repeat order in under 30 s; WHATSAPP label everywhere; tracking link', async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  await staffLogin(page, 'cashier', 'admin_demo');
  await go(page, '/admin/orders/new');
  const started = Date.now();
  await page.getByLabel('Customer phone').fill('0301 2000000'); // a seeded returning customer
  await page.getByRole('button', { name: /Repeat last order/ }).click();
  await page.getByRole('button', { name: 'Place order' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: /Order BP-\d+ created/ })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(30_000);
  const number = (await sheet.getByRole('heading').innerText()).match(/BP-\d+/)![0];
  const message = await sheet.locator('p[lang]').innerText();
  const trackUrl = message.match(/https?:\/\/\S+\/track\/[0-9a-f]{32}/)![0];
  await expect(sheet.getByRole('link', { name: 'Send tracking link on WhatsApp' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/92/,
  );

  // KOT print: stub the dialog and read what went to #print-root.
  await sheet.getByRole('button', { name: 'Next order' }).click();
  await go(page, '/admin/orders');
  const card = page.getByRole('article').filter({ hasText: number });
  await expect(card.getByText('WhatsApp').first()).toBeVisible();
  await expect(card.getByText('Entered by you')).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __kot: string }).__kot = '';
    window.print = () => {
      (window as unknown as { __kot: string }).__kot =
        document.getElementById('print-root')!.innerText;
    };
  });
  await card.getByRole('button', { name: 'Print KOT' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __kot: string }).__kot))
    .toMatch(new RegExp(`${number}[\\s\\S]*WHATSAPP`, 'i'));

  // Kitchen ticket shows the source too.
  await staffLogin(page, 'kitchen', 'admin_demo');
  await expect(page.locator('button', { hasText: number }).getByText('WhatsApp')).toBeVisible();

  // The tracking link opens the comic strip.
  const customer = await context.newPage();
  await go(customer, new URL(trackUrl).pathname);
  await expect(customer.getByText(number).first()).toBeVisible();
  await expect(customer.getByText(/Order received/i).first()).toBeVisible();
});

test('15. bookings: request → confirm → status page; over capacity warning; decline reason', async ({
  context,
}) => {
  const customer = await context.newPage();
  await open(customer, '/deals');
  await customer.getByRole('button', { name: 'Book a table' }).first().click();
  const dialog = customer.getByRole('dialog');
  const tomorrow = new Date(Date.now() + 5 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
  await dialog.getByLabel('Date').fill(tomorrow);
  await dialog.getByLabel('Time').selectOption({ index: 1 });
  await dialog.getByLabel('Your name').fill('E2E Booker');
  await dialog.getByLabel('Phone number').fill('0300 5550001');
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await dialog.getByRole('link', { name: 'See booking status' }).click();
  await customer.waitForURL(/\/booking\/[0-9a-f]{32}/);
  await expect(customer.getByText('Requested').first()).toBeVisible();

  const staff = await context.newPage();
  await staffLogin(staff, 'cashier', 'admin_demo');
  await go(staff, '/admin/bookings');
  const mine = staff.getByRole('article').filter({ hasText: 'E2E Booker' });
  await mine.getByRole('button', { name: 'Confirm' }).click();
  await expect(customer.getByText('Confirmed!').first()).toBeVisible({ timeout: 30_000 });

  // Event request that would go over capacity (20 confirmed of 30, asking for 12).
  const over = staff.getByRole('article').filter({ hasText: 'Bilal (demo)' });
  await over.getByRole('button', { name: 'Confirm' }).click();
  await expect(staff.getByRole('heading', { name: 'Over capacity' })).toBeVisible();
  await staff.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();

  // Decline with a reason; the customer sees it.
  const ayesha = staff.getByRole('article').filter({ hasText: 'Ayesha (demo)' });
  await ayesha.getByRole('button', { name: 'Decline' }).click();
  await staff.getByRole('dialog').getByLabel('Reason').fill('Fully booked tonight');
  await staff.getByRole('dialog').getByRole('button', { name: 'Decline' }).click();
  const token = (await db(staff)).bookings.find((b: { name: string }) => b.name === 'Ayesha (demo)')
    .publicToken as string;
  await go(customer, `/booking/${token}`);
  await expect(customer.getByText('Reason: Fully booked tonight')).toBeVisible();
});
