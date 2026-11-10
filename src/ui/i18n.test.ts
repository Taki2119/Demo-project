import { describe, expect, it } from 'vitest';
import { BOARDS, PROJECT_CHURN } from '../nav/catalog';
import { DICT } from './i18n';

describe('song ngữ', () => {
  it('DICT.ja và DICT.vi có CÙNG bộ key, không chuỗi rỗng', () => {
    expect(Object.keys(DICT.vi).sort()).toEqual(Object.keys(DICT.ja).sort());
    for (const lang of ['ja', 'vi'] as const) for (const v of Object.values(DICT[lang])) expect(v.trim()).not.toBe('');
  });

  it('mọi tên + mô tả trong catalog có đủ ja và vi', () => {
    for (const s of [...BOARDS.flatMap((b) => [b.name, b.desc]), PROJECT_CHURN.name, PROJECT_CHURN.desc]) {
      expect(s.ja.trim()).not.toBe('');
      expect(s.vi.trim()).not.toBe('');
    }
  });
});
