import { cpSync, existsSync, mkdtempSync, rmSync, constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Next's output:"export" uses .next internally even when distDir names the
// exported folder. A separate checkout prevents it touching a running dev build.
const source = resolve('.');
const stage = mkdtempSync(join(tmpdir(), 'heisskraft-export-'));
try {
  for (const name of ['src', 'public', 'node_modules', 'next.config.ts', 'tsconfig.json', 'next-env.d.ts', 'package.json', 'package-lock.json', 'postcss.config.mjs']) {
    if (existsSync(join(source, name))) cpSync(join(source, name), join(stage, name), { recursive: true, mode: constants.COPYFILE_FICLONE });
  }
  const env = { ...process.env, GITHUB_PAGES: 'true' };
  delete env.NEXT_BUILD_DIR;
  const result = spawnSync(process.execPath, [join(stage, 'node_modules/next/dist/bin/next'), 'build'], { cwd: stage, env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Static build failed (${result.status})`);
  rmSync(join(source, 'out'), { recursive: true, force: true });
  cpSync(join(stage, 'out'), join(source, 'out'), { recursive: true, mode: constants.COPYFILE_FICLONE });
} finally { rmSync(stage, { recursive: true, force: true }); }
