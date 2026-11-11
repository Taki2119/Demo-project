// Glossary lock (src/data/glossary.ts):
//   · every text field has both ja + vi (like i18n.test: same key set, no empty strings) — or is a TODO;
//   · every label the glossary POINTS to really exists in the labels migration (mart.column_labels / mart.labels)
//     ⇒ ⓘ never has to show a column code;
//   · every <StatTile> / <ChartCard> in src/screens/** has `info=` (scanned RECURSIVELY — kit 04 pitfall 12),
//     and every glossary entry is in use.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COMMON_SCOPE, GLOSSARY, GLOSSARY_KEYS, TODO, type Text } from './glossary';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

// ── labels in the migration ──
const migDir = 'supabase/migrations';
const labelsFile = readdirSync(join(ROOT, migDir)).find((f) => f.endsWith('_labels.sql'));
if (!labelsFile) throw new Error('missing migration *_labels.sql');
const sql = read(`${migDir}/${labelsFile}`);
function insertBlock(table: string): string {
  const at = sql.indexOf(`insert into ${table} `);
  if (at < 0) throw new Error(`insert into ${table} not found`);
  return sql.slice(at, sql.indexOf(';', at));
}
const COLS = new Set([...insertBlock('mart.column_labels').matchAll(/^\s*\('([a-z0-9_]+)',\s*'/gm)].map((m) => m[1]));
const LABELS = new Set([...insertBlock('mart.labels').matchAll(/^\s*\('([a-z0-9_]+)',\s*'([a-z0-9_]+)',\s*'/gm)].map((m) => `${m[1]}/${m[2]}`));

// ── JSX opening tag: from `<Tag` to `>` at brace depth 0 (skipping `=>` inside expressions) ──
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
  it('every text field: both ja + vi, non-empty (or TODO); source + name non-empty', () => {
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

  it('labels can be read from the migration (the reader is not blind)', () => {
    expect(COLS.size).toBeGreaterThan(30);
    expect(LABELS.size).toBeGreaterThan(30);
    expect(COLS.has('mrr_end')).toBe(true);
    expect(LABELS.has('metric/arpa')).toBe(true);
  });

  it('every label the glossary points to exists in mart.column_labels / mart.labels', () => {
    const missing: string[] = [];
    for (const k of GLOSSARY_KEYS) {
      for (const r of GLOSSARY[k].name) {
        if ('col' in r ? !COLS.has(r.col) : !LABELS.has(`${r.label[0]}/${r.label[1]}`)) missing.push(`${k} → ${JSON.stringify(r)}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every <StatTile> / <ChartCard> in src/screens/** has info=; every glossary entry is in use', () => {
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
