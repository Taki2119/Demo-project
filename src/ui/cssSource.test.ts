// CSS source gate (kit 04 pitfall #2, 02 §2 rule 3, 02 §3).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));
// Recursive (kit 04 pitfall #12): moving CSS into a subfolder still keeps it checked.
const CSS_FILES = (readdirSync(SRC, { recursive: true }) as string[])
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ name: f.replaceAll('\\', '/'), text: readFileSync(join(SRC, f), 'utf8') }));

/** Strip comments, return the code part. Throws on a comment-close sequence OUTSIDE a comment. */
function stripComments(text: string, file: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) throw new Error(`${file}: unclosed comment`);
      i = end + 2;
      continue;
    }
    if (text.startsWith('*/', i)) {
      const line = text.slice(0, i).split('\n').length;
      throw new Error(`${file}:${line}: comment-close sequence outside a comment`);
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function blockOf(code: string, selector: string): string {
  const at = code.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`block "${selector}" not found`);
  const open = code.indexOf('{', at);
  return code.slice(open + 1, code.indexOf('}', open));
}
const propsOf = (block: string) => [...block.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]).sort();

describe('CSS source', () => {
  it('finds the CSS files', () => {
    expect(CSS_FILES.length).toBeGreaterThan(1);
  });

  it('no comment-close sequence outside a comment (the rule after it would vanish from dist)', () => {
    for (const f of CSS_FILES) expect(() => stripComments(f.text, f.name)).not.toThrow();
  });

  it('light and dark Ember blocks declare the SAME token set', () => {
    const tokens = CSS_FILES.find((f) => f.name.endsWith('styles/tokens.css'));
    if (!tokens) throw new Error('missing styles/tokens.css');
    const code = stripComments(tokens.text, tokens.name);
    const light = propsOf(blockOf(code, ":root,\n:root[data-theme='light']"));
    const dark = propsOf(blockOf(code, ":root[data-theme='dark']"));
    expect(light.length).toBeGreaterThan(10);
    expect(dark).toEqual(light);
  });

  it('backdrop-filter declared in exactly ONE place: one -webkit- line + one standard line', () => {
    const hits = CSS_FILES.flatMap((f) =>
      [...stripComments(f.text, f.name).matchAll(/(-webkit-)?backdrop-filter\s*:/g)].map((m) => `${f.name}:${m[0]}`),
    );
    expect(hits).toHaveLength(2);
    expect(new Set(hits.map((h) => h.split(':')[0])).size).toBe(1);
    expect(hits.some((h) => h.includes('-webkit-'))).toBe(true);
  });

  // Broader than the kit (the kit only forbids it on table headers + business keys / brand names): forbidden in EVERY CSS file.
  it('forbids text-transform: uppercase in ALL CSS', () => {
    for (const f of CSS_FILES) expect(stripComments(f.text, f.name)).not.toMatch(/text-transform\s*:\s*uppercase/);
  });
});
