import { expect, test, type Page } from '@playwright/test';
import { open, staffLogin } from './helpers';

/**
 * QA audit (Part B §2): no horizontal page scroll on any page at 360 / 390 / 768 / 1440 in
 * English and Urdu (RTL). Runs once (desktop project); it sets its own viewports.
 */
const WIDTHS = [360, 390, 768, 1440];
const SITE = [
  '/',
  '/menu',
  '/item/fillet-fury',
  '/cart',
  '/checkout',
  '/deals',
  '/about',
  '/contact',
  '/faq',
  '/track',
  '/login',
  '/privacy',
  '/terms',
  '/refunds',
];
const STAFF = [
  'orders',
  'orders/new',
  'bookings',
  'deals',
  'menu',
  'promos',
  'zones',
  'customers',
  'refunds',
  'riders',
  'reviews',
  'notifications',
  'reports',
  'settings',
  'kitchen',
].map((p) => `/admin/${p}`);

async function overflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.beforeEach(() =>
  test.skip(test.info().project.name !== 'desktop', 'viewport sweep runs once'),
);

for (const locale of ['en', 'ur'] as const) {
  test(`customer pages fit every width (${locale})`, async ({ page, context }) => {
    test.setTimeout(300_000);
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: locale, url: 'http://localhost:3100' },
    ]);
    await open(page, '/');
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const path of SITE) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        expect.soft(await overflow(page), `${path} @ ${w}px (${locale})`).toBeLessThanOrEqual(0);
      }
    }
  });

  test(`staff pages fit every width (${locale})`, async ({ page, context }) => {
    test.setTimeout(300_000);
    await staffLogin(page, 'owner', 'admin_demo');
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: locale, url: 'http://localhost:3100' },
    ]);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const path of STAFF) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        expect.soft(await overflow(page), `${path} @ ${w}px (${locale})`).toBeLessThanOrEqual(0);
      }
    }
  });
}
