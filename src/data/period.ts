// ─────────────────────────────────────────────────────────────────────────────
// MONTH filter — the PURE part (kit 01 §6, month part only). Doesn't go through Date (avoids timezone shifts).
//
// Rules:
//   · Months are written 'YYYY-MM' (URL) — data rows carry 'YYYY-MM-01'; `ymOf` reads both.
//   · The month list + default come FROM THE DATA, not from the viewer's machine clock.
//   · FLOW quantities (new MRR, invoices, new users…) ⇒ SUM over the range (`sumFlow`).
//     STOCK quantities (end-of-month MRR, paying companies, end-of-month users, MAU) ⇒ value of the LAST
//     MONTH of the range (`stockAt`).
//   · Compare with the PREVIOUS range of equal length; that range not fully inside the data ⇒ null ("—").
// ─────────────────────────────────────────────────────────────────────────────
import type { Row } from './api';

export type Ym = string;
export interface MonthRange {
  from: Ym;
  to: Ym;
}

/** Default number of months for the range filter. */
export const DEFAULT_SPAN = 12;

const YM_RE = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/;

/** 'YYYY-MM' or 'YYYY-MM-DD' → 'YYYY-MM'; malformed ⇒ null. */
export function ymOf(v: unknown): Ym | null {
  if (typeof v !== 'string') return null;
  const m = YM_RE.exec(v);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** String in EXACTLY the 'YYYY-MM' form (URL value). */
export const isYm = (v: unknown): v is Ym => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

const index = (ym: Ym): number => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const fromIndex = (i: number): Ym => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;

export const addMonths = (ym: Ym, n: number): Ym => fromIndex(index(ym) + n);

/** Number of months in the range (both ends inclusive). */
export const rangeLength = (r: MonthRange): number => index(r.to) - index(r.from) + 1;

export const inRange = (ym: Ym, r: MonthRange): boolean => ym >= r.from && ym <= r.to;

export const sameRange = (a: MonthRange | null, b: MonthRange | null): boolean =>
  a === b || (a != null && b != null && a.from === b.from && a.to === b.to);

/** Months present in the data (unique, ascending). Malformed cells are skipped. */
export function monthsOf(rows: readonly Row[], key = 'month'): Ym[] {
  const s = new Set<Ym>();
  for (const r of rows) {
    const ym = ymOf(r[key]);
    if (ym) s.add(ym);
  }
  return [...s].sort();
}

/** Default: `span` months ENDING at the latest month in the data (shorter if the data is shorter). */
export function defaultRange(months: readonly Ym[], span = DEFAULT_SPAN): MonthRange | null {
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last) return null;
  const from = addMonths(last, -(span - 1));
  return { from: from < first ? first : from, to: last };
}

/** Range from the URL → a usable range. Missing an end, malformed, reversed, outside the data range
 *  ⇒ default (no error). Empty data ⇒ null. */
export function resolveRange(q: { from?: string; to?: string }, months: readonly Ym[], span = DEFAULT_SPAN): MonthRange | null {
  const def = defaultRange(months, span);
  if (!def) return null;
  const { from, to } = q;
  const first = months[0] as Ym;
  const last = months.at(-1) as Ym;
  if (!isYm(from) || !isYm(to) || from > to || from < first || to > last) return def;
  return { from, to };
}

/** Month from the URL → a usable month: must BE in the list; otherwise the latest month. */
export function resolveMonth(q: string | undefined, months: readonly Ym[]): Ym | null {
  if (isYm(q) && months.includes(q)) return q;
  return months.at(-1) ?? null;
}

/** The PREVIOUS range, of equal length, immediately before. */
export function prevRange(r: MonthRange): MonthRange {
  const n = rangeLength(r);
  return { from: addMonths(r.from, -n), to: addMonths(r.to, -n) };
}

/** Whether the range lies ENTIRELY within the data range. */
export function covers(months: readonly Ym[], r: MonthRange): boolean {
  const first = months[0];
  const last = months.at(-1);
  return first != null && last != null && r.from >= first && r.to <= last;
}

/** Rows whose month (or date) falls within the range. */
export function sliceRows(rows: readonly Row[], r: MonthRange, key = 'month'): Row[] {
  return rows.filter((row) => {
    const ym = ymOf(row[key]);
    return ym != null && inRange(ym, r);
  });
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** FLOW: sum column `key` over the rows in the range. A range with a month missing a row / missing a number ⇒ null
 *  (a total missing a month looks like a real number but is wrong). */
export function sumFlow(rows: readonly Row[], r: MonthRange, key: string): number | null {
  const picked = sliceRows(rows, r);
  if (picked.length !== rangeLength(r)) return null;
  let s = 0;
  for (const row of picked) {
    const v = num(row[key]);
    if (v == null) return null;
    s += v;
  }
  return s;
}

/** STOCK: value of column `key` in month `ym` (usually = the last month of the range). Missing ⇒ null. */
export function stockAt(rows: readonly Row[], ym: Ym, key: string): number | null {
  const row = rows.find((x) => ymOf(x.month) === ym);
  return row ? num(row[key]) : null;
}

/** Row of exactly month `ym` (for last-month ratios: ARPA, DAU/MAU…). */
export function rowAt(rows: readonly Row[], ym: Ym): Row | null {
  return rows.find((x) => ymOf(x.month) === ym) ?? null;
}

// ── URL parameters ──

export interface FilterQuery {
  from?: string;
  to?: string;
  month?: string;
}

/** Range → query. Equal to default ⇒ {} (clean URL; "differs from default" ⇔ URL has a query). */
export function rangeQuery(r: MonthRange | null, def: MonthRange | null): FilterQuery {
  return r == null || sameRange(r, def) ? {} : { from: r.from, to: r.to };
}

export function monthQuery(m: Ym | null, def: Ym | null): FilterQuery {
  return m == null || m === def ? {} : { month: m };
}
