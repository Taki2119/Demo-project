// npm run check:bundle — runs AFTER `npm run build`, inspects dist/ (the real shipped build, not the source).
//   recharts · css · privacy · env   (rules in bundle-checks.mjs)
// Env: PRIVACY_DENY (secret; missing when CI=true ⇒ FAIL), VITE_API_URL (same as at build time), CI.
// A directory other than dist/: node scripts/ci/check-bundle.mjs <directory>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { checkCss, checkEnv, checkPrivacy, checkRecharts, parseDeny } from './bundle-checks.mjs';

const dir = process.argv[2] ?? 'dist';
const files = new Map();
for (const name of readdirSync(dir, { recursive: true })) {
  const p = join(dir, String(name));
  if (!statSync(p).isFile()) continue;
  const key = relative(dir, p).split(sep).join('/');
  if (key === 'index.html' || /\.(js|mjs|css|html|svg|json|txt|map|webmanifest)$/.test(key)) files.set(key, readFileSync(p, 'utf8'));
}
const html = files.get('index.html') ?? '';
const bundle = { html, files };

const results = [
  ['recharts', { errors: checkRecharts(bundle), warnings: [] }],
  ['css', { errors: checkCss(bundle), warnings: [] }],
  ['privacy', checkPrivacy(bundle, { deny: process.env.PRIVACY_DENY == null ? null : parseDeny(process.env.PRIVACY_DENY), ci: process.env.CI === 'true' })],
  ['env', checkEnv(bundle, { apiUrl: process.env.VITE_API_URL })],
];

let failed = false;
for (const [name, { errors, warnings }] of results) {
  for (const w of warnings) console.warn(`⚠ bundle-${name}: ${w}`);
  for (const e of errors) console.error(`✗ bundle-${name}: ${e}`);
  if (errors.length) failed = true;
  else console.log(`✓ bundle-${name}`);
}
if (failed) process.exit(1);
