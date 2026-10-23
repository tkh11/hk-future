import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// The compositor preserves the video's BT.709 display conversion, including
// the catalog's red background. A canvas/ffmpeg JPEG conversion differs visibly.
const names = ['catalog/pipes', 'catalog/pumpscategory', 'catalog/accessories', 'home/hero-opening'];
const baseURL = process.env.POSTER_BASE_URL || 'http://localhost:3100';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1, reducedMotion: 'reduce' });
  for (const name of names) {
    const url = new URL(`videos/${name}.mp4`, `${baseURL.replace(/\/$/, '')}/`).href;
    await page.setContent('<style>body{margin:0}video{display:block;width:100%;height:auto}</style><video preload="auto" muted playsinline></video>');
    const size = await page.locator('video').evaluate((video, url) => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Video did not load within 30 seconds')), 30_000);
      video.onloadeddata = () => { clearTimeout(timeout); resolve({ width: video.videoWidth, height: video.videoHeight }); };
      video.onerror = () => { clearTimeout(timeout); reject(new Error(`Failed to load ${url}`)); };
      video.src = url;
    }), url);
    await page.setViewportSize(size);
    await mkdir(`public/images/${name.split('/')[0]}`, { recursive: true });
    await page.locator('video').screenshot({ path: `public/images/${name}-poster.jpg`, type: 'jpeg', quality: 95 });
    console.log(`${name}: ${size.width}×${size.height}`);
  }
} finally { await browser.close(); }
