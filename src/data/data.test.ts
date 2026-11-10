import { describe, expect, it } from 'vitest';
import { cacheKey, parseResponse } from './api';
import { precisionByBand, watchOrder } from './churn';
import { indexColumns, indexLabels, labelOf } from './labels';
import { arpa, collectionRate, deltaRate, grossMrrChurn, logoChurn, nrr, ratio, seatUsage, stickiness } from './metrics';
import { numericRows, rollupByMonth } from './rollup';

describe('metrics — mẫu số 0 ⇒ null, không phải 0', () => {
  it('ratio', () => {
    expect(ratio(1, 0)).toBeNull();
    expect(ratio(null, 3)).toBeNull();
    expect(ratio(3, 4)).toBe(0.75);
  });
  it('các công thức theo docs/SCHEMA.md §4.2', () => {
    expect(arpa(300000, 6)).toBe(50000);
    expect(arpa(0, 0)).toBeNull();
    // mất 50.000 (huỷ −30.000, thu hẹp −20.000) trên 1.000.000 đầu kỳ
    expect(grossMrrChurn(-30000, -20000, 1000000)).toBe(0.05);
    expect(nrr({ mrrStart: 1000, expansion: 100, contraction: -50, churned: -100, planIn: 30, planOut: -20 })).toBeCloseTo(0.96);
    expect(logoChurn(2, 40)).toBe(0.05);
    expect(stickiness(300, 30, 20)).toBe(0.5); // DAU 10 / MAU 20
    expect(stickiness(300, 0, 20)).toBeNull();
    expect(seatUsage(8, 10)).toBe(0.8);
    expect(collectionRate(90, 100)).toBe(0.9);
    expect(deltaRate(110, 100)).toBeCloseTo(0.1);
    expect(deltaRate(-50, -100)).toBeCloseTo(0.5); // chia |trước|
    expect(deltaRate(5, 0)).toBeNull();
  });
});

describe('rollupByMonth', () => {
  const rows = [
    { month: '2026-01-01', plan_id: 'starter', is_closed: true, days_in_period: 31, mrr_end: 100, paying_companies: 2 },
    { month: '2026-01-01', plan_id: 'growth', is_closed: true, days_in_period: 31, mrr_end: 300, paying_companies: 1 },
    { month: '2026-02-01', plan_id: 'growth', is_closed: false, days_in_period: 10, mrr_end: 350, paying_companies: 1 },
  ];
  it("'all' cộng các gói theo tháng, giữ nguyên cột không cộng được", () => {
    expect(rollupByMonth(rows, 'all')).toEqual([
      { month: '2026-01-01', plan_id: 'all', is_closed: true, days_in_period: 31, mrr_end: 400, paying_companies: 3 },
      { month: '2026-02-01', plan_id: 'all', is_closed: false, days_in_period: 10, mrr_end: 350, paying_companies: 1 },
    ]);
  });
  it('một gói ⇒ chỉ lọc, xếp tăng theo tháng', () => {
    expect(rollupByMonth([...rows].reverse(), 'growth').map((r) => r.mrr_end)).toEqual([300, 350]);
  });
  it('numericRows ép chuỗi số về number, giữ mã và ngày', () => {
    expect(numericRows([{ month: '2026-01-01', company_id: '0012', mrr: '9800', name: 'x' }])).toEqual([
      { month: '2026-01-01', company_id: '0012', mrr: 9800, name: 'x' },
    ]);
  });
});

describe('api', () => {
  it('cacheKey không phụ thuộc thứ tự tham số', () => {
    expect(cacheKey('user-monthly', { plan: 'growth', month: '2026-01' })).toBe(cacheKey('user-monthly', { month: '2026-01', plan: 'growth' }));
    expect(cacheKey('labels')).toBe('labels');
  });
  it('parseResponse từ chối hình sai', () => {
    expect(parseResponse({ rows: [{ a: 1 }], updatedAt: '2026-11-10' })).toEqual({ rows: [{ a: 1 }], updatedAt: '2026-11-10' });
    expect(() => parseResponse({ rows: 'x' })).toThrow();
    expect(() => parseResponse({ rows: [[1]] })).toThrow();
    expect(() => parseResponse(null)).toThrow();
  });
});

describe('labels', () => {
  it('có nhãn ⇒ theo ngôn ngữ; chưa có ⇒ chính mã', () => {
    const idx = indexLabels([{ domain: 'plan', code: 'growth', ja: 'グロース', vi: 'Tăng trưởng' }]);
    expect(labelOf(idx, 'plan', 'growth', 'ja')).toBe('グロース');
    expect(labelOf(idx, 'plan', 'growth', 'vi')).toBe('Tăng trưởng');
    expect(labelOf(idx, 'plan', 'scale', 'vi')).toBe('scale');
    expect(indexColumns([{ column_name: 'mrr', ja: 'MRR', vi: 'MRR', unit: 'JPY' }]).get('mrr')).toEqual({ ja: 'MRR', vi: 'MRR' });
  });
});

describe('churn', () => {
  it('precisionByBand chỉ đếm ảnh chụp đã có nhãn', () => {
    const rows = [
      { risk_band: 'high', churned_within_90d: true },
      { risk_band: 'high', churned_within_90d: false },
      { risk_band: 'high', churned_within_90d: null },
      { risk_band: 'low', churned_within_90d: false },
    ];
    const p = precisionByBand(rows);
    expect(p.find((x) => x.band === 'high')).toEqual({ band: 'high', n: 2, churnRate: 0.5 });
    expect(p.find((x) => x.band === 'medium')).toEqual({ band: 'medium', n: 0, churnRate: null });
  });
  it('watchOrder bỏ band thấp, hẹn huỷ đứng đầu, rồi điểm giảm dần', () => {
    const rows = [
      { company_id: 'a', risk_band: 'high', risk_score: 70 },
      { company_id: 'b', risk_band: 'low', risk_score: 5 },
      { company_id: 'c', risk_band: 'cancel_scheduled', risk_score: 20 },
      { company_id: 'd', risk_band: 'high', risk_score: 90 },
    ];
    expect(watchOrder(rows).map((r) => r.company_id)).toEqual(['c', 'd', 'a']);
  });
});
