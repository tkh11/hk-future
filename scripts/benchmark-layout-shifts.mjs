import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Diagnostic extension of the 12-second benchmark: distinguish new shifts
// from existing animations that faster loading moves into the initial window.
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const samples = [];
try {
  for (let run = 0; run < 5; run++) {
    for (const [variant, url] of [
      ['baseline', process.env.BASELINE_URL || 'http://localhost:3101'],
      ['current', process.env.BENCHMARK_URL || 'http://localhost:3100'],
    ]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 500000, uploadThroughput: 500000 });
      await page.addInitScript(() => {
        window.__shifts = [];
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shifts.push({
            time: entry.startTime, value: entry.value,
            sources: entry.sources?.map(source => ({
              nodeType: source.node?.nodeType,
              html: (source.node instanceof Element ? source.node.outerHTML : source.node?.parentElement?.outerHTML ?? source.node?.textContent ?? "").slice(0, 1000),
              before: source.previousRect.toJSON(), after: source.currentRect.toJSON(),
            })),
          });
        }).observe({ type: 'layout-shift', buffered: true });
      });
      const started = Date.now();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(Math.max(0, 20000 - (Date.now() - started)));
      const result = await page.evaluate(() => ({
        shifts: window.__shifts,
        logo: document.querySelector('[data-logo-state]')?.outerHTML,
        videos: [...document.querySelectorAll('.park-banner video')].map(video => ({ time: video.currentTime, paused: video.paused })),
      }));
      const cls12 = result.shifts.filter(shift => shift.time <= 12000).reduce((total, shift) => total + shift.value, 0);
      const cls20 = result.shifts.reduce((total, shift) => total + shift.value, 0);
      samples.push({ variant, run, cls12, cls20, ...result });
      console.log(`${variant} ${run + 1}/5: CLS12=${cls12}, CLS20=${cls20}`);
      await writeFile('.ecc/benchmarks/layout-shifts-followup.json', JSON.stringify({ browser: browser.version(), protocol: 'Five alternating baseline/current cold mobile runs; 390x844, CPU4, 4Mbit/s, 150ms; 20-second window, sources retained; no user input.', samples }, null, 2));
      await context.close();
    }
  }
} finally { await browser.close(); }
