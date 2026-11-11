// Gates inspecting the SHIPPED BUILD (dist/) — PURE functions: take { html, files: Map<'assets/x.js', content> },
// return a list of errors (array of strings; empty = pass). Disk + env are read in check-bundle.mjs.
//
// Why not just `grep activeTooltipIndex dist/assets/index-*.js` (the kit's approach): if the entry chunk
// STATICALLY IMPORTS the Recharts chunk (e.g. manualChunks pulls React into it) or index.html modulepreloads it,
// Recharts still loads on the first page while grep still returns 0 (CLAUDE.md §6). So the gate walks index.html →
// entry chunk → static import CLOSURE, and recognizes the Recharts chunk by CONTENT, not by file name.
import { posix } from 'node:path';

/** Strings only Recharts has (not present in the app's code). A chunk containing ONE of these = the Recharts chunk. */
export const RECHARTS_MARKERS = ['activeTooltipIndex', 'recharts-wrapper'];

const isRecharts = (text) => RECHARTS_MARKERS.some((m) => text.includes(m));

/** Path in index.html (e.g. '/Demo-project/assets/a.js') → key in `files`. */
function resolveHtmlRef(ref, files) {
  const clean = ref.split(/[?#]/)[0];
  for (const key of files.keys()) if (clean === key || clean.endsWith('/' + key)) return key;
  return null;
}

/** STATIC imports of a minified ESM module: `import{a}from"./x.js"`, `import"./x.js"`,
 *  `export{a}from"./x.js"`. Does NOT count `import("./x.js")` (dynamic loading). */
export function staticImports(code) {
  const out = [];
  const re = /(?:^|[^\w$.])(?:import|export)\s*(?:[^"'`();]*?\bfrom\s*)?["']([^"']+)["']/g;
  for (const m of code.matchAll(re)) out.push(m[1]);
  return out;
}

/** Static import closure from `start` (a key in files). */
function staticClosure(start, files) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const k = stack.pop();
    if (seen.has(k) || !files.has(k)) continue;
    seen.add(k);
    for (const spec of staticImports(files.get(k))) {
      if (!spec.startsWith('.')) continue;
      stack.push(posix.normalize(posix.join(posix.dirname(k), spec)));
    }
  }
  return seen;
}

const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? null;

/** Recharts gate: the entry chunk (+ everything it statically imports) and every modulepreload must NOT touch the Recharts chunk. */
export function checkRecharts({ html, files }) {
  const errors = [];
  const recharts = [...files.keys()].filter((k) => k.endsWith('.js') && isRecharts(files.get(k)));
  if (recharts.length === 0) {
    errors.push(`no Recharts chunk recognized (markers: ${RECHARTS_MARKERS.join(', ')}) — did Recharts change its content? Update RECHARTS_MARKERS; do not let the gate go green by being blind.`);
  }
  const entries = tags(html, 'script')
    .filter((t) => /\btype\s*=\s*["']module["']/i.test(t) && attr(t, 'src'))
    .map((t) => ({ ref: attr(t, 'src'), key: resolveHtmlRef(attr(t, 'src'), files) }));
  if (entries.length === 0) errors.push('index.html has no <script type="module" src> — cannot find the entry chunk.');
  for (const e of entries) {
    if (!e.key) {
      errors.push(`entry chunk ${e.ref} is not in dist/.`);
      continue;
    }
    for (const k of staticClosure(e.key, files)) {
      if (!isRecharts(files.get(k))) continue;
      errors.push(k === e.key
        ? `entry chunk ${k} CONTAINS Recharts.`
        : `entry chunk ${e.key} STATICALLY imports ${k}, and ${k} contains Recharts ⇒ Recharts loads on the first page.`);
    }
  }
  for (const t of tags(html, 'link').filter((t) => /\brel\s*=\s*["'][^"']*modulepreload/i.test(t))) {
    const key = resolveHtmlRef(attr(t, 'href') ?? '', files);
    if (!key) continue;
    for (const k of staticClosure(key, files)) {
      if (isRecharts(files.get(k))) errors.push(`index.html modulepreload ${key}${k === key ? '' : ` (pulls in ${k})`}, and ${k} contains Recharts.`);
    }
  }
  return errors;
}

/** CSS gate (kit 04 pitfalls 1 + 3): glass declared EXACTLY ONCE in both forms, and the dvh fallback survives in the shipped build. */
export function checkCss({ files }) {
  const css = [...files.entries()].filter(([k]) => k.endsWith('.css')).map(([, v]) => v).join('\n');
  const errors = [];
  if (!css) return ['dist/ has no CSS file.'];
  const prefixed = css.match(/-webkit-backdrop-filter\s*:/g)?.length ?? 0;
  const plain = css.match(/(?<!-webkit-)backdrop-filter\s*:/g)?.length ?? 0;
  if (prefixed !== 1 || plain !== 1) errors.push(`backdrop-filter must be declared exactly once per form; the shipped build has -webkit-: ${prefixed}, plain: ${plain}.`);
  if (!/height\s*:\s*100dvh/.test(css)) errors.push('the shipped build lost `height:100dvh`.');
  if (!/@supports\s+not\s*\(\s*height\s*:\s*100dvh\s*\)\s*\{[^}]*height\s*:\s*100vh/.test(css)) {
    errors.push('the shipped build lost the fallback `@supports not (height:100dvh){…height:100vh}`.');
  }
  return errors;
}

/** FIXED deny strings (not secret): DB config / SQL / dev machine leaking into the public shipped build. */
export const BUILTIN_DENY = ['postgres://', 'postgresql://', 'DATABASE_URL', 'analytics_reader', 'supabase.co', 'localhost', 'from mart.', 'from raw.'];
const EMAIL = /[A-Za-z0-9._%+-]+@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})/g;
const TEXT = /\.(js|mjs|css|html|svg|json|txt|map|webmanifest)$/;

/** PRIVACY_DENY: deny list kept by the user in a secret (comma- or newline-separated). Never print the
 *  denied strings back to the log — only the item's INDEX. */
export function parseDeny(raw) {
  return (raw ?? '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

export function checkPrivacy({ html, files }, { deny, ci }) {
  const errors = [];
  const warnings = [];
  if (deny == null || deny.length === 0) {
    const msg = 'PRIVACY_DENY is empty — cannot check for real organization names in the shipped build.';
    if (ci) errors.push(msg + ' On CI this FAILS: set the PRIVACY_DENY secret.');
    else warnings.push(msg + ' (locally: warning only)');
  }
  const all = [['index.html', html], ...[...files.entries()].filter(([k]) => k !== 'index.html' && TEXT.test(k))];
  for (const [name, text] of all) {
    const low = text.toLowerCase();
    for (const d of BUILTIN_DENY) if (low.includes(d.toLowerCase())) errors.push(`${name} contains "${d}".`);
    (deny ?? []).forEach((d, i) => {
      if (low.includes(d.toLowerCase())) errors.push(`${name} contains item #${i + 1} of PRIVACY_DENY.`);
    });
    for (const m of text.matchAll(EMAIL)) {
      const domain = m[1].toLowerCase();
      if (domain !== 'example.com' && !domain.endsWith('.example.com')) errors.push(`${name} contains an email outside *.example.com (domain ${domain}).`);
    }
  }
  return { errors, warnings };
}

/** Env gate (kit 04 pitfall 33): if VITE_API_URL is set at build time, that string MUST be in the bundle.
 *  Leaving it empty is valid (the app says "not configured") ⇒ warning only. */
export function checkEnv({ files }, { apiUrl }) {
  const url = (apiUrl ?? '').trim().replace(/\/+$/, '');
  if (!url) return { errors: [], warnings: ['VITE_API_URL is empty — pages will show "not configured".'] };
  const found = [...files.entries()].some(([k, v]) => k.endsWith('.js') && v.includes(url));
  return { errors: found ? [] : [`VITE_API_URL was set at build time but is not in the bundle.`], warnings: [] };
}
