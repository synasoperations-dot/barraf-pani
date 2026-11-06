// JS budget check (§2.5): compressed JavaScript each page downloads on first load, and which
// heavy libraries it pulls in. Run against a production server:
//   MOCK_API=server pnpm build && MOCK_API=server pnpm start --port 3300
//   node scripts/js-budget.mjs http://localhost:3300
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:3300';
const pages = [
  '/',
  '/menu',
  '/checkout',
  '/deals',
  '/track/0123456789abcdef0123456789abcdef',
  '/admin/login',
];
const LIBS = {
  gsap: /GreenSock|gsap\.registerPlugin|_gsap/,
  chartjs: /Chart\.js v|chartjs-|\bChart\.register\b/,
  framer: /framer-motion|motionValue/,
  msw: /mockServiceWorker|setupWorker/,
};

const browser = await chromium.launch();
const rows = [];
for (const path of pages) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const scripts = new Map();
  page.on('response', async (r) => {
    if (r.request().resourceType() !== 'script') return;
    try {
      const body = await r.text();
      const len = Number(r.headers()['content-length'] ?? 0);
      scripts.set(r.url(), { body, encoded: len });
    } catch {}
  });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  const transfer = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => e.initiatorType === 'script')
      .reduce((s, e) => s + (e.encodedBodySize || 0), 0),
  );
  const libs = Object.entries(LIBS)
    .filter(([, re]) => [...scripts.values()].some((s) => re.test(s.body)))
    .map(([k]) => k);
  rows.push({
    path,
    kbGzip: Math.round(transfer / 1024),
    scripts: scripts.size,
    libs: libs.join(',') || '-',
  });
  await ctx.close();
}
await browser.close();
console.table(rows);
