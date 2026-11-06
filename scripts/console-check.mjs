// Prints console errors (e.g. React hydration mismatches #418/#423/#425) per page on a running server.
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3300';
const paths = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ['/', '/menu', '/checkout', '/deals'];
const browser = await chromium.launch();
for (const path of paths) {
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 300)));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log(path, errs.length ? errs : 'clean');
  await page.close();
}
await browser.close();
