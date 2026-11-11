import { describe, expect, it } from 'vitest';
import { count, dayLabel, MINUS, moneyScale, monthLabel, monthShort, NO_VALUE, pct, scaled, yen } from './format';

describe('format', () => {
  it('null / NaN ⇒ "—", không bao giờ "0"', () => {
    for (const f of [yen, count, pct]) {
      expect(f(null, 'ja')).toBe(NO_VALUE);
      expect(f(Number.NaN, 'vi')).toBe(NO_VALUE);
    }
  });

  it('số âm dùng U+2212, đặt trước ký hiệu tiền', () => {
    expect(yen(-2400, 'ja')).toBe(`${MINUS}¥2,400`);
    expect(yen(-2400, 'vi')).toBe(`${MINUS}¥2.400`);
    expect(count(-12, 'ja')).toBe(`${MINUS}12`);
    expect(pct(-0.354, 'ja')).toBe(`${MINUS}35.4%`);
    expect(yen(-2400, 'ja')).not.toContain('-');
  });

  it('âm nhưng làm tròn ra 0 ⇒ không có dấu trừ', () => {
    expect(pct(-0.00001, 'ja')).toBe('0.0%');
  });

  it('nhãn tháng không đi qua Date', () => {
    expect(monthLabel('2026-11-01', 'ja')).toBe('2026年11月');
    expect(monthLabel('2026-11-01', 'vi')).toBe('Tháng 11/2026');
    expect(monthShort('2026-01-01', 'ja')).toBe('2026/1');
    expect(monthShort('2026-01-01', 'vi')).toBe('1/2026');
    expect(dayLabel('2026-11-08', 'ja')).toBe('2026年11月8日');
    expect(dayLabel('2026-11-08', 'vi')).toBe('8/11/2026');
  });

  it('thang tiền chọn theo đích; mọi nhãn cùng đơn vị', () => {
    const ja = moneyScale(10_980_820, 'ja');
    expect(ja.unit).toBe('万円');
    expect(scaled(10_980_820, ja, 'ja')).toBe('1,098');
    expect(scaled(0, ja, 'ja')).toBe('0');
    expect(moneyScale(250_000_000, 'ja').unit).toBe('億円');
    const vi = moneyScale(10_980_820, 'vi');
    expect(vi.unit).toBe('tr ¥');
    expect(scaled(10_980_820, vi, 'vi')).toBe('11');
    expect(scaled(-384_440, vi, 'vi')).toBe(`${MINUS}0,4`);
  });
});
