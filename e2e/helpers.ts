import { expect, type Page } from '@playwright/test';

export type Role = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'rider';

/** Mock test values (docs/API_CONTRACT.md "Mocks"): password barraf123, TOTP / OTP 123456. */
export const PASSWORD = 'barraf123';
export const CODE = '123456';

/** Open a page under a mock scenario. The scenario sticks for the tab (sessionStorage). */
export async function open(page: Page, path: string, scenario = 'happy') {
  const url = `${path}${path.includes('?') ? '&' : '?'}scenario=${scenario}`;
  await go(page, url);
}

/**
 * Navigate and wait until the page is usable. In mock mode the providers render nothing until
 * the MSW worker intercepts (components/dev/MswBootstrap), so every navigation waits for that.
 */
export async function go(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, {
    timeout: 30_000,
  });
  await page.waitForFunction(() => (document.querySelector('main')?.childElementCount ?? 0) > 0);
  await page.waitForLoadState('networkidle');
}

/** Fresh mock DB for this browser context. */
export async function resetMocks(page: Page) {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('bp-'))
      .forEach((k) => localStorage.removeItem(k));
  });
}

export async function typeCode(page: Page, code = CODE) {
  const first = page.getByLabel('Digit 1 of 6');
  await first.click();
  await page.keyboard.type(code);
}

/** Staff login through the real screen (incl. 2FA for owner; manager enrols). */
export async function staffLogin(page: Page, role: Role, scenario = 'happy') {
  await open(page, '/admin/login', scenario);
  await page.getByLabel('Email').fill(`${role}@barrafpaani.test`);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  if (role === 'owner' || role === 'manager') {
    await expect(
      page.getByRole('heading', { name: /Enter your code|Set up 2-step/ }),
    ).toBeVisible();
    await typeCode(page);
    if (role === 'manager') {
      await page.getByLabel("I've saved these codes somewhere safe").check();
      await page.getByRole('button', { name: 'Continue' }).click();
    }
  }
  await page.waitForURL(
    role === 'kitchen'
      ? /\/admin\/kitchen/
      : role === 'rider'
        ? /\/admin\/rider/
        : /\/admin\/orders/,
  );
}

/** Collect console errors (fails the smoke tests on any). */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|favicon|\[MSW\]/.test(m.text()))
      errors.push(m.text());
  });
  return errors;
}
