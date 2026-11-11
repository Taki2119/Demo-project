// Cổng soi BẢN SHIP (dist/) — hàm THUẦN: nhận { html, files: Map<'assets/x.js', nội dung> }, trả
// danh sách lỗi (mảng chuỗi; rỗng = qua). Đọc đĩa + env ở check-bundle.mjs.
//
// Vì sao không chỉ `grep activeTooltipIndex dist/assets/index-*.js` (cách của kit): nếu chunk đầu
// IMPORT TĨNH chunk Recharts (vd. manualChunks kéo React sang đó) hoặc index.html modulepreload nó,
// Recharts vẫn nạp ngay trang đầu mà grep vẫn ra 0 (CLAUDE.md §6). Nên cổng đi từ index.html →
// chunk đầu → BAO ĐÓNG import tĩnh, và nhận chunk Recharts theo NỘI DUNG, không theo tên file.
import { posix } from 'node:path';

/** Chuỗi chỉ Recharts có (không có trong code của app). Chunk chứa MỘT trong số này = chunk Recharts. */
export const RECHARTS_MARKERS = ['activeTooltipIndex', 'recharts-wrapper'];

const isRecharts = (text) => RECHARTS_MARKERS.some((m) => text.includes(m));

/** Đường dẫn trong index.html (vd. '/Demo-project/assets/a.js') → khoá trong `files`. */
function resolveHtmlRef(ref, files) {
  const clean = ref.split(/[?#]/)[0];
  for (const key of files.keys()) if (clean === key || clean.endsWith('/' + key)) return key;
  return null;
}

/** Import TĨNH của một module ESM đã minify: `import{a}from"./x.js"`, `import"./x.js"`,
 *  `export{a}from"./x.js"`. KHÔNG tính `import("./x.js")` (nạp động). */
export function staticImports(code) {
  const out = [];
  const re = /(?:^|[^\w$.])(?:import|export)\s*(?:[^"'`();]*?\bfrom\s*)?["']([^"']+)["']/g;
  for (const m of code.matchAll(re)) out.push(m[1]);
  return out;
}

/** Bao đóng import tĩnh từ `start` (khoá trong files). */
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

/** Cổng Recharts: chunk đầu (+ mọi thứ nó import tĩnh) và mọi modulepreload KHÔNG chạm chunk Recharts. */
export function checkRecharts({ html, files }) {
  const errors = [];
  const recharts = [...files.keys()].filter((k) => k.endsWith('.js') && isRecharts(files.get(k)));
  if (recharts.length === 0) {
    errors.push(`không nhận ra chunk Recharts nào (dấu hiệu: ${RECHARTS_MARKERS.join(', ')}) — Recharts đổi nội dung? Cập nhật RECHARTS_MARKERS, đừng để cổng xanh vì mù.`);
  }
  const entries = tags(html, 'script')
    .filter((t) => /\btype\s*=\s*["']module["']/i.test(t) && attr(t, 'src'))
    .map((t) => ({ ref: attr(t, 'src'), key: resolveHtmlRef(attr(t, 'src'), files) }));
  if (entries.length === 0) errors.push('index.html không có <script type="module" src> — không tìm được chunk đầu.');
  for (const e of entries) {
    if (!e.key) {
      errors.push(`chunk đầu ${e.ref} không có trong dist/.`);
      continue;
    }
    for (const k of staticClosure(e.key, files)) {
      if (!isRecharts(files.get(k))) continue;
      errors.push(k === e.key
        ? `chunk đầu ${k} CHỨA Recharts.`
        : `chunk đầu ${e.key} import TĨNH ${k}, mà ${k} chứa Recharts ⇒ Recharts nạp ngay trang đầu.`);
    }
  }
  for (const t of tags(html, 'link').filter((t) => /\brel\s*=\s*["'][^"']*modulepreload/i.test(t))) {
    const key = resolveHtmlRef(attr(t, 'href') ?? '', files);
    if (!key) continue;
    for (const k of staticClosure(key, files)) {
      if (isRecharts(files.get(k))) errors.push(`index.html modulepreload ${key}${k === key ? '' : ` (kéo theo ${k})`}, mà ${k} chứa Recharts.`);
    }
  }
  return errors;
}

/** Cổng CSS (kit 04 bẫy 1 + 3): kính khai ĐÚNG MỘT lần cả 2 dạng, và đường lui dvh còn sống trong bản ship. */
export function checkCss({ files }) {
  const css = [...files.entries()].filter(([k]) => k.endsWith('.css')).map(([, v]) => v).join('\n');
  const errors = [];
  if (!css) return ['dist/ không có file CSS.'];
  const prefixed = css.match(/-webkit-backdrop-filter\s*:/g)?.length ?? 0;
  const plain = css.match(/(?<!-webkit-)backdrop-filter\s*:/g)?.length ?? 0;
  if (prefixed !== 1 || plain !== 1) errors.push(`backdrop-filter phải khai đúng 1 lần mỗi dạng; bản ship có -webkit-: ${prefixed}, thường: ${plain}.`);
  if (!/height\s*:\s*100dvh/.test(css)) errors.push('bản ship mất `height:100dvh`.');
  if (!/@supports\s+not\s*\(\s*height\s*:\s*100dvh\s*\)\s*\{[^}]*height\s*:\s*100vh/.test(css)) {
    errors.push('bản ship mất đường lui `@supports not (height:100dvh){…height:100vh}`.');
  }
  return errors;
}

/** Chuỗi cấm CỐ ĐỊNH (không bí mật): cấu hình DB / SQL / máy dev lọt vào bản ship công khai. */
export const BUILTIN_DENY = ['postgres://', 'postgresql://', 'DATABASE_URL', 'analytics_reader', 'supabase.co', 'localhost', 'from mart.', 'from raw.'];
const EMAIL = /[A-Za-z0-9._%+-]+@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})/g;
const TEXT = /\.(js|mjs|css|html|svg|json|txt|map|webmanifest)$/;

/** PRIVACY_DENY: danh sách cấm do người dùng giữ ở secret (phẩy hoặc xuống dòng). Không in lại
 *  chuỗi cấm ra log — chỉ in SỐ THỨ TỰ của mục. */
export function parseDeny(raw) {
  return (raw ?? '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

export function checkPrivacy({ html, files }, { deny, ci }) {
  const errors = [];
  const warnings = [];
  if (deny == null || deny.length === 0) {
    const msg = 'PRIVACY_DENY trống — không kiểm được tên tổ chức thật trong bản ship.';
    if (ci) errors.push(msg + ' Trên CI thì FAIL: đặt secret PRIVACY_DENY.');
    else warnings.push(msg + ' (ở máy: chỉ cảnh báo)');
  }
  const all = [['index.html', html], ...[...files.entries()].filter(([k]) => k !== 'index.html' && TEXT.test(k))];
  for (const [name, text] of all) {
    const low = text.toLowerCase();
    for (const d of BUILTIN_DENY) if (low.includes(d.toLowerCase())) errors.push(`${name} chứa "${d}".`);
    (deny ?? []).forEach((d, i) => {
      if (low.includes(d.toLowerCase())) errors.push(`${name} chứa mục #${i + 1} của PRIVACY_DENY.`);
    });
    for (const m of text.matchAll(EMAIL)) {
      const domain = m[1].toLowerCase();
      if (domain !== 'example.com' && !domain.endsWith('.example.com')) errors.push(`${name} chứa email ngoài *.example.com (miền ${domain}).`);
    }
  }
  return { errors, warnings };
}

/** Cổng env (kit 04 bẫy 33): đặt VITE_API_URL lúc build thì chuỗi đó PHẢI nằm trong bundle.
 *  Để trống là hợp lệ (app nói "chưa cấu hình") ⇒ chỉ cảnh báo. */
export function checkEnv({ files }, { apiUrl }) {
  const url = (apiUrl ?? '').trim().replace(/\/+$/, '');
  if (!url) return { errors: [], warnings: ['VITE_API_URL trống — trang sẽ hiện "chưa cấu hình".'] };
  const found = [...files.entries()].some(([k, v]) => k.endsWith('.js') && v.includes(url));
  return { errors: found ? [] : [`VITE_API_URL đã đặt lúc build nhưng không có trong bundle.`], warnings: [] };
}
