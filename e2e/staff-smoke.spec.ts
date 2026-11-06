import { expect, test } from '@playwright/test';
import { go, staffLogin, trackErrors } from './helpers';

const PAGES = [
  ['orders', 'Orders'],
  ['orders/new', 'New order'],
  ['bookings', 'Bookings'],
  ['deals', 'Deals & events'],
  ['menu', 'Menu'],
  ['promos', 'Promos'],
  ['zones', 'Delivery zones'],
  ['customers', 'Customers'],
  ['refunds', 'Refunds'],
  ['riders', 'Riders & cash'],
  ['reviews', 'Reviews'],
  ['notifications', 'Notifications'],
  ['reports', 'Reports'],
  ['settings', 'Settings'],
] as const;

test('every owner page renders without errors (admin_demo)', async ({ page }, info) => {
  const errors = trackErrors(page);
  await staffLogin(page, 'owner', 'admin_demo');
  for (const [path, title] of PAGES) {
    await go(page, `/admin/${path}`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await page.screenshot({
      path: `test-results/smoke-${info.project.name}-${path.replace('/', '-')}.png`,
      fullPage: true,
    });
  }
  await page.goto('/admin/kitchen');
  await expect(page.getByRole('heading', { level: 1, name: 'Kitchen' })).toBeVisible();
  await page.screenshot({
    path: `test-results/smoke-${info.project.name}-kitchen.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('roles: middleware keeps each role in its own section', async ({ page }) => {
  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Forders/);
  await staffLogin(page, 'cashier');
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/admin\/orders$/);
  await page.goto('/admin/kitchen');
  await expect(page).toHaveURL(/\/admin\/orders$/);
});
