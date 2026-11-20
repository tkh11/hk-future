import { cpSync, existsSync, mkdtempSync, rmSync, constants, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// GitHub Pages is a frozen local-content demo, not a deployment of the CMS.
// Build in a disposable tree so export cannot rewrite a running .next server.
const source = resolve('.');
const stage = mkdtempSync(join(tmpdir(), 'heisskraft-export-'));

function prepareRoutes(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(directory, entry.name);
    if (entry.name === '(payload)' || entry.name === '(studio)' || entry.name === '[...pagePath]' || entry.name === 'products' || path.endsWith('/docs/file')) {
      rmSync(path, { recursive: true, force: true });
      continue;
    }
    prepareRoutes(path);
  }
  for (const file of [join(directory, 'sitemap.ts'), join(directory, 'search-index.json', 'route.ts')]) {
    if (!existsSync(file)) continue;
    const code = readFileSync(file, 'utf8').replace(/export const dynamic\s*=\s*['"][^'"]+['"];?\s*/g, '');
    writeFileSync(file, `${code}\nexport const dynamic = 'force-static';\n`);
  }
  const page = join(directory, 'page.tsx');
  if (!existsSync(page) || !/\/(?:catalog\/\[\.\.\.segments\]|articles\/\[slug\])$/.test(directory)) return;
  let code = readFileSync(page, 'utf8');
  if (!code.includes('generateStaticParams')) throw new Error('Frozen export requires static params for legacy content routes.');
  code = code.replace(/export const dynamicParams\s*=\s*(?:true|false);?\s*/g, '');
  // Server routes are explicitly dynamic for CMS publication/preview. The
  // frozen demo uses local content and generates only the known legacy paths.
  code = code.replace(/export const dynamic\s*=\s*['"]force-dynamic['"];?\s*/g, '');
  writeFileSync(page, `${code}\nexport const dynamicParams = false;\n`);
}

try {
  for (const name of ['src', 'public', 'node_modules', 'next.config.ts', 'payload.config.ts', 'tsconfig.json', 'next-env.d.ts', 'package.json', 'package-lock.json', 'postcss.config.mjs']) {
    if (existsSync(join(source, name))) cpSync(join(source, name), join(stage, name), { recursive: true, mode: constants.COPYFILE_FICLONE });
  }
  prepareRoutes(join(stage, 'src/app'));
  for (const file of ['src/proxy.ts', 'src/middleware.ts', 'proxy.ts', 'middleware.ts']) rmSync(join(stage, file), { force: true });
  // Turbopack traces dynamic imports before runtime environment guards. Remove
  // the CMS dependency edge only in the export tree, while keeping its type
  // contract so callers and the copied Payload configuration are still checked.
  writeFileSync(join(stage, 'src/cms/client.ts'), "import 'server-only';\nimport type { Payload } from 'payload';\n\nexport async function getCMS(): Promise<Payload> {\n  throw new Error('CMS is unavailable in the frozen static export.');\n}\n");
  const env = { ...process.env, GITHUB_PAGES: 'true', CMS_ENABLED: 'false', METRIKA_ENABLED: 'false' };
  for (const name of Object.keys(env)) {
    if (name === 'NEXT_BUILD_DIR' || name === 'DATABASE_URL' || name === 'PAYLOAD_SECRET' || name.startsWith('S3_') || name.startsWith('CMS_BOOTSTRAP_') || name === 'CMS_GATEWAY_SECRET' || name === 'METRIKA_READ_TOKEN') delete env[name];
  }
  const result = spawnSync(process.execPath, [join(stage, 'node_modules/next/dist/bin/next'), 'build'], { cwd: stage, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`Static build failed (${result.status ?? result.error?.code ?? 'unknown'})`);
  const exported = join(stage, 'out');
  if (!existsSync(join(exported, 'index.html'))) throw new Error('Static build did not emit the homepage.');
  for (const route of ['admin', 'api', 'studio', 'products']) {
    if (existsSync(join(exported, route))) throw new Error(`CMS-only route leaked into frozen export: ${route}`);
  }
  rmSync(join(source, 'out'), { recursive: true, force: true });
  cpSync(exported, join(source, 'out'), { recursive: true, mode: constants.COPYFILE_FICLONE });
} finally { rmSync(stage, { recursive: true, force: true }); }
