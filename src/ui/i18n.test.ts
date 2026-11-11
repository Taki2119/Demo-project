import { describe, expect, it } from 'vitest';
import { BOARDS, PROJECT_CHURN } from '../nav/catalog';
import { DICT } from './i18n';

describe('bilingual', () => {
  it('DICT.ja and DICT.vi have the SAME key set, no empty strings', () => {
    expect(Object.keys(DICT.vi).sort()).toEqual(Object.keys(DICT.ja).sort());
    for (const lang of ['ja', 'vi'] as const) for (const v of Object.values(DICT[lang])) expect(v.trim()).not.toBe('');
  });

  it('logo (appName) has no accented Latin letters — --font-display (Outfit) has no Vietnamese subset', () => {
    // Latin-1 Supplement → Latin Extended-B, and Latin Extended Additional (ạ ế ữ ỗ…).
    for (const lang of ['ja', 'vi'] as const) expect(DICT[lang].appName).not.toMatch(/[À-ɏḀ-ỿ]/);
  });

  it('every name + description + question in the catalog has both ja and vi', () => {
    for (const s of [...BOARDS.flatMap((b) => [b.name, b.desc, b.question]), PROJECT_CHURN.name, PROJECT_CHURN.desc, PROJECT_CHURN.question]) {
      expect(s.ja.trim()).not.toBe('');
      expect(s.vi.trim()).not.toBe('');
    }
  });
});
