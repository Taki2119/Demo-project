import { describe, expect, it } from 'vitest';
import { BOARD_KEYS, PLAN_KEYS } from './catalog';
import { parseHash, parseQuery, toHash, toQueryString } from './route';

describe('route', () => {
  it('fixed point: toHash(parseHash(h)) === h for every valid page', () => {
    const hashes = ['#/', '#/project/churn', '#/about', ...PLAN_KEYS.flatMap((p) => BOARD_KEYS.map((b) => `#/plans/${p}/${b}`))];
    for (const h of hashes) expect(toHash(parseHash(h))).toBe(h);
    expect(hashes).toHaveLength(3 + 16);
  });

  it('unknown hash or missing segment ⇒ Home', () => {
    for (const h of ['', '#', '#/nope', '#/plans/gold/revenue', '#/plans/all', '#/plans/all/revenue/extra', '#/project', '#/about/x']) {
      expect(parseHash(h)).toEqual({ kind: 'home' });
    }
  });

  it('reads plan and board correctly', () => {
    expect(parseHash('#/plans/growth/by-company')).toEqual({ kind: 'board', plan: 'growth', board: 'by-company' });
  });

  it('query: fixed point on valid hash + query', () => {
    const cases = [
      '#/plans/all/revenue?from=2025-01&to=2025-06',
      '#/plans/growth/users?from=2026-11&to=2026-11',
      '#/plans/scale/by-user?month=2026-10',
      '#/plans/all/by-company?month=2025-02',
      '#/project/churn?from=2025-12&to=2026-11',
      '#/plans/all/revenue',
    ];
    for (const h of cases) {
      const r = parseHash(h);
      expect(toHash(r) + toQueryString(parseQuery(h, r))).toBe(h);
    }
  });

  it('query does not break the route', () => {
    expect(parseHash('#/plans/all/revenue?from=2025-01')).toEqual({ kind: 'board', plan: 'all', board: 'revenue' });
    expect(parseHash('#/project/churn?x=1')).toEqual({ kind: 'churn' });
  });

  it('garbage query is dropped: unknown keys, keys not for the page, malformed values', () => {
    const q = (h: string) => parseQuery(h, parseHash(h));
    expect(q('#/plans/all/revenue?from=2025-13&to=abc')).toEqual({});
    expect(q('#/plans/all/revenue?from=2025-01&to=2025-1&x=2025-01')).toEqual({ from: '2025-01' });
    expect(q('#/plans/all/revenue?month=2025-01')).toEqual({});
    expect(q('#/plans/all/by-user?from=2025-01&to=2025-02')).toEqual({});
    expect(q('#/plans/all/by-user?month=2025-01-01')).toEqual({});
    expect(q('#/about?from=2025-01&to=2025-02')).toEqual({});
    expect(q('#/?month=2025-01')).toEqual({});
    expect(q('#/plans/all/revenue?')).toEqual({});
    expect(q('#/plans/all/revenue?%E0%A4%A=1&from=2025-01')).toEqual({ from: '2025-01' });
  });

  it('fixed key order when building', () => {
    expect(toQueryString({ to: '2025-06', from: '2025-01' })).toBe('?from=2025-01&to=2025-06');
    expect(toQueryString({})).toBe('');
  });
});

