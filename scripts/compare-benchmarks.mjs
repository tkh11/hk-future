import { readFile, writeFile } from 'node:fs/promises';
const before = JSON.parse(await readFile(process.argv[2] || '.ecc/benchmarks/baseline.json', 'utf8'));
const after = JSON.parse(await readFile(process.argv[3] || '.ecc/benchmarks/current.json', 'utf8'));
if (before.browser !== after.browser || JSON.stringify(before.protocol) !== JSON.stringify(after.protocol)) throw new Error('Benchmark protocols/browser differ');
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
const comparison = [];
for (const { route, mobile } of before.samples.filter(sample => sample.run === 0)) {
  const a = before.samples.filter(sample => sample.route === route && sample.mobile === mobile);
  const b = after.samples.filter(sample => sample.route === route && sample.mobile === mobile);
  if (a.length !== 5 || b.length !== 5) throw new Error(`${route}: need five cold runs per profile`);
  const metrics = {};
  for (const metric of ['lcp', 'cls', 'longTasks', 'bytes']) {
    const source = a.map(s => s.initial[metric]);
    const current = b.map(s => s.initial[metric]);
    if ([...source,...current].some(v => v == null || !Number.isFinite(v))) throw new Error(`${route} ${metric}: incomplete observation`);
    const baseline = median(source), result = median(current);
    metrics[metric] = { before: baseline, after: result, beforeRange: [Math.min(...source),Math.max(...source)], afterRange: [Math.min(...current),Math.max(...current)], changePercent: baseline ? (result/baseline-1)*100 : null, regression: baseline ? result > baseline*1.1 : result > 0 };
  }
  comparison.push({ route, mobile, metrics });
}
await writeFile('.ecc/benchmarks/comparison.json', JSON.stringify(comparison,null,2));
for (const item of comparison) console.log(`${item.mobile?'mobile':'desktop'} ${item.route}: `+Object.entries(item.metrics).map(([key,v]) => `${key} ${v.before.toFixed(key==='cls'?6:2)}→${v.after.toFixed(key==='cls'?6:2)}${v.regression?' REVIEW':''}`).join('; '));
const runtimeErrors = after.samples.flatMap(sample => sample.initial.errors ?? []);
if (runtimeErrors.length) console.error('Runtime errors:', runtimeErrors);
if (runtimeErrors.length || comparison.some(row => Object.values(row.metrics).some(metric => metric.regression))) process.exitCode = 1;
