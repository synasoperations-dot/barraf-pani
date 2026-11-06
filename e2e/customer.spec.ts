import { expect, test, type Page } from '@playwright/test';
import { go, open, typeCode } from './helpers';

const PHONE = '0300 1234567';
const INNER = { lat: '31.27', lng: '72.32' };

async function addFromMenu(page: Page, names: string[]) {
  for (const name of names) {
    await page
      .getByRole('button', { name: new RegExp(`add ${name}( \\(.+\\))?$`) }) // "(Regular)" on variant chips
      .first()
      .click();
  }
}

async function contact(page: Page, phone = PHONE) {
  await go(page, '/checkout');
  await page.getByLabel('Your name').fill('E2E Guest');
  await page.getByLabel('Phone number').first().fill(phone);
}

async function verifyOtp(page: Page) {
  await page.getByRole('button', { name: 'Send code' }).click();
  await typeCode(page);
  await expect(page.getByText('Verified')).toBeVisible();
}

const main = (page: Page) => page.getByRole('main');
const pickup = (page: Page) =>
  main(page).getByRole('radio', { name: 'Pickup' }).first().check({ force: true });
const cash = (page: Page) => main(page).getByRole('radio', { name: /^Cash/ }).first().check();
const place = (page: Page) => page.getByRole('button', { name: 'Place order' }).click();
const placed = (page: Page) => page.waitForURL(/\/order\/[0-9a-f]{32}/);

/** Mock DB order count (localStorage, shared with the MSW handlers). */
const orderCount = (page: Page) =>
  page.evaluate(
    () => (JSON.parse(localStorage.getItem('bp-mock-db-v4') ?? '{}').orders ?? []).length as number,
  );

async function checkoutGuest(page: Page) {
  await contact(page);
  await pickup(page);
  await cash(page);
  await verifyOtp(page);
  await place(page);
  await placed(page);
}

test('1. guest COD order: Fillet Fury + Long Fries + a dip, OTP, tracked to delivered, review', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await open(page, '/menu');
  await addFromMenu(page, ['Fillet Fury', 'Long Fries', 'Ranch']);
  await checkoutGuest(page);
  await page.getByRole('link', { name: 'Track my order' }).first().click();
  await page.waitForURL(/\/track\//);
  // Mock timer: ~8 s per step while no staff are logged in.
  await expect(page.getByRole('heading', { name: /Delivered|Enjoy/ }).first()).toBeVisible({
    timeout: 90_000,
  });
  await page.getByRole('radio', { name: /5 bolts/ }).check({ force: true });
  await page.getByRole('button', { name: 'Send review' }).click();
  await expect(page.getByText('Thanks for the review!')).toBeVisible();
});

test('2. pizza size change; checkout shows the server quote total', async ({ page }) => {
  await open(page, '/item/street-fajita');
  await page.getByRole('radio', { name: /Large/ }).first().check({ force: true });
  await page.getByRole('button', { name: /^Add/ }).last().click();
  await go(page, '/checkout');
  await pickup(page);
  // L · Option A is Rs 1,695: the total line is the server quote (POST /api/cart/quote).
  await expect(main(page).getByText('Total', { exact: true }).first().locator('..')).toContainText(
    '1,695',
  );
});

test('3. sold out mid-checkout: highlighted line removed, then success', async ({ page }) => {
  await open(page, '/menu', 'item_sold_out_mid_checkout');
  await addFromMenu(page, ['Fillet Fury', 'Long Fries', 'Masala Fries']);
  await contact(page);
  await pickup(page);
  await cash(page);
  await verifyOtp(page);
  await expect(main(page).getByText('This one just sold out. Remove it or swap it.')).toBeVisible();
  await main(page).getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(main(page).getByText('This one just sold out. Remove it or swap it.')).toHaveCount(
    0,
  );
  await place(page);
  await placed(page);
});

