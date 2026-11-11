import { describe, expect, it } from 'vitest';
import { BOARD_KEYS, PLAN_KEYS } from './catalog';
import { parseHash, toHash } from './route';

describe('route', () => {
  it('điểm bất động: toHash(parseHash(h)) === h cho mọi trang hợp lệ', () => {
    const hashes = ['#/', '#/project/churn', '#/about', ...PLAN_KEYS.flatMap((p) => BOARD_KEYS.map((b) => `#/plans/${p}/${b}`))];
    for (const h of hashes) expect(toHash(parseHash(h))).toBe(h);
    expect(hashes).toHaveLength(3 + 16);
  });

  it('hash lạ hoặc thiếu đoạn ⇒ Home', () => {
    for (const h of ['', '#', '#/nope', '#/plans/gold/revenue', '#/plans/all', '#/plans/all/revenue/extra', '#/project', '#/about/x']) {
      expect(parseHash(h)).toEqual({ kind: 'home' });
    }
  });

  it('đọc đúng gói và bảng', () => {
    expect(parseHash('#/plans/growth/by-company')).toEqual({ kind: 'board', plan: 'growth', board: 'by-company' });
  });
});
