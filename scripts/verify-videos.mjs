import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { path: ffmpeg } = require('@ffmpeg-installer/ffmpeg');
const originalRoot = process.argv[2];
if (!originalRoot) throw new Error('Usage: node scripts/verify-videos.mjs <original checkout>');
function probe(path) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-i', path], { encoding: 'utf8' });
  const duration = result.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const video = result.stderr.match(/Video: [^\n]+/)[0];
  const dimensions = video.match(/ (\d+)x(\d+)[ ,]/);
  const fps = Number(video.match(/([\d.]+) fps/)[1]);
  return { width: Number(dimensions[1]), height: Number(dimensions[2]), duration: Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3]), fps };
}
const report = JSON.parse(readFileSync('.ecc/benchmarks/video-assets.json', 'utf8'));
for (const item of report) {
  const original = resolve(originalRoot, item.source);
  item.original = probe(original); item.optimized = probe(item.source);
  if (Math.abs(item.original.duration-item.optimized.duration) > 1/item.original.fps || item.original.fps !== item.optimized.fps || Math.abs(item.original.width/item.original.height-item.optimized.width/item.optimized.height) > .002) throw new Error(`Video contract changed: ${item.source}`);
  const result = spawnSync(ffmpeg, ['-hide_banner', '-threads', '2', '-i', original, '-threads', '2', '-i', item.source, '-filter_complex_threads', '2', '-filter_complex', `[0:v]scale=${item.optimized.width}:${item.optimized.height}:flags=bicubic[reference];[1:v][reference]ssim`, '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 20*1024*1024 });
  if (result.status !== 0) throw new Error(result.stderr);
  item.ssim = Number(result.stderr.match(/All:([\d.]+)/)?.[1]);
  if (!Number.isFinite(item.ssim) || item.ssim < .97) throw new Error(`Quality check needs review: ${item.source} SSIM ${item.ssim}`);
  console.log(`${item.source}: ${item.original.duration}s / ${item.optimized.duration}s, ${item.optimized.fps}fps, SSIM ${item.ssim}`);
  writeFileSync('.ecc/benchmarks/video-assets.json', JSON.stringify(report,null,2));
}
