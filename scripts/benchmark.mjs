import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const baseURL = process.env.BENCHMARK_URL || 'http://localhost:3100';
const label = process.env.BENCHMARK_LABEL || 'current';
const output = resolve('.ecc/benchmarks');
const captures = resolve('test-results', label);
await mkdir(output, { recursive: true });
await mkdir(captures, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  headless: true,
});
const routes = (process.env.BENCHMARK_ROUTES || '/,/catalog,/solutions/data-centers,/solutions/fire-suppression,/designers,/contacts').split(',');
const runs = Number(process.env.BENCHMARK_RUNS || 5);
const samples = [];
try {
  for (const mobile of [false, true]) {
    for (const route of routes) {
      for (let run = 0; run < runs; run++) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 4 : 1 });
        if (mobile) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 500000, uploadThroughput: 500000 });
        let bytes = 0;
        cdp.on('Network.dataReceived', event => { bytes += event.encodedDataLength; });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
          window.__bench = { lcp: null, cls: 0, longTasks: 0 };
          new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__bench.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__bench.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__bench.longTasks += Math.max(0, entry.duration - 50); }).observe({ type: 'longtask', buffered: true });
        });
        const started = Date.now();
        await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // A fixed observation window also captures unfinished/background transfers.
        await page.waitForTimeout(Math.max(0, 12000 - (Date.now() - started)));
        const initial = await page.evaluate(() => ({ ...window.__bench, requests: performance.getEntriesByType('resource').length, navigation: performance.getEntriesByType('navigation')[0]?.toJSON(), videoSources: [...document.querySelectorAll('video')].map(video => ({ src: video.currentSrc, readyState: video.readyState, paused: video.paused })) }));
        const sample = { route, mobile, run, initial: { ...initial, bytes, errors: [...errors] } };
        if (run === 0) {
          const name = `${route.replaceAll('/', '-') || 'home'}-${mobile ? 'mobile' : 'desktop'}`;
          await page.screenshot({ path: `${captures}/${name}-initial.png` });
          // Visual references include revealed sections. Not part of initial-load metrics.
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 650) {
            await page.evaluate(y => window.scrollTo(0, y), y);
            await page.waitForTimeout(200);
          }
          await page.waitForTimeout(1500);
          await page.screenshot({ path: `${captures}/${name}-revealed.png`, fullPage: true });
        }
        samples.push(sample);
        await writeFile(`${output}/${label}.json`, JSON.stringify({ label, browser: browser.version(), protocol: { runs, initialWindowMs: 12000, mobile: { viewport: '390x844', cpu: 4, downloadBytesPerSecond: 500000, latencyMs: 150 }, desktop: { viewport: '1440x900', cpu: 1, network: 'local unthrottled' }, cache: 'cold context, disabled HTTP cache', note: '12-second laboratory observations, not field Core Web Vitals. Bytes include partial transfers. Visual capture follows separately without throttling.' }, samples }, null, 2));
        console.log(`${label}: ${mobile ? 'mobile' : 'desktop'} ${route} ${run + 1}/${runs}: ${Math.round(sample.initial.bytes / 1024)} KiB`);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
