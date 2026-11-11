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

// 24 tháng: 2024-12 … 2026-11 (giống dữ liệu demo, tháng cuối chưa trọn).
const MONTHS = Array.from({ length: 24 }, (_, i) => addMonths('2024-12', i));
const rows: Row[] = MONTHS.map((m, i) => ({ month: `${m}-01`, new_mrr: i + 1, mrr_end: 1000 + i }));

describe('tháng', () => {
  it('ymOf đọc cả YYYY-MM lẫn YYYY-MM-DD, bỏ rác', () => {
    expect(ymOf('2026-11-01')).toBe('2026-11');
    expect(ymOf('2026-11')).toBe('2026-11');
    for (const v of ['2026-13', '2026-00', '26-11', '', null, 202611, '2026-1', 'x2026-11']) expect(ymOf(v)).toBeNull();
  });

  it('cộng tháng qua năm, cả âm', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-01', -13)).toBe('2024-12');
    expect(rangeLength({ from: '2025-12', to: '2026-11' })).toBe(12);
  });

  it('monthsOf: lấy TỪ DỮ LIỆU, không trùng, tăng dần, bỏ ô sai', () => {
    const r: Row[] = [{ month: '2026-02-01' }, { month: '2026-01-01' }, { month: '2026-02-01' }, { month: null }, { month: 'abc' }];
    expect(monthsOf(r)).toEqual(['2026-01', '2026-02']);
    // Ảnh chụp tuần ⇒ tháng chứa nó.
    expect(monthsOf([{ snapshot_date: '2026-03-30' }, { snapshot_date: '2026-04-06' }], 'snapshot_date')).toEqual(['2026-03', '2026-04']);
  });
});

describe('mặc định', () => {
  it('12 tháng kết thúc ở tháng mới nhất CÓ TRONG DỮ LIỆU', () => {
    expect(defaultRange(MONTHS)).toEqual({ from: '2025-12', to: '2026-11' });
  });
  it('dữ liệu ngắn hơn 12 tháng ⇒ cả chuỗi; rỗng ⇒ null', () => {
    expect(defaultRange(['2026-09', '2026-10', '2026-11'])).toEqual({ from: '2026-09', to: '2026-11' });
    expect(defaultRange([])).toBeNull();
  });
  it('1 tháng mặc định = tháng mới nhất', () => {
    expect(resolveMonth(undefined, MONTHS)).toBe('2026-11');
    expect(resolveMonth(undefined, [])).toBeNull();
  });
});

describe('giá trị từ URL', () => {
  const def = { from: '2025-12', to: '2026-11' };
  it('hợp lệ ⇒ giữ', () => {
    expect(resolveRange({ from: '2025-01', to: '2025-03' }, MONTHS)).toEqual({ from: '2025-01', to: '2025-03' });
    expect(resolveRange({ from: '2024-12', to: '2026-11' }, MONTHS)).toEqual({ from: '2024-12', to: '2026-11' });
    expect(resolveMonth('2025-06', MONTHS)).toBe('2025-06');
  });
  it('rác / thiếu một đầu / đảo ngược / ngoài phạm vi ⇒ mặc định, không lỗi', () => {
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
  it('dữ liệu rỗng ⇒ null', () => {
    expect(resolveRange({ from: '2025-01', to: '2025-03' }, [])).toBeNull();
  });
  it('bằng mặc định ⇒ query rỗng (URL sạch); khác ⇒ có query', () => {
    expect(rangeQuery(def, def)).toEqual({});
    expect(rangeQuery({ from: '2025-01', to: '2025-03' }, def)).toEqual({ from: '2025-01', to: '2025-03' });
    expect(monthQuery('2026-11', '2026-11')).toEqual({});
    expect(monthQuery('2026-10', '2026-11')).toEqual({ month: '2026-10' });
  });
});

describe('khoảng trước + cộng luồng + tồn kho', () => {
  it('khoảng trước dài bằng nhau, nằm sát ngay trước', () => {
    expect(prevRange({ from: '2025-12', to: '2026-11' })).toEqual({ from: '2024-12', to: '2025-11' });
    expect(prevRange({ from: '2026-01', to: '2026-01' })).toEqual({ from: '2025-12', to: '2025-12' });
  });

  it('khoảng trước ở MÉP dữ liệu: vừa khít ⇒ có; lố 1 tháng ⇒ không (so sánh "—")', () => {
    expect(covers(MONTHS, prevRange({ from: '2025-12', to: '2026-11' }))).toBe(true);
    expect(covers(MONTHS, prevRange({ from: '2025-11', to: '2026-11' }))).toBe(false);
    expect(covers(MONTHS, prevRange({ from: '2024-12', to: '2024-12' }))).toBe(false);
  });

  it('luồng: cộng cả khoảng', () => {
    // new_mrr của tháng thứ i = i+1; 2026-09..2026-11 = tháng 22,23,24.
    expect(sumFlow(rows, { from: '2026-09', to: '2026-11' }, 'new_mrr')).toBe(22 + 23 + 24);
    expect(sumFlow(rows, { from: '2024-12', to: '2024-12' }, 'new_mrr')).toBe(1);
  });

  it('luồng: khoảng có tháng thiếu dòng hoặc thiếu số ⇒ null, không phải tổng thiếu', () => {
    expect(sumFlow(rows, { from: '2024-11', to: '2024-12' }, 'new_mrr')).toBeNull();
    const holed = rows.filter((r) => r.month !== '2026-10-01');
    expect(sumFlow(holed, { from: '2026-09', to: '2026-11' }, 'new_mrr')).toBeNull();
    const nulled = rows.map((r) => (r.month === '2026-10-01' ? { ...r, new_mrr: null } : r));
    expect(sumFlow(nulled, { from: '2026-09', to: '2026-11' }, 'new_mrr')).toBeNull();
  });

  it('tồn kho: giá trị tháng CUỐI khoảng, không cộng', () => {
    expect(stockAt(rows, '2026-11', 'mrr_end')).toBe(1023);
    expect(stockAt(rows, '2027-01', 'mrr_end')).toBeNull();
  });

  it('sliceRows lọc theo tháng chứa ngày (ảnh chụp tuần)', () => {
    const weekly: Row[] = [{ snapshot_date: '2026-02-23' }, { snapshot_date: '2026-03-02' }, { snapshot_date: '2026-03-30' }, { snapshot_date: '2026-04-06' }];
    expect(sliceRows(weekly, { from: '2026-03', to: '2026-03' }, 'snapshot_date')).toHaveLength(2);
  });
});
