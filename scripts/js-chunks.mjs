// Biggest JS chunks on one page, with a hint of what's inside. node scripts/js-chunks.mjs <url>
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:3300/menu';
const HINTS = [
  'react-dom',
  'next-intl',
  'zod',
  '@tanstack',
  'zustand',
  'framer-motion',
  'gsap',
  'chart.js',
  'msw',
  'react-hook-form',
  'intl-messageformat',
  'use-intl',
  'messages',
  'Nastaliq',
];
const browser = await chromium.launch();
const page = await browser.newPage();
const bodies = new Map();
page.on('response', async (r) => {
  if (r.request().resourceType() === 'script') bodies.set(r.url(), await r.text().catch(() => ''));
});
await page.goto(url, { waitUntil: 'networkidle' });
const sizes = await page.evaluate(() =>
  performance
    .getEntriesByType('resource')
    .filter((e) => e.initiatorType === 'script')
    .map((e) => [e.name, e.encodedBodySize, e.decodedBodySize]),
);
await browser.close();
const rows = sizes
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([name, enc, dec]) => {
    const body = bodies.get(name) ?? '';
    const hits = HINTS.filter((h) => body.includes(h))
      .slice(0, 4)
      .join(',');
    const sample = (body.match(/"(?:[a-z]{4,} ){3}[a-z]{4,}/i)?.[0] ?? '').slice(0, 40);
    return {
      file: name.split('/').pop(),
      gz: Math.round(enc / 1024),
      raw: Math.round(dec / 1024),
      hits,
      sample,
    };
  });
console.table(rows);
