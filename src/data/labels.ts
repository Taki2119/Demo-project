// Nhãn ja / vi của DỮ LIỆU — đọc từ mart.labels + mart.column_labels (docs/SCHEMA.md §4.3).
// Chưa tải được (hoặc chưa cấu hình API) ⇒ rơi về chính MÃ, để màn hình không trống trơn.
import { useLangStore, type Lang } from '../ui/i18n';
import { useSource, type Row } from './api';

export interface LabelText {
  ja: string;
  vi: string;
}

export type LabelIndex = Map<string, LabelText>;

const keyOf = (domain: string, code: string) => `${domain}\u0000${code}`;

export function indexLabels(rows: readonly Row[]): LabelIndex {
  const m: LabelIndex = new Map();
  for (const r of rows) {
    if (typeof r.domain === 'string' && typeof r.code === 'string' && typeof r.ja === 'string' && typeof r.vi === 'string') {
      m.set(keyOf(r.domain, r.code), { ja: r.ja, vi: r.vi });
    }
  }
  return m;
}

export function indexColumns(rows: readonly Row[]): LabelIndex {
  const m: LabelIndex = new Map();
  for (const r of rows) {
    if (typeof r.column_name === 'string' && typeof r.ja === 'string' && typeof r.vi === 'string') {
      m.set(r.column_name, { ja: r.ja, vi: r.vi });
    }
  }
  return m;
}

export function labelOf(idx: LabelIndex, domain: string, code: string, lang: Lang): string {
  return idx.get(keyOf(domain, code))?.[lang] ?? code;
}

/** `label('plan', 'growth')` → 'グロース' / 'Tăng trưởng' (hoặc 'growth' khi chưa có nhãn). */
export function useLabel(): (domain: string, code: string) => string {
  const lang = useLangStore((s) => s.lang);
  const { data } = useSource('labels');
  const idx = data ? indexLabels(data.rows) : new Map<string, LabelText>();
  return (domain, code) => labelOf(idx, domain, code, lang);
}

/** `col('mrr_end')` → '月末MRR' / 'MRR cuối tháng'. */
export function useColumnLabel(): (column: string) => string {
  const lang = useLangStore((s) => s.lang);
  const { data } = useSource('column-labels');
  const idx = data ? indexColumns(data.rows) : new Map<string, LabelText>();
  return (column) => idx.get(column)?.[lang] ?? column;
}

/** Đơn vị của cột ('JPY' · '%' · '人'…) — quyết định cách định dạng ô. */
export function useColumnUnit(): (column: string) => string | null {
  const { data } = useSource('column-labels');
  const units = new Map<string, string>();
  for (const r of data?.rows ?? []) if (typeof r.column_name === 'string' && typeof r.unit === 'string') units.set(r.column_name, r.unit);
  return (column) => units.get(column) ?? null;
}

/** Tên chỉ số của glossary: các nhãn được trỏ tới, nối " · ". Thiếu BẤT KỲ nhãn nào (chưa tải /
 *  chưa cấu hình API) ⇒ null — nơi gọi hiện chữ thay thế, KHÔNG hiện mã cột. */
export function useNameRefs(): (refs: readonly ({ col: string } | { label: readonly [string, string] })[]) => string | null {
  const lang = useLangStore((s) => s.lang);
  const cols = useSource('column-labels').data;
  const labels = useSource('labels').data;
  const colIdx = cols ? indexColumns(cols.rows) : new Map<string, LabelText>();
  const labIdx = labels ? indexLabels(labels.rows) : new Map<string, LabelText>();
  return (refs) => {
    const parts = refs.map((r) => ('col' in r ? colIdx.get(r.col) : labIdx.get(keyOf(r.label[0], r.label[1])))?.[lang]);
    return parts.every((p): p is string => typeof p === 'string') ? parts.join(' · ') : null;
  };
}