test('4. outside the zone → switch to pickup → ready → picked up', async ({ page }) => {
  test.setTimeout(150_000);
  await open(page, '/menu', 'outside_zone');
  await addFromMenu(page, ['Fillet Fury', 'Long Fries']);
  await contact(page);
  await main(page).getByRole('radio', { name: 'Delivery' }).first().check({ force: true });
  await page.getByLabel('Latitude').fill(INNER.lat);
  await page.getByLabel('Longitude').fill(INNER.lng);
  await page.getByLabel('Longitude').blur();
  await expect(page.getByText("We don't reach there yet")).toBeVisible();
  await page.getByRole('button', { name: 'Switch to pickup' }).click();
  await cash(page);
  await verifyOtp(page);
  await place(page);
  await placed(page);
  await page.getByRole('link', { name: 'Track my order' }).first().click();
  await expect(page.getByText('Ready at the counter', { exact: false }).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(main(page).getByText('Picked up', { exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
});

test('5a. double tap → one order', async ({ page }) => {
  await open(page, '/menu', 'double_tap');
  await addFromMenu(page, ['Fillet Fury', 'Long Fries']);
  await contact(page);
  await pickup(page);
  await cash(page);
  await verifyOtp(page);
  const before = await orderCount(page);
  await page.getByRole('button', { name: 'Place order' }).dblclick();
  await placed(page);
  expect(await orderCount(page)).toBe(before + 1);
});

test('5b. IN_PROGRESS is retried automatically with the same key', async ({ page }) => {
  await open(page, '/menu', 'in_progress');
  await addFromMenu(page, ['Fillet Fury', 'Long Fries']);
  await checkoutGuest(page);
});

test('5c. same cart again within 3 minutes → "Place it again?" prompt', async ({ page }) => {
  await open(page, '/menu', 'duplicate_cart');
  await addFromMenu(page, ['Fillet Fury', 'Long Fries']);
  await contact(page);
  await pickup(page);
  await cash(page);
  await verifyOtp(page);
  await place(page);
  await expect(page.getByRole('heading', { name: 'Place it again?' })).toBeVisible();
  await page.getByRole('button', { name: 'Place again' }).click();
  await placed(page);
});

test('6. pre-orders: within the rules; >2 h out hides COD; PREORDER_INVALID', async ({ page }) => {
  await open(page, '/menu');
  await addFromMenu(page, ['Fillet Fury', 'Long Fries']);
  await contact(page);
  await pickup(page);
  await main(page)
    .getByRole('radio', { name: /^Schedule/ })
    .check();
  await main(page).locator('fieldset').nth(1).getByRole('radio').nth(1).check({ force: true }); // tomorrow
  await main(page).locator('fieldset').nth(2).getByRole('radio').first().check({ force: true });
  // Tomorrow is more than 2 hours out: cash is off for this slot (§7), with a "sooner" way out.
  await expect(main(page).getByRole('radio', { name: /^Cash/ })).toBeDisabled();
  await expect(main(page).getByRole('button', { name: 'Pick a sooner time' })).toBeVisible();

  await open(page, '/checkout', 'preorder_invalid');
  await main(page)
    .getByRole('radio', { name: /^Schedule/ })
    .check();
  await main(page).locator('fieldset').nth(1).getByRole('radio').nth(1).check({ force: true }); // tomorrow
  await main(page).locator('fieldset').nth(2).getByRole('radio').first().check({ force: true });
  await expect(
    main(page)
      .getByText(/That time doesn't work/)
      .first(),
  ).toBeVisible();
});

async function payOnline(page: Page, scenario: string) {
  await open(page, '/menu', scenario);
  await addFromMenu(page, ['Fillet Fury', 'Long Fries']);
  await contact(page);
  await pickup(page);
  await main(page)
    .getByRole('radio', { name: /^JazzCash/ })
    .check({ force: true });
  await place(page);
  // /pay/redirect → mock gateway → /pay/return ("Confirming payment…").
  await page.waitForURL(/\/pay\/return/, { timeout: 30_000 });
}

test('7a. JazzCash success', async ({ page }) => {
  await payOnline(page, 'payment_success');
  await expect(page.getByText('Payment confirmed!')).toBeVisible({ timeout: 30_000 });
});

test('7b. JazzCash fails → switch to cash on delivery', async ({ page }) => {
  await payOnline(page, 'payment_fail');
  await expect(page.getByText("Payment didn't go through")).toBeVisible({ timeout: 30_000 });
  await page.getByRole('link', { name: 'Switch to cash on delivery' }).click();
  await page.waitForURL(/\/checkout\?payment=cod/);
});

test('7c. JazzCash expires, then a late success re-places the order', async ({ page }) => {
  test.setTimeout(120_000);
  await payOnline(page, 'late_payment_success');
  await expect(page.getByText('Payment window closed')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText('Got it, your order is back on')).toBeVisible({ timeout: 40_000 });
});

test('7d. JazzCash expiry on its own', async ({ page }) => {
  await payOnline(page, 'payment_expired');
  await expect(page.getByText('Payment window closed')).toBeVisible({ timeout: 40_000 });
});

test('8a. store closed: checkout becomes a pre-order', async ({ page }) => {
  await open(page, '/menu', 'store_closed');
  await addFromMenu(page, ['Fillet Fury', 'Long Fries']);
  await go(page, '/checkout');
  await expect(page.getByText(/We're closed right now, so this one's a pre-order\./)).toBeVisible();
});

test('8b. paused with a reason', async ({ page }) => {
  await open(page, '/menu', 'paused');
  await expect(page.getByText(/Kitchen is catching up/).first()).toBeVisible();
  await addFromMenu(page, ['Fillet Fury', 'Long Fries']);
  await go(page, '/checkout');
  await expect(
    page.getByText(/Orders are paused right now, so this one's a pre-order\./),
  ).toBeVisible();
});

test('9. log in → reorder from history', async ({ page }) => {
  await open(page, '/login', 'account_demo');
  await page.getByLabel('Phone number').first().fill(PHONE);
  await page.getByRole('button', { name: /Send code/ }).click();
  await typeCode(page);
  await page.waitForURL(/\/account/);
  await go(page, '/account/orders');
  await page
    .getByRole('button', { name: /Reorder BP-/ })
    .nth(1)
    .click();
  await page
    .getByRole('button', { name: /Add .* to cart|Add to cart/ })
    .last()
    .click();
  await go(page, '/cart');
  await expect(page.getByText(/Crunch Kick/i).first()).toBeVisible();
});

test('10. Urdu RTL smoke of the order flow', async ({ page, context }) => {
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'ur', url: 'http://localhost:3100' }]);
  await open(page, '/menu');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
  await page
    .getByRole('button', { name: /Fillet Fury/ })
    .first()
    .click();
  await go(page, '/checkout');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('16. llms.txt, robots.txt and JSON-LD match the business facts', async ({ page, request }) => {
  const llms = await (await request.get('/llms.txt')).text();
  expect(llms).toMatch(/Barraf Paani/);
  expect(llms).toMatch(/Jhang/);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/admin/);
  expect(robots).toMatch(/Disallow: \/track/);
  expect(robots).toMatch(/GPTBot/);
  for (const path of ['/', '/menu', '/deals', '/faq']) {
    await open(page, path);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length, path).toBeGreaterThan(0);
    const json = blocks.join('\n');
    expect(json, path).toContain('schema.org');
    if (path === '/') {
      expect(json).toContain('Barraf Paani');
      expect(json).toMatch(/Jhang/);
      expect(json).toContain('openingHoursSpecification');
    }
    if (path === '/menu') {
      // Offer prices are the live menu prices (one source of truth).
      const menu = (await (await request.get('/api/menu')).json()) as {
        items: { name: { en: string }; variants: { price: number; isDefault: boolean }[] }[];
      };
      const fury = menu.items.find((i) => i.name.en === 'Fillet Fury')!;
      expect(json).toContain('PKR');
      expect(json).toContain(`"name":"Fillet Fury"`);
      expect(json).toContain(`"price":${fury.variants.find((v) => v.isDefault)!.price}`);
    }
    if (path === '/faq') expect(json).toContain('FAQPage');
  }
});
