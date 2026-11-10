// Gộp các bảng (tháng × gói) thành MỘT dòng mỗi tháng.
//   · plan = 'all'  ⇒ CỘNG mọi gói theo tháng — đúng vì mart chỉ chở số cộng được và mỗi công ty
//                     ở đúng một gói mỗi tháng (docs/SCHEMA.md §4).
//   · plan = mã gói ⇒ lọc đúng gói đó.
// Cột KHÔNG cộng được (khoá thời gian, cờ) lấy nguyên giá trị của tháng.
import type { PlanKey } from '../nav/catalog';
import type { Row } from './api';

const NON_ADDITIVE = new Set(['month', 'measure_date', 'is_closed', 'days_in_period', 'plan_id']);

export function rollupByMonth(rows: readonly Row[], plan: PlanKey): Row[] {
  const picked = plan === 'all' ? rows : rows.filter((r) => r.plan_id === plan);
  const byMonth = new Map<string, Row>();
  for (const r of picked) {
    const month = String(r.month);
    const acc = byMonth.get(month);
    if (!acc) {
      byMonth.set(month, { ...r, plan_id: plan });
      continue;
    }
    for (const [k, v] of Object.entries(r)) {
      if (NON_ADDITIVE.has(k)) continue;
      const cur = acc[k];
      if (typeof v === 'number' && typeof cur === 'number') acc[k] = cur + v;
    }
  }
  return [...byMonth.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

/** Ép các cột số đang ở dạng chuỗi (Postgres numeric → JSON string) về number. */
export function numericRows(rows: readonly Row[]): Row[] {
  return rows.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) {
      o[k] = typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && !NON_ADDITIVE.has(k) && !k.endsWith('_id') ? Number(v) : v;
    }
    return o;
  });
}
