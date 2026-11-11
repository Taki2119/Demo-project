// Nắn dữ liệu cho biểu đồ — hàm THUẦN. Luật: thiếu / không phải số / mẫu số 0 ⇒ null
// (biểu đồ đứt nét, tooltip "—"), KHÔNG BAO GIỜ thay bằng 0. Đếm thật bằng 0 thì vẫn là 0.
import type { Row } from './api';
import { stickiness } from './metrics';

export type Point = Record<string, string | number | null>;

export const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Giữ khoá x (chuỗi) + các cột số; cột nào không phải số ⇒ null. */
export function pickColumns(rows: readonly Row[], xKey: string, keys: readonly string[]): Point[] {
  return rows.map((r) => {
    const p: Point = { [xKey]: String(r[xKey] ?? '') };
    for (const k of keys) p[k] = num(r[k]);
    return p;
  });
}

/** Giá trị tuyệt đối lớn nhất của các cột (đích để chọn thang tiền). null nếu không có số nào. */
export function maxAbs(points: readonly Point[], keys: readonly string[]): number | null {
  let m: number | null = null;
  for (const p of points) for (const k of keys) {
    const v = num(p[k]);
    if (v != null) m = Math.max(m ?? 0, Math.abs(v));
  }
  return m;
}

/** Tổng chồng mỗi phía của cột phân cực ({up, down}) — để chọn thang trục. Ô thiếu bị BỎ QUA;
 *  phía không có ô nào ⇒ null. */
export function stackTotals(points: readonly Point[], stacks: readonly { key: string; sign?: 1 | -1 }[]): Point[] {
  const side = (p: Point, s: 1 | -1) => {
    const vs = stacks.filter((x) => (x.sign ?? 1) === s).map((x) => num(p[x.key])).filter((v): v is number => v != null);
    return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
  };
  return points.map((p) => ({ up: side(p, 1), down: side(p, -1) }));
}

/** Đổi dấu một cột (luồng RA vẽ dưới mốc 0). null giữ null. */
export function negate(points: readonly Point[], key: string, as: string): Point[] {
  return points.map((p) => {
    const v = num(p[key]);
    return { ...p, [as]: v == null ? null : -v };
  });
}

/** Đếm theo khoảng: `edges` = cận dưới của từng nhóm (tăng dần), nhóm cuối mở. null bị bỏ qua.
 *  Nhóm rỗng có đếm = 0 THẬT (không phải dữ liệu thiếu). */
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

/** Đếm số dòng theo mã của cột `key` (vd. top_reason), giảm dần. Mã thiếu bị bỏ qua. */
export function countBy(rows: readonly Row[], key: string): { code: string; n: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const c = r[key];
    if (typeof c === 'string' && c !== '') m.set(c, (m.get(c) ?? 0) + 1);
  }
  return [...m].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n || a.code.localeCompare(b.code));
}

/** Bảng chéo: mỗi giá trị `xKey` một dòng, mỗi mã trong `codes` một cột = số dòng có mã đó.
 *  Mốc x có trong dữ liệu mà không có mã nào ⇒ 0 thật. */
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

/** Cộng các cột số theo `xKey` (vd. tháng × kênh ⇒ tháng). Mốc x mà một cột không có số nào ⇒ null. */
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

/** Lấp các tháng TRỐNG giữa tháng đầu và tháng cuối cho nguồn ĐẾM SỰ KIỆN (chỉ có dòng khi có sự
 *  kiện): tháng không có dòng = 0 sự kiện THẬT, không phải thiếu dữ liệu. Không lấp trước tháng
 *  đầu / sau tháng cuối. Khoá x dạng 'YYYY-MM-01'; không đi qua Date. */
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

/** DAU/MAU theo tháng (docs/SCHEMA.md §4.2). Thiếu cột hoặc mẫu số 0 ⇒ null. */
export function stickinessByMonth(rows: readonly Row[]): Point[] {
  return rows.map((r) => {
    const aud = num(r.active_user_days);
    const days = num(r.days_in_period);
    const mau = num(r.mau);
    return { month: String(r.month ?? ''), stickiness: aud == null || days == null || mau == null ? null : stickiness(aud, days, mau) };
  });
}
