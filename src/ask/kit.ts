// ─────────────────────────────────────────────────────────────────────────────
// Bộ đồ nghề chung của các câu hỏi mẫu ("Hỏi AI" bản demo — KHÔNG gọi AI thật).
//
// Mỗi câu hỏi = cách hỏi ja/vi + nguồn cần nạp + hàm THUẦN dựng câu trả lời từ dòng API.
// Luật giữ nguyên như các bảng:
//   · số lấy từ nguồn SẴN CÓ của board-data (không SQL mới); bundle không chở số nào;
//   · tỉ lệ tính ở đây bằng data/metrics.ts; mẫu số 0 ⇒ null ⇒ "—";
//   · chữ DỮ LIỆU (tên gói, ngành, band…) lấy từ nhãn DB qua `ctx.label`, chữ câu trả lời ở đây.
// ─────────────────────────────────────────────────────────────────────────────
import type { Row, SourceData, Params } from '../data/api';
import { addMonths, ymOf, type Ym } from '../data/period';
import { numericRows, rollupByMonth } from '../data/rollup';
import type { PlanKey, SourceKey } from '../nav/catalog';
import { count, dayLabel, monthLabel, monthShort, pct, yen } from '../ui/format';
import type { Lang } from '../ui/i18n';
import type { Slots } from './match';

export type Group = 'revenue' | 'users' | 'companies' | 'churn';
export const GROUPS: readonly Group[] = ['revenue', 'users', 'companies', 'churn'];

export interface Figure {
  label: string;
  value: string;
  sub?: string;
}

export interface TableSpec {
  head: string[];
  rows: string[][];
  /** Cột số (căn phải). */
  numeric: boolean[];
}

/** line = đường 1 chuỗi theo tháng (SoloLine, BẮT BUỘC goodWhen — kit 03 §1 không có mặc định).
 *  bar = thanh ngang DOM (HBars) — giá trị âm không vẽ được thanh ⇒ đừng dùng cho số âm. */
export type ChartSpec =
  | { kind: 'line'; unit: 'yen' | 'count' | 'pct'; goodWhen: 'up' | 'down'; /** tên chuỗi ngắn (tooltip) */ label: string; points: { x: string; y: number | null }[] }
  | { kind: 'bar'; unit: 'yen' | 'count' | 'pct'; points: { x: string; y: number | null }[] };

export interface Answer {
  text: string;
  figures: Figure[];
  table?: TableSpec;
  chart?: ChartSpec;
  /** "Dữ liệu dùng" — bảng nào + cách tính. KHÔNG phải SQL. */
  basis: string;
  /** Kỳ dữ liệu của câu trả lời ("Tháng 11/2026 (tính đến 10/11/2026)"). */
  period: string;
  /** Tham số đã áp (vd. gói) — trang hiện thành chip. */
  applied: { plan: Exclude<PlanKey, 'all'> | null; topN: number | null };
}

export interface Ctx {
  lang: Lang;
  slots: Slots;
  data: Partial<Record<SourceKey, SourceData>>;
  label: (domain: string, code: string) => string;
}

export interface Need {
  source: SourceKey;
  params: Params;
}

export interface Question {
  id: string;
  group: Group;
  /** Cách hỏi — câu ĐẦU là câu hiện trên nút gợi ý. Cần ≥ 2 mỗi ngôn ngữ (test khoá). */
  ask: { ja: readonly string[]; vi: readonly string[] };
  keywords?: readonly string[];
  /** Câu hỏi có dùng tham số nào (để chip "đã áp" nói thật). */
  uses: { plan?: boolean; topN?: boolean };
  related: readonly string[];
  needs: (slots: Slots) => Need[];
  /** null ⇒ không đủ dữ liệu để trả lời (trang nói "chưa có dữ liệu"). */
  build: (ctx: Ctx) => Answer | null;
}

// ── chữ ──────────────────────────────────────────────────────────────────────
export const tx = (lang: Lang, ja: string, vi: string): string => (lang === 'ja' ? ja : vi);

export const DEFAULT_TOP = 10;
export const topOf = (ctx: Ctx): number => ctx.slots.topN ?? DEFAULT_TOP;

export const planParam = (s: Slots): Params => (s.plan ? { plan: s.plan } : {});

/** "（グロースプラン）" / " (gói Tăng trưởng)" — rỗng khi không chọn gói. */
export function scopeOf(ctx: Ctx): string {
  const p = ctx.slots.plan;
  if (!p) return '';
  const name = ctx.label('plan', p);
  return tx(ctx.lang, `（${name}プラン）`, ` (gói ${name})`);
}

export function applied(ctx: Ctx, q: Pick<Question, 'uses'>): Answer['applied'] {
  return { plan: q.uses.plan ? ctx.slots.plan : null, topN: q.uses.topN ? topOf(ctx) : null };
}

