import { describe, expect, it } from 'vitest';
import { BOARDS, PROJECT_CHURN } from '../nav/catalog';
import { DICT } from './i18n';

describe('song ngữ', () => {
  it('DICT.ja và DICT.vi có CÙNG bộ key, không chuỗi rỗng', () => {
    expect(Object.keys(DICT.vi).sort()).toEqual(Object.keys(DICT.ja).sort());
    for (const lang of ['ja', 'vi'] as const) for (const v of Object.values(DICT[lang])) expect(v.trim()).not.toBe('');
  });

  it('logo (appName) không có chữ Latin có dấu — --font-display (Outfit) không có bộ chữ tiếng Việt', () => {
    // Latin-1 Supplement → Latin Extended-B, và Latin Extended Additional (ạ ế ữ ỗ…).
    for (const lang of ['ja', 'vi'] as const) expect(DICT[lang].appName).not.toMatch(/[À-ɏḀ-ỿ]/);
  });

  it('mọi tên + mô tả + câu hỏi trong catalog có đủ ja và vi', () => {
    for (const s of [...BOARDS.flatMap((b) => [b.name, b.desc, b.question]), PROJECT_CHURN.name, PROJECT_CHURN.desc, PROJECT_CHURN.question]) {
      expect(s.ja.trim()).not.toBe('');
      expect(s.vi.trim()).not.toBe('');
    }
  });
});
