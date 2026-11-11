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

  it('null luôn nằm cuối ở CẢ hai chiều, và sort ổn định', () => {
    expect(ids(sortRows(rows, (r) => r.v, 'asc'))).toBe('cadbe');
    expect(ids(sortRows(rows, (r) => r.v, 'desc'))).toBe('adcbe');
  });

  it('chuỗi so bằng Collator, không đổi mảng gốc', () => {
    const s = [{ id: 'x', v: 'b' }, { id: 'y', v: 'a' }];
    expect(ids(sortRows(s, (r) => r.v, 'asc'))).toBe('yx');
    expect(ids(s)).toBe('xy');
  });

  it('toggleSort: cột mới ⇒ chiều đầu; cùng cột ⇒ đảo', () => {
    expect(toggleSort(null, 'mrr', 'desc')).toEqual({ key: 'mrr', dir: 'desc' });
    expect(toggleSort({ key: 'mrr', dir: 'desc' }, 'mrr', 'desc')).toEqual({ key: 'mrr', dir: 'asc' });
    expect(toggleSort({ key: 'mrr', dir: 'asc' }, 'name', 'asc')).toEqual({ key: 'name', dir: 'asc' });
  });
});

describe('tablePage', () => {
  it('đếm, kẹp và cắt trang (đánh số từ 1)', () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
    expect(clampPage(9, 41, 20)).toBe(3);
    expect(clampPage(0, 41, 20)).toBe(1);
    expect(pageSlice(3, 41, 20)).toEqual({ from: 40, to: 41 });
  });

  it('đổi cỡ trang vẫn giữ hàng đầu trong tầm nhìn', () => {
    expect(pageKeepingRow(60, 50)).toBe(2); // hàng 61 ở trang 2 khi 50/trang
    expect(pageKeepingRow(0, 100)).toBe(1);
  });

  it('pageItems: ≤7 liệt kê hết; nhiều hơn có gap; không gap thay đúng 1 trang', () => {
    expect(pageItems(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pageItems(1, 20)).toEqual([1, 2, 'gap', 20]);
    expect(pageItems(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
    expect(pageItems(3, 20)).toEqual([1, 2, 3, 4, 'gap', 20]);
    // trang 4: giữa 1 và 3 chỉ thiếu đúng trang 2 ⇒ hiện 2, không hiện gap
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
  });
});
