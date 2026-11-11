import { describe, expect, it } from 'vitest';
import { clampPage, pageCount, pageItems, pageKeepingRow, pageSlice } from './tablePage';
import { sortRows, toggleSort } from './tableSort';

describe('tableSort', () => {
  const rows = [
    { id: 'a', v: 3 },
    { id: 'b', v: null },
    { id: 'c', v: 1 },
    { id: 'd', v: 3 },
    { id: 'e', v: null },
  ];
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join('');

  it('null always sorts last in BOTH directions, and the sort is stable', () => {
    expect(ids(sortRows(rows, (r) => r.v, 'asc'))).toBe('cadbe');
    expect(ids(sortRows(rows, (r) => r.v, 'desc'))).toBe('adcbe');
  });

  it('strings are compared with Collator, the original array is not mutated', () => {
    const s = [{ id: 'x', v: 'b' }, { id: 'y', v: 'a' }];
    expect(ids(sortRows(s, (r) => r.v, 'asc'))).toBe('yx');
    expect(ids(s)).toBe('xy');
  });

  it('toggleSort: new column ⇒ initial direction; same column ⇒ flip', () => {
    expect(toggleSort(null, 'mrr', 'desc')).toEqual({ key: 'mrr', dir: 'desc' });
    expect(toggleSort({ key: 'mrr', dir: 'desc' }, 'mrr', 'desc')).toEqual({ key: 'mrr', dir: 'asc' });
    expect(toggleSort({ key: 'mrr', dir: 'asc' }, 'name', 'asc')).toEqual({ key: 'name', dir: 'asc' });
  });
});

describe('tablePage', () => {
  it('counts, clamps and slices pages (numbered from 1)', () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
    expect(clampPage(9, 41, 20)).toBe(3);
    expect(clampPage(0, 41, 20)).toBe(1);
    expect(pageSlice(3, 41, 20)).toEqual({ from: 40, to: 41 });
  });

  it('changing the page size keeps the top row in view', () => {
    expect(pageKeepingRow(60, 50)).toBe(2); // row 61 is on page 2 at 50/page
    expect(pageKeepingRow(0, 100)).toBe(1);
  });

  it('pageItems: ≤7 lists all; more has gaps; no gap replaces exactly 1 page', () => {
    expect(pageItems(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pageItems(1, 20)).toEqual([1, 2, 'gap', 20]);
    expect(pageItems(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
    expect(pageItems(3, 20)).toEqual([1, 2, 3, 4, 'gap', 20]);
    // page 4: between 1 and 3 only page 2 is missing ⇒ show 2, not a gap
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
  });
});
