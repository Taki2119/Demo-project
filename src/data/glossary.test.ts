// Khoá glossary (src/data/glossary.ts):
//   · mọi trường chữ có đủ ja + vi (như i18n.test: cùng bộ key, không chuỗi rỗng) — hoặc là TODO;
//   · mọi nhãn mà glossary TRỎ tới có thật trong migration nhãn (mart.column_labels / mart.labels)
//     ⇒ ⓘ không bao giờ phải hiện mã cột;
//   · mọi <StatTile> / <ChartCard> trong src/screens/** có `info=` (quét ĐỆ QUY — kit 04 bẫy 12),
//     và mọi mục glossary đều đang được dùng.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COMMON_SCOPE, GLOSSARY, GLOSSARY_KEYS, TODO, type Text } from './glossary';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

// ── nhãn trong migration ──
const migDir = 'supabase/migrations';
const labelsFile = readdirSync(join(ROOT, migDir)).find((f) => f.endsWith('_labels.sql'));
if (!labelsFile) throw new Error('thiếu migration *_labels.sql');
const sql = read(`${migDir}/${labelsFile}`);
function insertBlock(table: string): string {
  const at = sql.indexOf(`insert into ${table} `);
  if (at < 0) throw new Error(`không thấy insert into ${table}`);
  return sql.slice(at, sql.indexOf(';', at));
}
const COLS = new Set([...insertBlock('mart.column_labels').matchAll(/^\s*\('([a-z0-9_]+)',\s*'/gm)].map((m) => m[1]));
const LABELS = new Set([...insertBlock('mart.labels').matchAll(/^\s*\('([a-z0-9_]+)',\s*'([a-z0-9_]+)',\s*'/gm)].map((m) => `${m[1]}/${m[2]}`));

// ── mở thẻ JSX: từ `<Tag` tới `>` ở độ sâu ngoặc nhọn 0 (bỏ qua `=>` trong biểu thức) ──
function openingTags(code: string, tag: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(new RegExp(`<${tag}\\b`, 'g'))) {
    let depth = 0;
    let i = (m.index ?? 0) + tag.length + 1;
    for (; i < code.length; i++) {
      const c = code[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    out.push(code.slice(m.index, i + 1));
  }
  return out;
}
const SCREENS = (readdirSync(join(ROOT, 'src/screens'), { recursive: true }) as string[])
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => ({ name: f.replaceAll('\\', '/'), code: read(`src/screens/${f}`) }));

describe('glossary', () => {
  it('mọi trường chữ: đủ ja + vi, không rỗng (hoặc TODO); source + name không rỗng', () => {
    for (const k of GLOSSARY_KEYS) {
      const e = GLOSSARY[k];
      expect(e.name.length, k).toBeGreaterThan(0);
      expect(e.source.trim(), k).not.toBe('');
      for (const f of ['what', 'formula', 'unit', 'scope'] as const) {
        const v = e[f] as Text;
        if (v === TODO) continue;
        expect(Object.keys(v).sort(), `${k}.${f}`).toEqual(['ja', 'vi']);
        expect(v.ja.trim(), `${k}.${f}.ja`).not.toBe('');
        expect(v.vi.trim(), `${k}.${f}.vi`).not.toBe('');
      }
    }
    for (const [k, v] of Object.entries(COMMON_SCOPE)) {
      expect(v.ja.trim(), k).not.toBe('');
      expect(v.vi.trim(), k).not.toBe('');
    }
  });

  it('đọc được nhãn từ migration (bộ đọc không mù)', () => {
    expect(COLS.size).toBeGreaterThan(30);
    expect(LABELS.size).toBeGreaterThan(30);
    expect(COLS.has('mrr_end')).toBe(true);
    expect(LABELS.has('metric/arpa')).toBe(true);
  });

  it('mọi nhãn glossary trỏ tới có thật trong mart.column_labels / mart.labels', () => {
    const missing: string[] = [];
    for (const k of GLOSSARY_KEYS) {
      for (const r of GLOSSARY[k].name) {
        if ('col' in r ? !COLS.has(r.col) : !LABELS.has(`${r.label[0]}/${r.label[1]}`)) missing.push(`${k} → ${JSON.stringify(r)}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('mọi <StatTile> / <ChartCard> trong src/screens/** có info=; mọi mục glossary đang được dùng', () => {
    const noInfo: string[] = [];
    const used = new Set<string>();
    let tags = 0;
    for (const f of SCREENS) {
      for (const tag of ['StatTile', 'ChartCard']) {
        for (const open of openingTags(f.code, tag)) {
          tags++;
          const m = open.match(/\binfo=(?:"([a-z0-9_]+)"|\{\[([^\]]*)\]\})/);
          if (!m) noInfo.push(`${f.name}: ${open.slice(0, 60)}…`);
          else for (const k of m[1] ? [m[1]] : [...(m[2] ?? '').matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1] as string)) used.add(k);
        }
      }
    }
    expect(tags).toBeGreaterThan(15);
    expect(noInfo).toEqual([]);
    expect(GLOSSARY_KEYS.filter((k) => !used.has(k))).toEqual([]);
  });
});
