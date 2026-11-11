// ─────────────────────────────────────────────────────────────────────────────
// Bộ lọc THÁNG — phần THUẦN (kit 01 §6, chỉ phần tháng). Không đi qua Date (tránh lệch múi giờ).
//
// Luật:
//   · Tháng viết 'YYYY-MM' (URL) — dòng dữ liệu chở 'YYYY-MM-01'; `ymOf` đọc được cả hai.
//   · Danh sách tháng + mặc định lấy TỪ DỮ LIỆU, không từ đồng hồ máy người xem.
//   · Đại lượng LUỒNG (MRR mới, hoá đơn, user mới…) ⇒ CỘNG cả khoảng (`sumFlow`).
//     Đại lượng TỒN KHO (MRR cuối tháng, công ty trả tiền, user cuối tháng, MAU) ⇒ giá trị THÁNG
//     CUỐI khoảng (`stockAt`).
//   · So sánh với khoảng TRƯỚC dài bằng nhau; khoảng đó không nằm trọn trong dữ liệu ⇒ null ("—").
// ─────────────────────────────────────────────────────────────────────────────
import type { Row } from './api';

export type Ym = string;
export interface MonthRange {
  from: Ym;
  to: Ym;
}

/** Số tháng mặc định của bộ lọc khoảng. */
export const DEFAULT_SPAN = 12;

const YM_RE = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/;

/** 'YYYY-MM' hoặc 'YYYY-MM-DD' → 'YYYY-MM'; sai dạng ⇒ null. */
export function ymOf(v: unknown): Ym | null {
  if (typeof v !== 'string') return null;
  const m = YM_RE.exec(v);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** Chuỗi có ĐÚNG dạng 'YYYY-MM' (giá trị URL). */
export const isYm = (v: unknown): v is Ym => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

const index = (ym: Ym): number => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const fromIndex = (i: number): Ym => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;

export const addMonths = (ym: Ym, n: number): Ym => fromIndex(index(ym) + n);

/** Số tháng của khoảng (tính cả hai đầu). */
export const rangeLength = (r: MonthRange): number => index(r.to) - index(r.from) + 1;

export const inRange = (ym: Ym, r: MonthRange): boolean => ym >= r.from && ym <= r.to;

export const sameRange = (a: MonthRange | null, b: MonthRange | null): boolean =>
  a === b || (a != null && b != null && a.from === b.from && a.to === b.to);

/** Các tháng có trong dữ liệu (không trùng, tăng dần). Ô sai dạng bị bỏ qua. */
export function monthsOf(rows: readonly Row[], key = 'month'): Ym[] {
  const s = new Set<Ym>();
  for (const r of rows) {
    const ym = ymOf(r[key]);
    if (ym) s.add(ym);
  }
  return [...s].sort();
}

/** Mặc định: `span` tháng KẾT THÚC ở tháng mới nhất có trong dữ liệu (ngắn hơn nếu dữ liệu ngắn). */
export function defaultRange(months: readonly Ym[], span = DEFAULT_SPAN): MonthRange | null {
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last) return null;
  const from = addMonths(last, -(span - 1));
  return { from: from < first ? first : from, to: last };
}

/** Khoảng từ URL → khoảng dùng được. Thiếu một đầu, sai dạng, đảo ngược, ngoài phạm vi dữ liệu
 *  ⇒ mặc định (không lỗi). Dữ liệu rỗng ⇒ null. */
export function resolveRange(q: { from?: string; to?: string }, months: readonly Ym[], span = DEFAULT_SPAN): MonthRange | null {
  const def = defaultRange(months, span);
  if (!def) return null;
  const { from, to } = q;
  const first = months[0] as Ym;
  const last = months.at(-1) as Ym;
  if (!isYm(from) || !isYm(to) || from > to || from < first || to > last) return def;
  return { from, to };
}

/** Tháng từ URL → tháng dùng được: phải CÓ trong danh sách; không thì tháng mới nhất. */
export function resolveMonth(q: string | undefined, months: readonly Ym[]): Ym | null {
  if (isYm(q) && months.includes(q)) return q;
  return months.at(-1) ?? null;
}

/** Khoảng TRƯỚC, dài bằng nhau, nằm sát ngay trước. */
export function prevRange(r: MonthRange): MonthRange {
  const n = rangeLength(r);
  return { from: addMonths(r.from, -n), to: addMonths(r.to, -n) };
}

/** Khoảng có nằm TRỌN trong phạm vi dữ liệu không. */
export function covers(months: readonly Ym[], r: MonthRange): boolean {
  const first = months[0];
  const last = months.at(-1);
  return first != null && last != null && r.from >= first && r.to <= last;
}

/** Các dòng có tháng (hoặc ngày) nằm trong khoảng. */
export function sliceRows(rows: readonly Row[], r: MonthRange, key = 'month'): Row[] {
  return rows.filter((row) => {
    const ym = ymOf(row[key]);
    return ym != null && inRange(ym, r);
  });
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** LUỒNG: cộng cột `key` qua các dòng trong khoảng. Khoảng có tháng thiếu dòng / thiếu số ⇒ null
 *  (một tổng thiếu tháng trông như số thật mà sai). */
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

/** TỒN KHO: giá trị cột `key` ở tháng `ym` (thường = tháng cuối khoảng). Thiếu ⇒ null. */
export function stockAt(rows: readonly Row[], ym: Ym, key: string): number | null {
  const row = rows.find((x) => ymOf(x.month) === ym);
  return row ? num(row[key]) : null;
}

/** Dòng của đúng tháng `ym` (để tính tỉ lệ tháng cuối: ARPA, DAU/MAU…). */
export function rowAt(rows: readonly Row[], ym: Ym): Row | null {
  return rows.find((x) => ymOf(x.month) === ym) ?? null;
}

// ── Tham số URL ──

export interface FilterQuery {
  from?: string;
  to?: string;
  month?: string;
}

/** Khoảng → query. Bằng mặc định ⇒ {} (URL sạch; "khác mặc định" ⇔ URL có query). */
export function rangeQuery(r: MonthRange | null, def: MonthRange | null): FilterQuery {
  return r == null || sameRange(r, def) ? {} : { from: r.from, to: r.to };
}

export function monthQuery(m: Ym | null, def: Ym | null): FilterQuery {
  return m == null || m === def ? {} : { month: m };
}
