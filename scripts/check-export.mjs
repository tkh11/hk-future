import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = resolve('out');
const prefix = '/hk-future';
const legacy = new Set(['/privacy', '/personal-data', '/about', '/docs', '/requisites']);
const failures = new Set();
const known = new Set();
async function* files(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) yield* files(path); else if (path.endsWith('.html')) yield path;
  }
}
let pages = 0;
for await (const path of files(root)) {
  pages++;
  const html = await readFile(path, 'utf8');
  // Next emits a same-origin preconnect when local fonts are not preloaded.
  // Connection hints address an origin, not a route under the deployment prefix.
  const assetHtml = html.replace(/<link\b[^>]*\brel="(?:preconnect|dns-prefetch)"[^>]*>/g, '');
  for (const match of assetHtml.matchAll(/(?:src|href|poster)="([^"<>]+)"/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    const url = new URL(value, 'https://export.test');
    if (!url.pathname.startsWith(`${prefix}/`) && url.pathname !== prefix) {
      failures.add(`Missing basePath: ${url.pathname}`); continue;
    }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length));
    if (legacy.has(relative.replace(/\/$/, ''))) { known.add(relative); continue; }
    let target = resolve(root, `.${relative}`);
    if (!target.startsWith(`${root}/`) && target !== root) { failures.add(`Outside export: ${value}`); continue; }
    try {
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
    } catch { failures.add(`Missing asset/route: ${value} in ${path.slice(root.length)}`); }
  }
}
console.log(`Checked ${pages} exported HTML pages. Known unfinished routes: ${[...known].join(', ') || 'none linked'}`);
if (failures.size) { console.error([...failures].join('\n')); process.exitCode = 1; }
