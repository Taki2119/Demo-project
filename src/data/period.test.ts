import { describe, expect, it } from 'vitest';
import type { Row } from './api';
import {
  addMonths,
  covers,
  defaultRange,
  monthQuery,
  monthsOf,
  prevRange,
  rangeLength,
  rangeQuery,
  resolveMonth,
  resolveRange,
  sliceRows,
  stockAt,
  sumFlow,
  ymOf,
} from './period';

// 24 months: 2024-12 … 2026-11 (like the demo data, last month partial).
const MONTHS = Array.from({ length: 24 }, (_, i) => addMonths('2024-12', i));
const rows: Row[] = MONTHS.map((m, i) => ({ month: `${m}-01`, new_mrr: i + 1, mrr_end: 1000 + i }));

describe('months', () => {
  it('ymOf reads both YYYY-MM and YYYY-MM-DD, drops garbage', () => {
    expect(ymOf('2026-11-01')).toBe('2026-11');
    expect(ymOf('2026-11')).toBe('2026-11');
    for (const v of ['2026-13', '2026-00', '26-11', '', null, 202611, '2026-1', 'x2026-11']) expect(ymOf(v)).toBeNull();
  });

  it('adds months across years, negatives too', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-01', -13)).toBe('2024-12');
    expect(rangeLength({ from: '2025-12', to: '2026-11' })).toBe(12);
  });

  it('monthsOf: taken FROM THE DATA, unique, ascending, drops bad cells', () => {
    const r: Row[] = [{ month: '2026-02-01' }, { month: '2026-01-01' }, { month: '2026-02-01' }, { month: null }, { month: 'abc' }];
    expect(monthsOf(r)).toEqual(['2026-01', '2026-02']);
    // Weekly snapshot ⇒ the month containing it.
    expect(monthsOf([{ snapshot_date: '2026-03-30' }, { snapshot_date: '2026-04-06' }], 'snapshot_date')).toEqual(['2026-03', '2026-04']);
  });
});

describe('default', () => {
  it('12 months ending at the latest month IN THE DATA', () => {
    expect(defaultRange(MONTHS)).toEqual({ from: '2025-12', to: '2026-11' });
  });
  it('data shorter than 12 months ⇒ the whole series; empty ⇒ null', () => {
    expect(defaultRange(['2026-09', '2026-10', '2026-11'])).toEqual({ from: '2026-09', to: '2026-11' });
    expect(defaultRange([])).toBeNull();
  });
  it('1-month default = the latest month', () => {
    expect(resolveMonth(undefined, MONTHS)).toBe('2026-11');
    expect(resolveMonth(undefined, [])).toBeNull();
  });
});

describe('values from the URL', () => {
  const def = { from: '2025-12', to: '2026-11' };
  it('valid ⇒ kept', () => {
    expect(resolveRange({ from: '2025-01', to: '2025-03' }, MONTHS)).toEqual({ from: '2025-01', to: '2025-03' });
    expect(resolveRange({ from: '2024-12', to: '2026-11' }, MONTHS)).toEqual({ from: '2024-12', to: '2026-11' });
    expect(resolveMonth('2025-06', MONTHS)).toBe('2025-06');
  });
  it('garbage / missing an end / reversed / out of range ⇒ default, no error', () => {
    const bad = [
      {},
      { from: '2025-01' },
      { to: '2025-03' },
      { from: '2025-13', to: '2026-01' },
      { from: 'abc', to: '2026-01' },
      { from: '2026-05', to: '2026-01' },
      { from: '2024-11', to: '2025-03' },
      { from: '2025-01', to: '2026-12' },
      { from: '2025-01-01', to: '2025-03' },
    ];
    for (const q of bad) expect(resolveRange(q, MONTHS)).toEqual(def);
    for (const m of ['2026-12', '2024-11', '2025-6', 'x', '']) expect(resolveMonth(m, MONTHS)).toBe('2026-11');
  });
  it('empty data ⇒ null', () => {
    expect(resolveRange({ from: '2025-01', to: '2025-03' }, [])).toBeNull();
  });
  it('equal to default ⇒ empty query (clean URL); different ⇒ has a query', () => {
    expect(rangeQuery(def, def)).toEqual({});
    expect(rangeQuery({ from: '2025-01', to: '2025-03' }, def)).toEqual({ from: '2025-01', to: '2025-03' });
    expect(monthQuery('2026-11', '2026-11')).toEqual({});
    expect(monthQuery('2026-10', '2026-11')).toEqual({ month: '2026-10' });
  });
});

describe('previous range + flow sum + stock', () => {
  it('previous range of equal length, immediately before', () => {
    expect(prevRange({ from: '2025-12', to: '2026-11' })).toEqual({ from: '2024-12', to: '2025-11' });
    expect(prevRange({ from: '2026-01', to: '2026-01' })).toEqual({ from: '2025-12', to: '2025-12' });
  });

  it('previous range at the data EDGE: exact fit ⇒ present; 1 month over ⇒ absent (comparison "—")', () => {
    expect(covers(MONTHS, prevRange({ from: '2025-12', to: '2026-11' }))).toBe(true);
    expect(covers(MONTHS, prevRange({ from: '2025-11', to: '2026-11' }))).toBe(false);
    expect(covers(MONTHS, prevRange({ from: '2024-12', to: '2024-12' }))).toBe(false);
  });

  it('flow: sums over the range', () => {
    // new_mrr of month i = i+1; 2026-09..2026-11 = months 22,23,24.
    expect(sumFlow(rows, { from: '2026-09', to: '2026-11' }, 'new_mrr')).toBe(22 + 23 + 24);
    expect(sumFlow(rows, { from: '2024-12', to: '2024-12' }, 'new_mrr')).toBe(1);
  });

  it('flow: a range with a month missing a row or a number ⇒ null, not a partial total', () => {
    expect(sumFlow(rows, { from: '2024-11', to: '2024-12' }, 'new_mrr')).toBeNull();
    const holed = rows.filter((r) => r.month !== '2026-10-01');
    expect(sumFlow(holed, { from: '2026-09', to: '2026-11' }, 'new_mrr')).toBeNull();
    const nulled = rows.map((r) => (r.month === '2026-10-01' ? { ...r, new_mrr: null } : r));
    expect(sumFlow(nulled, { from: '2026-09', to: '2026-11' }, 'new_mrr')).toBeNull();
  });

  it('stock: value of the LAST month of the range, not summed', () => {
    expect(stockAt(rows, '2026-11', 'mrr_end')).toBe(1023);
    expect(stockAt(rows, '2027-01', 'mrr_end')).toBeNull();
  });

  it('sliceRows filters by the month containing the date (weekly snapshot)', () => {
    const weekly: Row[] = [{ snapshot_date: '2026-02-23' }, { snapshot_date: '2026-03-02' }, { snapshot_date: '2026-03-30' }, { snapshot_date: '2026-04-06' }];
    expect(sliceRows(weekly, { from: '2026-03', to: '2026-03' }, 'snapshot_date')).toHaveLength(2);
  });
});