// ── nguồn ────────────────────────────────────────────────────────────────────
export function rowsOf(ctx: Ctx, source: SourceKey): Row[] | null {
  const d = ctx.data[source];
  return d ? numericRows(d.rows) : null;
}

/** Bảng (tháng × gói) gộp về một dòng / tháng theo gói đang chọn (không chọn ⇒ cộng mọi gói). */
export function monthly(ctx: Ctx, source: 'revenue-monthly' | 'users-monthly', plan: PlanKey | null = ctx.slots.plan): Row[] | null {
  const rows = rowsOf(ctx, source);
  if (!rows || rows.length === 0) return null;
  return rollupByMonth(rows, plan ?? 'all');
}

export const ymRow = (r: Row): Ym => ymOf(r.month) ?? '';
export const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
export const nOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function rowAtYm(rows: readonly Row[], ym: Ym): Row | null {
  return rows.find((r) => ymRow(r) === ym) ?? null;
}

/** Dòng ĐÃ CHỐT gần nhất (đại lượng luồng như huỷ, hoá đơn nên đọc trên tháng trọn). */
export function lastClosed(rows: readonly Row[]): Row | null {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i]!.is_closed === true) return rows[i]!;
  return null;
}

/** k tháng cuối (theo thứ tự tăng). */
export const lastN = <T>(rows: readonly T[], k: number): T[] => rows.slice(Math.max(0, rows.length - k));

/** "2026年11月（2026年11月10日時点）" / "Tháng 11/2026 (tính đến 10/11/2026)". */
export function monthText(lang: Lang, row: Row): string {
  const m = monthLabel(ymRow(row), lang);
  if (row.is_closed === false && typeof row.measure_date === 'string') {
    return m + tx(lang, `（${dayLabel(row.measure_date, lang)}時点）`, ` (tính đến ${dayLabel(row.measure_date, lang)})`);
  }
  return m;
}

/** Nguồn chỉ có MỘT tháng (theo công ty / người dùng): tháng đó + ngày chốt số nếu chưa trọn. */
export function snapshotText(lang: Lang, ym: Ym, updatedAt: string | null | undefined): string {
  const m = monthLabel(ym, lang);
  if (updatedAt && ymOf(updatedAt) === ym && updatedAt !== monthEnd(ym)) {
    return m + tx(lang, `（${dayLabel(updatedAt, lang)}時点）`, ` (tính đến ${dayLabel(updatedAt, lang)})`);
  }
  return m;
}

/** Ngày cuối tháng — tính bằng số ngày của tháng, không qua Date (tránh lệch múi giờ). */
export function monthEnd(ym: Ym): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
  return `${ym}-${String(days).padStart(2, '0')}`;
}

export { addMonths };

export function rangeText(lang: Lang, from: Ym, to: Ym): string {
  return tx(lang, `${monthLabel(from, lang)}〜${monthLabel(to, lang)}`, `${monthLabel(from, lang)} – ${monthLabel(to, lang)}`);
}

/** Điểm biểu đồ theo tháng. */
export function series(lang: Lang, rows: readonly Row[], pick: (r: Row) => number | null): ChartSpec['points'] {
  return rows.map((r) => ({ x: monthShort(ymRow(r), lang), y: pick(r) }));
}

/** "+¥12.000（+3,1%）" — số thay đổi kèm %; thiếu kỳ trước ⇒ "—". */
export function deltaText(lang: Lang, now: number | null, before: number | null, fmt: 'yen' | 'count'): string {
  if (now == null || before == null) return '—';
  const d = now - before;
  const body = fmt === 'yen' ? yen(d, lang) : count(d, lang);
  const sign = d > 0 ? '+' : '';
  const rate = before !== 0 ? pct(d / Math.abs(before), lang) : null;
  const rateTxt = rate && rate !== '—' ? `${d > 0 ? '+' : ''}${rate}` : null;
  return rateTxt ? tx(lang, `${sign}${body}（${rateTxt}）`, `${sign}${body} (${rateTxt})`) : `${sign}${body}`;
}

/** Nhóm + cộng: key → {sum, n}. */
export function groupSum(rows: readonly Row[], key: string, val: string): { code: string; sum: number; n: number }[] {
  const m = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const code = r[key] == null ? '' : String(r[key]);
    const acc = m.get(code) ?? { sum: 0, n: 0 };
    acc.sum += n(r[val]);
    acc.n += 1;
    m.set(code, acc);
  }
  return [...m.entries()].map(([code, v]) => ({ code, ...v })).sort((a, b) => b.sum - a.sum || b.n - a.n);
}

/** Danh sách có giới hạn: "A、B、C" / "A, B, C". */
export const listText = (lang: Lang, items: readonly string[]): string => items.join(tx(lang, '、', ', '));

export { count, pct, yen, monthLabel };
