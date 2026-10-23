import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const label = process.env.BENCHMARK_LABEL || 'current';
const root = `test-results/references/${label}`;
const base = process.env.BENCHMARK_URL || 'http://localhost:3100';
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, args: ['--enable-unsafe-swiftshader'] });
try {
  for (const mobile of [false, true]) {
    for (const route of ['/', '/catalog', '/solutions/data-centers', '/solutions/fire-suppression', '/designers', '/contacts']) {
      const page = await browser.newPage({ viewport: mobile ? { width:390,height:844 } : { width:1440,height:900 }, reducedMotion: 'reduce' });
      // External map rendering is nondeterministic and is not a UI change in this task.
      await page.route('https://yandex.ru/map-widget/**', route => route.abort());
      await page.goto(base+route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3200);
      const name = `${route.replaceAll('/','-') || 'home'}-${mobile?'mobile':'desktop'}`;
      await page.screenshot({ path:`${root}/${name}-initial.png`, animations:'disabled' });
      for (let y=0; y<await page.evaluate(()=>document.body.scrollHeight); y+=600) {
        await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(100);
      }
      await page.waitForTimeout(1500);
      await page.screenshot({ path:`${root}/${name}-full.png`, fullPage:true, animations:'disabled' });
      await page.close();
      console.log(`${label}: ${name}`);
    }
  }
} finally { await browser.close(); }
