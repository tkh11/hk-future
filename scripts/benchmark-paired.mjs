import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Diagnostic follow-up for flagged first-screen metrics. Alternate A/B order
// across five cold pairs; keep the original measurements and 10% rule intact.
const comparison = JSON.parse(await readFile('.ecc/benchmarks/comparison.json', 'utf8'));
const reference = JSON.parse(await readFile('.ecc/benchmarks/current.json', 'utf8'));
const cases = comparison.filter(row => Object.values(row.metrics).some(value => value.regression));
const output = '.ecc/benchmarks/paired-followup.json';
const variants = [
  { name: 'baseline', url: process.env.BASELINE_URL || 'http://localhost:3101' },
  { name: 'current', url: process.env.BENCHMARK_URL || 'http://localhost:3100' },
];
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}), headless: true,
});
if (browser.version() !== reference.browser) {
  await browser.close();
  throw new Error('Browser differs from the full measurement series');
}
const samples = [];
const report = {
  browser: browser.version(), protocol: reference.protocol,
  note: 'Five alternating cold A/B pairs for every flagged route/profile; same 12-second initial window, no visual captures or concurrent tests. Original full series remains unchanged.',
  cases: cases.map(({route, mobile, metrics}) => ({ route, mobile, flaggedMetrics: Object.keys(metrics).filter(key => metrics[key].regression) })),
  samples,
};
try {
  for (const {route, mobile} of cases) {
    for (let run = 0; run < 5; run++) {
      for (const variant of run % 2 ? [...variants].reverse() : variants) {
        const context = await browser.newContext({ viewport: mobile ? {width:390,height:844} : {width:1440,height:900} });
        try {
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          await cdp.send('Network.setCacheDisabled', {cacheDisabled:true});
          await cdp.send('Emulation.setCPUThrottlingRate', {rate:mobile?4:1});
          if (mobile) await cdp.send('Network.emulateNetworkConditions', {offline:false,latency:150,downloadThroughput:500000,uploadThroughput:500000});
          let bytes=0;
          cdp.on('Network.dataReceived', event => {bytes+=event.encodedDataLength;});
          const errors=[];
          page.on('pageerror', error => errors.push(error.message));
          await page.addInitScript(() => {
            window.__bench={lcp:null,cls:0,longTasks:0};
            new PerformanceObserver(list => {for (const entry of list.getEntries()) window.__bench.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
            new PerformanceObserver(list => {for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__bench.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});
            new PerformanceObserver(list => {for (const entry of list.getEntries()) window.__bench.longTasks+=Math.max(0,entry.duration-50);}).observe({type:'longtask',buffered:true});
          });
          const started=Date.now();
          await page.goto(`${variant.url}${route}`,{waitUntil:'domcontentloaded',timeout:60000});
          await page.waitForTimeout(Math.max(0,12000-(Date.now()-started)));
          const initial=await page.evaluate(() => window.__bench);
          samples.push({route,mobile,run,variant:variant.name,initial:{...initial,bytes,errors}});
          await writeFile(output,JSON.stringify(report,null,2)+'\n');
          console.log(`${mobile?'mobile':'desktop'} ${route} pair ${run+1}/5 ${variant.name}: LCP ${initial.lcp}, blocking ${initial.longTasks}, CLS ${initial.cls}`);
        } finally {await context.close();}
      }
    }
  }
} finally {await browser.close();}
const median=values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
report.comparison=cases.map(({route,mobile}) => {
  const metrics={};
  for (const key of ['lcp','cls','longTasks','bytes']) {
    const values=variants.map(variant => samples.filter(s=>s.route===route&&s.mobile===mobile&&s.variant===variant.name).map(s=>s.initial[key]));
    if (values.some(list=>list.length!==5||list.some(v=>v==null||!Number.isFinite(v)))) throw new Error('Incomplete paired observations');
    const [before,after]=values.map(median);
    metrics[key]={before,after,beforeRange:[Math.min(...values[0]),Math.max(...values[0])],afterRange:[Math.min(...values[1]),Math.max(...values[1])],changePercent:before?(after/before-1)*100:null,regression:before?after>before*1.1:after>0};
  }
  return {route,mobile,metrics};
});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
if (report.comparison.some(row=>Object.values(row.metrics).some(value=>value.regression))||samples.some(s=>s.initial.errors.length)) process.exitCode=1;
