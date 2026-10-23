import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { statSync, renameSync, unlinkSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
const require = createRequire(import.meta.url);
const { path: ffmpeg } = require('@ffmpeg-installer/ffmpeg');
const videos = ['home/hero-opening', 'home/gali', 'home/galits', 'catalog/pipes', 'catalog/pumpscategory', 'catalog/accessories'];
const report = [];
for (const name of videos) {
  const source = `public/videos/${name}.mp4`;
  const temporary = `${source}.optimized.mp4`;
  const maxWidth = name.startsWith('home') ? 1920 : 720;
  const scale = `scale='min(${maxWidth},iw)':-2`;
  const before = statSync(source).size;
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-map', '0:v:0', '-an', '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', temporary], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  const after = statSync(temporary).size;
  // Keep the original unless the encoded derivative saves at least 10%.
  if (after < before * .9) renameSync(temporary, source); else unlinkSync(temporary);
  const poster = `public/images/${name}-poster.jpg`;
  // Generate posters separately through the browser compositor. Direct YUV→JPEG
  // extraction changes the perceived BT.709 red when displayed as an sRGB image.
  report.push({ source, before, after: statSync(source).size, maxWidth, crf: 20, audio: 'removed (muted UI)', poster });
  console.log(`${basename(source)}: ${before} → ${statSync(source).size} bytes`);
}
mkdirSync('.ecc/benchmarks', { recursive: true });
writeFileSync('.ecc/benchmarks/video-assets.json', JSON.stringify(report, null, 2));
console.log('Generate missing/updated posters with scripts/generate-video-posters.mjs against the running site.');
