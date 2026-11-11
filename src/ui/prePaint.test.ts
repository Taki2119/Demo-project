// Cổng prePaint (kit 02 §1): script THƯỜNG trong <head>, ghi data-theme đã giải trước lần vẽ đầu,
// và CSS dùng đúng attribute + giá trị đó.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const html = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');
const tokens = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8');

const head = html.slice(0, html.indexOf('</head>'));
const scripts = [...head.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const prePaint = scripts.find((m) => m[2]?.includes('data-theme'));

describe('prePaint', () => {
  it('nằm trong <head>, là script thường (không module, không defer/async, không src)', () => {
    expect(prePaint).toBeDefined();
    const attrs = prePaint?.[1] ?? '';
    expect(attrs).not.toMatch(/type\s*=\s*["']module|defer|async|src\s*=/);
  });

  it('đứng trước mọi stylesheet trong <head>', () => {
    const at = head.indexOf(prePaint?.[0] ?? '\u0000');
    const css = head.indexOf('rel="stylesheet"');
    expect(at).toBeGreaterThanOrEqual(0);
    if (css >= 0) expect(at).toBeLessThan(css);
  });

  it("ghi giá trị ĐÃ GIẢI 'light' | 'dark', không bao giờ 'system'", () => {
    const body = prePaint?.[2] ?? '';
    expect(body).toContain("'dark'");
    expect(body).toContain("'light'");
    expect(body).not.toContain('system');
  });

  it('CSS có khối cho đúng hai giá trị đó', () => {
    expect(tokens).toContain(":root[data-theme='light']");
    expect(tokens).toContain(":root[data-theme='dark']");
  });
});
