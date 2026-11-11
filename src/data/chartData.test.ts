// Numbers in this file are HAND-TYPED for the test, not the app's sample data.
import { describe, expect, it } from 'vitest';
import type { Row } from './api';
import { countBy, crossCount, fillMonths, histogram, maxAbs, monthProgress, negate, pickColumns, stackTotals, stickinessByMonth, sumByKey } from './chartData';

describe('chartData', () => {
  it('pickColumns: non-number ⇒ null, NOT 0', () => {
    const rows: Row[] = [{ month: '2026-01-01', a: 5, b: null }, { month: '2026-02-01', a: 'x', b: 0 }];
    expect(pickColumns(rows, 'month', ['a', 'b'])).toEqual([
      { month: '2026-01-01', a: 5, b: null },
      { month: '2026-02-01', a: null, b: 0 },
    ]);
  });

  it('maxAbs / stackTotals skip missing cells; no numbers at all ⇒ null', () => {
    expect(maxAbs([{ a: -7, b: 3 }, { a: null, b: 2 }], ['a', 'b'])).toBe(7);
    expect(maxAbs([{ a: null }], ['a'])).toBeNull();
    const t = stackTotals([{ n: 3, e: null, c: -2 }, { n: null, e: null, c: null }], [{ key: 'n' }, { key: 'e' }, { key: 'c', sign: -1 }]);
    expect(t).toEqual([{ up: 3, down: -2 }, { up: null, down: null }]);
  });

  it('negate keeps null', () => {
    expect(negate([{ x: 4 }, { x: null }], 'x', 'y').map((p) => p.y)).toEqual([-4, null]);
  });

  it('DAU/MAU: denominator 0 or missing ⇒ null', () => {
    const rows: Row[] = [
      { month: '2026-01-01', active_user_days: 300, days_in_period: 30, mau: 40 },
      { month: '2026-02-01', active_user_days: 0, days_in_period: 28, mau: 0 },
      { month: '2026-03-01', active_user_days: null, days_in_period: 31, mau: 10 },
    ];
    expect(stickinessByMonth(rows).map((p) => p.stickiness)).toEqual([0.25, null, null]);
  });

  it('histogram: lower bounds, last bucket open, null skipped, empty bucket = real 0', () => {
    expect(histogram([0, 1, 4, 5, 9, 10, 25, null], [0, 1, 5, 10, 20])).toEqual([1, 2, 2, 1, 1]);
    expect(histogram([], [0, 1])).toEqual([0, 0]);
  });

  it('countBy descending, drops missing codes', () => {
    expect(countBy([{ r: 'b' }, { r: 'a' }, { r: 'b' }, { r: null }], 'r')).toEqual([{ code: 'b', n: 2 }, { code: 'a', n: 1 }]);
  });

  it('crossCount: one row per point, missing code ⇒ real 0; codes outside the list are dropped', () => {
    const rows: Row[] = [
      { d: '2026-01-04', band: 'high' },
      { d: '2026-01-04', band: 'low' },
      { d: '2026-01-11', band: 'medium' },
      { d: '2026-01-11', band: 'high' },
    ];
    expect(crossCount(rows, 'd', 'band', ['high', 'medium'])).toEqual([
      { d: '2026-01-04', high: 1, medium: 0 },
      { d: '2026-01-11', high: 1, medium: 1 },
    ]);
  });

  it('fillMonths: fills empty months BETWEEN first and last with 0, across years; no filling outside the range', () => {
    const pts = [{ m: '2025-11-01', a: 2 }, { m: '2026-02-01', a: 1 }];
    expect(fillMonths(pts, 'm', ['a'])).toEqual([
      { m: '2025-11-01', a: 2 },
      { m: '2025-12-01', a: 0 },
      { m: '2026-01-01', a: 0 },
      { m: '2026-02-01', a: 1 },
    ]);
    expect(fillMonths([], 'm', ['a'])).toEqual([]);
  });

  it('sumByKey: sums per point; a column with no number at that point ⇒ null', () => {
    const rows: Row[] = [
      { m: '2026-02-01', a: 1, b: null },
      { m: '2026-01-01', a: 2, b: 3 },
      { m: '2026-02-01', a: 4, b: null },
    ];
    expect(sumByKey(rows, 'm', ['a', 'b'])).toEqual([
      { m: '2026-01-01', a: 2, b: 3 },
      { m: '2026-02-01', a: 5, b: null },
    ]);
  });

  it('monthProgress: day 1, last day of month, February of a leap year, past month, missing day', () => {
    expect(monthProgress('2026-11-01', '2026-11-01')).toEqual({ complete: false, day: 1 });
    expect(monthProgress('2026-11-01', '2026-11-10')).toEqual({ complete: false, day: 10 });
    expect(monthProgress('2026-11-01', '2026-11-30')).toEqual({ complete: true });
    expect(monthProgress('2026-12-01', '2026-12-30')).toEqual({ complete: false, day: 30 });
    expect(monthProgress('2028-02-01', '2028-02-28')).toEqual({ complete: false, day: 28 });
    expect(monthProgress('2028-02-01', '2028-02-29')).toEqual({ complete: true });
    expect(monthProgress('2026-02-01', '2026-02-28')).toEqual({ complete: true });
    expect(monthProgress('2100-02-01', '2100-02-28')).toEqual({ complete: true });
    expect(monthProgress('2026-10-01', '2026-11-10')).toEqual({ complete: true });
    expect(monthProgress('2025-12-01', '2026-01-01')).toEqual({ complete: true });
    expect(monthProgress('2026-11-01', null)).toBeNull();
    expect(monthProgress('2026-12-01', '2026-11-10')).toBeNull();
  });
});
