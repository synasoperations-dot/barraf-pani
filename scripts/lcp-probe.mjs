// Observed (unthrottled) FCP and every LCP candidate on a page, to see what paints late and why.
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:3300/menu';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
await page.addInitScript(() => {
  window.__lcp = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries())
      window.__lcp.push({
        t: Math.round(e.startTime),
        size: e.size,
        el: e.element ? `${e.element.tagName}.${String(e.element.className).slice(0, 60)}` : e.url,
      });
  }).observe({ type: 'largest-contentful-paint', buffered: true });
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => ({
  fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1),
  lcp: window.__lcp,
  vt: [...document.querySelectorAll('*')].filter(
    (e) =>
      getComputedStyle(e).viewTransitionName && getComputedStyle(e).viewTransitionName !== 'none',
  ).length,
}));
console.log(JSON.stringify(out, null, 1));
await browser.close();
