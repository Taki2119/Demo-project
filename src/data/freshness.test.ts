// Ngày trong file này là ngày TỰ GÕ cho test.
import { describe, expect, it } from 'vitest';
import { oldestDate } from './freshness';

describe('oldestDate', () => {
  it('nhiều nguồn ⇒ ngày CŨ NHẤT, qua tháng / năm', () => {
    expect(oldestDate(['2026-11-10', '2026-11-03', '2026-12-01'])).toBe('2026-11-03');
    expect(oldestDate(['2027-01-02', '2026-12-31'])).toBe('2026-12-31');
    expect(oldestDate(['2026-11-10'])).toBe('2026-11-10');
  });
  it('rỗng, hoặc có nguồn không biết ngày ⇒ null (không đoán)', () => {
    expect(oldestDate([])).toBeNull();
    expect(oldestDate(['2026-11-10', null])).toBeNull();
    expect(oldestDate(['2026-11-10', undefined])).toBeNull();
    expect(oldestDate(['2026-11-10', '10/11/2026'])).toBeNull();
  });
});
