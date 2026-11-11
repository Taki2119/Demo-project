// PURE part of the early-churn-warning project page.
import type { Row } from './api';
import { ratio } from './metrics';

export const BAND_ORDER = ['cancel_scheduled', 'high', 'medium', 'low'] as const;

/** Precision by band: among snapshots that already have 90 days after them, what % actually churned. */
export function precisionByBand(rows: readonly Row[]): { band: string; n: number; churnRate: number | null }[] {
  return BAND_ORDER.map((band) => {
    const labeled = rows.filter((r) => r.risk_band === band && typeof r.churned_within_90d === 'boolean');
    const churned = labeled.filter((r) => r.churned_within_90d === true).length;
    return { band, n: labeled.length, churnRate: ratio(churned, labeled.length) };
  });
}

/** Watch list: drop the low band, sort by band then score descending. */
export function watchOrder(rows: readonly Row[]): Row[] {
  const rank = (r: Row) => (BAND_ORDER as readonly string[]).indexOf(String(r.risk_band));
  return rows
    .filter((r) => r.risk_band !== 'low')
    .sort((a, b) => rank(a) - rank(b) || Number(b.risk_score) - Number(a.risk_score));
}
