// prePaint gate (kit 02 §1): a CLASSIC script in <head> writes the resolved data-theme before first paint,
// and the CSS uses exactly that attribute + values.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const html = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');
const tokens = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8');

const head = html.slice(0, html.indexOf('</head>'));
const scripts = [...head.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const prePaint = scripts.find((m) => m[2]?.includes('data-theme'));

describe('prePaint', () => {
  it('is in <head>, a classic script (not module, no defer/async, no src)', () => {
    expect(prePaint).toBeDefined();
    const attrs = prePaint?.[1] ?? '';
    expect(attrs).not.toMatch(/type\s*=\s*["']module|defer|async|src\s*=/);
  });

  it('comes before every stylesheet in <head>', () => {
    const at = head.indexOf(prePaint?.[0] ?? '\u0000');
    const css = head.indexOf('rel="stylesheet"');
    expect(at).toBeGreaterThanOrEqual(0);
    if (css >= 0) expect(at).toBeLessThan(css);
  });

  it("writes the RESOLVED value 'light' | 'dark', never 'system'", () => {
    const body = prePaint?.[2] ?? '';
    expect(body).toContain("'dark'");
    expect(body).toContain("'light'");
    expect(body).not.toContain('system');
  });

  it('CSS has a block for exactly those two values', () => {
    expect(tokens).toContain(":root[data-theme='light']");
    expect(tokens).toContain(":root[data-theme='dark']");
  });
});
