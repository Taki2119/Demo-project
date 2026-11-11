// Table sorting — PURE functions (kit 03 §8).
//   · STABLE sort; null cells ALWAYS last in both directions;
//   · strings compared with Intl.Collator('ja');
//   · first click: numeric column ⇒ desc, text column ⇒ asc.

export type SortDir = 'asc' | 'desc';
export interface SortState {
  key: string;
  dir: SortDir;
}
export type SortValue = string | number | null;

const collator = new Intl.Collator('ja');

export function sortRows<T>(rows: readonly T[], valueFn: (row: T) => SortValue, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i, v: valueFn(row) }))
    .sort((a, b) => {
      if (a.v == null || b.v == null) {
        if (a.v == null && b.v == null) return a.i - b.i;
        return a.v == null ? 1 : -1;
      }
      const c =
        typeof a.v === 'number' && typeof b.v === 'number' ? a.v - b.v : collator.compare(String(a.v), String(b.v));
      return c * sign || a.i - b.i;
    })
    .map((x) => x.row);
}

/** Same column ⇒ flip direction; different column ⇒ the initial direction `first`. */
export function toggleSort(cur: SortState | null, key: string, first: SortDir): SortState {
  if (cur && cur.key === key) return { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: first };
}
