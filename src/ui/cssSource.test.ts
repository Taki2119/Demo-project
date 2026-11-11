// Cổng nguồn CSS (kit 04 bẫy #2, 02 §2 luật 3, 02 §3).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));
// Đệ quy (bẫy #12): dời CSS vào thư mục con thì cổng vẫn kiểm.
const CSS_FILES = (readdirSync(SRC, { recursive: true }) as string[])
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ name: f.replaceAll('\\', '/'), text: readFileSync(join(SRC, f), 'utf8') }));

/** Bỏ comment, trả về phần code. Ném lỗi nếu gặp chuỗi đóng comment nằm NGOÀI comment. */
function stripComments(text: string, file: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) throw new Error(`${file}: comment không đóng`);
      i = end + 2;
      continue;
    }
    if (text.startsWith('*/', i)) {
      const line = text.slice(0, i).split('\n').length;
      throw new Error(`${file}:${line}: chuỗi đóng comment nằm ngoài comment`);
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function blockOf(code: string, selector: string): string {
  const at = code.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`không thấy khối "${selector}"`);
  const open = code.indexOf('{', at);
  return code.slice(open + 1, code.indexOf('}', open));
}
const propsOf = (block: string) => [...block.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]).sort();

describe('nguồn CSS', () => {
  it('tìm thấy file CSS', () => {
    expect(CSS_FILES.length).toBeGreaterThan(1);
  });

  it('không có chuỗi đóng comment nằm ngoài comment (rule sau đó sẽ biến mất khỏi dist)', () => {
    for (const f of CSS_FILES) expect(() => stripComments(f.text, f.name)).not.toThrow();
  });

  it('khối Ember sáng và tối khai CÙNG một tập token', () => {
    const tokens = CSS_FILES.find((f) => f.name.endsWith('styles/tokens.css'));
    if (!tokens) throw new Error('thiếu styles/tokens.css');
    const code = stripComments(tokens.text, tokens.name);
    const light = propsOf(blockOf(code, ":root,\n:root[data-theme='light']"));
    const dark = propsOf(blockOf(code, ":root[data-theme='dark']"));
    expect(light.length).toBeGreaterThan(10);
    expect(dark).toEqual(light);
  });

  it('backdrop-filter khai ở đúng MỘT chỗ: một dòng -webkit- + một dòng chuẩn', () => {
    const hits = CSS_FILES.flatMap((f) =>
      [...stripComments(f.text, f.name).matchAll(/(-webkit-)?backdrop-filter\s*:/g)].map((m) => `${f.name}:${m[0]}`),
    );
    expect(hits).toHaveLength(2);
    expect(new Set(hits.map((h) => h.split(':')[0])).size).toBe(1);
    expect(hits.some((h) => h.includes('-webkit-'))).toBe(true);
  });

  it('cấm text-transform viết hoa trên tiêu đề bảng / khoá nghiệp vụ', () => {
    for (const f of CSS_FILES) expect(stripComments(f.text, f.name)).not.toMatch(/text-transform\s*:\s*uppercase/);
  });
});
