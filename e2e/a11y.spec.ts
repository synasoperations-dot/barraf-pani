import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { go, open, staffLogin } from './helpers';

/** QA Part B §3: WCAG 2.1 AA scan (axe), focus trap, keyboard-only ordering and board. */

async function axe(page: Page, label: string) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('nextjs-portal') // the dev-only Next.js overlay
    .exclude('[data-mock-panel]') // the dev-only scenario panel
    .analyze();
  const bad = r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`);
  expect.soft(bad, label).toEqual([]);
}

test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'scan runs once'));

test('axe: customer pages', async ({ page }) => {
  test.setTimeout(240_000);
  await open(page, '/menu');
  await page
    .getByRole('button', { name: /add Fillet Fury$/ })
    .first()
    .click();
  for (const p of [
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
  ]) {
    await go(page, p);
    await axe(page, p);
  }
});

test('axe: staff pages', async ({ page }) => {
  test.setTimeout(240_000);
  await staffLogin(page, 'owner', 'admin_demo');
  for (const p of [
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
  ]) {
    await go(page, `/admin/${p}`);
    await axe(page, `/admin/${p}`);
  }
});

test('sheets trap focus, close on Esc and give focus back', async ({ page }) => {
  await open(page, '/menu');
  const opener = page.getByRole('link', { name: 'Fillet Fury' }).first();
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    // The page behind is inert: focus is inside the modal, or briefly on the browser chrome
    // (document.body in headless) between the last and first control, never on the page.
    const where = await dialog.evaluate((d) =>
      d.contains(document.activeElement)
        ? 'dialog'
        : document.activeElement === document.body
          ? 'chrome'
          : 'page',
    );
    expect(where).not.toBe('page');
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  // Focus goes back to the control that opened the sheet.
  await expect(page.locator(':focus')).toHaveAccessibleName(/Fillet Fury/);
});

test('keyboard only: add from the menu, check out, place', async ({ page }) => {
  await open(page, '/menu');
  const add = page.getByRole('button', { name: /add Fillet Fury$/ }).first();
  await add.focus();
  await page.keyboard.press('Enter');
  const fries = page.getByRole('button', { name: /add Long Fries$/ }).first();
  await fries.focus();
  await page.keyboard.press('Enter');
  await go(page, '/checkout');
  await page.getByLabel('Your name').focus();
  await page.keyboard.type('Keyboard User');
  await page.getByLabel('Phone number').first().focus();
  await page.keyboard.type('03001234567');
  const pickup = page.getByRole('main').getByRole('radio', { name: 'Pickup' }).first();
  await pickup.focus();
  await page.keyboard.press('Space');
  await expect(pickup).toBeChecked();
  const cash = page.getByRole('main').getByRole('radio', { name: /^Cash/ }).first();
  await cash.focus();
  await page.keyboard.press('Space');
  await expect(cash).toBeChecked();
  await page.getByRole('button', { name: 'Send code' }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Digit 1 of 6').focus();
  await page.keyboard.type('123456');
  await expect(page.getByText('Verified')).toBeVisible();
  await page.getByRole('button', { name: 'Place order' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/order\/[0-9a-f]{32}/);
});

test('keyboard only: board tabs with arrow keys, accept with a prep time', async ({ page }) => {
  await staffLogin(page, 'owner', 'admin_demo');
  const board = page.getByRole('tab', { name: /^Board/ });
  await board.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Awaiting payment/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('ArrowLeft');
  await expect(board).toHaveAttribute('aria-selected', 'true');
  const accept = page.getByRole('button', { name: 'Accept' }).first();
  await accept.focus();
  await page.keyboard.press('Enter');
  const ten = page.getByRole('dialog').getByRole('button', { name: /10\s*min/ });
  await ten.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start preparing' }).first()).toBeVisible();
});

test('reduced motion: animations collapse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await staffLogin(page, 'owner', 'admin_demo');
  const flashing = page.locator('.animate-flash, [class*="motion-safe:animate-flash"]').first();
  if (await flashing.count()) {
    const d = await flashing.evaluate((el) => getComputedStyle(el).animationName);
    expect(d === 'none' || d === '').toBe(true);
  }
});
