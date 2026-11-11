// Shaping data for charts — PURE functions. Rule: missing / non-number / denominator 0 ⇒ null
// (chart line breaks, tooltip "—"), NEVER replaced with 0. A real count of 0 is still 0.
import type { Row } from './api';
import { stickiness } from './metrics';

export type Point = Record<string, string | number | null>;

export const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Keep the x key (string) + the numeric columns; any column that isn't a number ⇒ null. */
export function pickColumns(rows: readonly Row[], xKey: string, keys: readonly string[]): Point[] {
  return rows.map((r) => {
    const p: Point = { [xKey]: String(r[xKey] ?? '') };
    for (const k of keys) p[k] = num(r[k]);
    return p;
  });
}

/** Largest absolute value across the columns (the target for picking the money scale). null if there are no numbers. */
export function maxAbs(points: readonly Point[], keys: readonly string[]): number | null {
  let m: number | null = null;
  for (const p of points) for (const k of keys) {
    const v = num(p[k]);
    if (v != null) m = Math.max(m ?? 0, Math.abs(v));
  }
  return m;
}

/** Stacked total per side of diverging bars ({up, down}) — to pick the axis scale. Missing cells are SKIPPED;
 *  a side with no cells ⇒ null. */
export function stackTotals(points: readonly Point[], stacks: readonly { key: string; sign?: 1 | -1 }[]): Point[] {
  const side = (p: Point, s: 1 | -1) => {
    const vs = stacks.filter((x) => (x.sign ?? 1) === s).map((x) => num(p[x.key])).filter((v): v is number => v != null);
    return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
  };
  return points.map((p) => ({ up: side(p, 1), down: side(p, -1) }));
}

/** Flip the sign of a column (OUT flow drawn below the 0 line). null stays null. */
export function negate(points: readonly Point[], key: string, as: string): Point[] {
  return points.map((p) => {
    const v = num(p[key]);
    return { ...p, [as]: v == null ? null : -v };
  });
}

/** Count by range: `edges` = lower bound of each bucket (ascending), the last bucket is open. null is skipped.
 *  An empty bucket has a REAL count of 0 (not missing data). */
export function histogram(values: readonly (number | null)[], edges: readonly number[]): number[] {
  const out = edges.map(() => 0);
  for (const v of values) {
    if (v == null) continue;
    let i = -1;
    for (let j = 0; j < edges.length; j++) if (v >= (edges[j] as number)) i = j;
    if (i >= 0) out[i] = (out[i] as number) + 1;
  }
  return out;
}

/** Count rows by the code in column `key` (e.g. top_reason), descending. Missing codes are skipped. */
export function countBy(rows: readonly Row[], key: string): { code: string; n: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const c = r[key];
    if (typeof c === 'string' && c !== '') m.set(c, (m.get(c) ?? 0) + 1);
  }
  return [...m].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n || a.code.localeCompare(b.code));
}

/** Cross-tab: one row per `xKey` value, one column per code in `codes` = number of rows with that code.
 *  An x point present in the data with none of the codes ⇒ real 0. */
export function crossCount(rows: readonly Row[], xKey: string, codeKey: string, codes: readonly string[]): Point[] {
  const m = new Map<string, Point>();
  for (const r of rows) {
    const x = String(r[xKey] ?? '');
    if (!x) continue;
    let p = m.get(x);
    if (!p) {
      p = { [xKey]: x, ...Object.fromEntries(codes.map((c) => [c, 0])) };
      m.set(x, p);
    }
    const c = r[codeKey];
    if (typeof c === 'string' && codes.includes(c)) p[c] = (p[c] as number) + 1;
  }
  return [...m.values()].sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
}

/** Sum numeric columns by `xKey` (e.g. month × channel ⇒ month). An x point where a column has no number ⇒ null. */
export function sumByKey(rows: readonly Row[], xKey: string, keys: readonly string[]): Point[] {
  const m = new Map<string, Point>();
  for (const r of rows) {
    const x = String(r[xKey] ?? '');
    if (!x) continue;
    const p = m.get(x) ?? { [xKey]: x, ...Object.fromEntries(keys.map((k) => [k, null])) };
    for (const k of keys) {
      const v = num(r[k]);
      if (v != null) p[k] = ((p[k] as number | null) ?? 0) + v;
    }
    m.set(x, p);
  }
  return [...m.values()].sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
}

/** Fill EMPTY months between the first and last month for EVENT-COUNT sources (rows only exist when there's an
 *  event): a month without rows = REAL 0 events, not missing data. No filling before the first
 *  month / after the last month. x key in 'YYYY-MM-01' form; doesn't go through Date. */
export function fillMonths(points: readonly Point[], xKey: string, keys: readonly string[]): Point[] {
  if (points.length === 0) return [];
  const byMonth = new Map(points.map((p) => [String(p[xKey]).slice(0, 7), p]));
  const sorted = [...byMonth.keys()].sort();
  const [y0, m0] = (sorted[0] as string).split('-').map(Number) as [number, number];
  const last = sorted.at(-1) as string;
  const out: Point[] = [];
  for (let y = y0, m = m0; ; m === 12 ? ((y += 1), (m = 1)) : (m += 1)) {
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    out.push(byMonth.get(ym) ?? { [xKey]: `${ym}-01`, ...Object.fromEntries(keys.map((k) => [k, 0])) });
    if (ym === last) break;
  }
  return out;
}

/** DAU/MAU by month (docs/SCHEMA.md §4.2). Missing column or denominator 0 ⇒ null. */
export function stickinessByMonth(rows: readonly Row[]): Point[] {
  return rows.map((r) => {
    const aud = num(r.active_user_days);
    const days = num(r.days_in_period);
    const mau = num(r.mau);
    return { month: String(r.month ?? ''), stickiness: aud == null || days == null || mau == null ? null : stickiness(aud, days, mau) };
  });
}

/** Whether month `month` ('YYYY-MM-01') is complete, measured up to the data date `asOf` ('YYYY-MM-DD').
 *  · asOf in a later month, or exactly the last day of the month ⇒ { complete: true }
 *  · asOf within the month, before the last day ⇒ { complete: false, day } (day = asOf's day)
 *  · asOf missing / malformed / before the month ⇒ null (unknown — don't show anything).
 *  Doesn't go through Date (avoids timezone shifts); leap years per the Gregorian calendar. */
export function monthProgress(month: string, asOf: string | null): { complete: true } | { complete: false; day: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  const a = asOf ? /^(\d{4})-(\d{2})-(\d{2})/.exec(asOf) : null;
  if (!m || !a) return null;
  const ym = Number(m[1]) * 12 + Number(m[2]);
  const ya = Number(a[1]) * 12 + Number(a[2]);
  if (ya < ym) return null;
  if (ya > ym) return { complete: true };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const last = mo === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(mo) ? 30 : 31;
  const day = Number(a[3]);
  return day >= last ? { complete: true } : { complete: false, day };
}
