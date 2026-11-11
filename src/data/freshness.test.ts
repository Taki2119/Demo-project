// Dates in this file are HAND-TYPED for the test.
import { describe, expect, it } from 'vitest';
import { oldestDate } from './freshness';

describe('oldestDate', () => {
  it('several sources ⇒ the OLDEST date, across month / year', () => {
    expect(oldestDate(['2026-11-10', '2026-11-03', '2026-12-01'])).toBe('2026-11-03');
    expect(oldestDate(['2027-01-02', '2026-12-31'])).toBe('2026-12-31');
    expect(oldestDate(['2026-11-10'])).toBe('2026-11-10');
  });
  it('empty, or a source with unknown date ⇒ null (no guessing)', () => {
    expect(oldestDate([])).toBeNull();
    expect(oldestDate(['2026-11-10', null])).toBeNull();
    expect(oldestDate(['2026-11-10', undefined])).toBeNull();
    expect(oldestDate(['2026-11-10', '10/11/2026'])).toBeNull();
  });
});
