import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
let raw;
try { raw = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8' }); }
catch (error) { raw = error.stdout; }
if (!raw) throw new Error('Dependency audit did not return a report');
const report = JSON.parse(raw);
if (report.error || !report.vulnerabilities) throw new Error('Dependency audit unavailable; do not treat this as clean');
const vulnerabilities = report.vulnerabilities;
const acceptedPackages = new Set(['braces', 'micromatch', 'fast-glob', '@next/eslint-plugin-next', 'eslint-config-next']);
function knownDevelopmentChain(name, visited = new Set()) {
  if (visited.has(name)) return true;
  visited.add(name);
  const finding = vulnerabilities[name];
  return acceptedPackages.has(name) && finding && finding.via.length > 0 && finding.via.every(via =>
    typeof via === 'string' ? knownDevelopmentChain(via, visited) : via.url === 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm');
}
const unexpected = Object.keys(vulnerabilities).filter(name => !knownDevelopmentChain(name));
mkdirSync('.ecc/audit', { recursive: true });
writeFileSync('.ecc/audit/dependencies.json', JSON.stringify({ checkedAt: new Date().toISOString(), report, knownDevelopmentAdvisory: 'GHSA-vfj7-8cjw-p6xm', unexpected }, null, 2));
console.log(`Audit: ${Object.keys(vulnerabilities).length} findings; ${unexpected.length} outside the documented ESLint-only advisory.`);
if (unexpected.length) { console.error(unexpected.join('\n')); process.exitCode = 1; }
// Never allow this exception to cover a production dependency.
execFileSync('npm', ['audit', '--omit=dev', '--audit-level=moderate'], { stdio: 'inherit' });
