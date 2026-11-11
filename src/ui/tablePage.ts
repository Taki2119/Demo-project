// Table pagination — PURE functions (kit 03 §8). Pages are numbered from 1.

export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, Math.trunc(page) || 1), pageCount(total, size));
}

/** Range [from, to) of the page (clamped). */
export function pageSlice(page: number, total: number, size: number): { from: number; to: number } {
  const from = (clampPage(page, total, size) - 1) * size;
  return { from, to: Math.min(total, from + size) };
}

/** Change the page size while keeping the current top row (index `from`) in view. */
export function pageKeepingRow(from: number, newSize: number): number {
  return Math.floor(Math.max(0, from) / newSize) + 1;
}

/** ≤7 pages: list them all. More: first page, last page, ±1 around the current page, the rest
 *  is 'gap' — but do NOT use 'gap' to replace exactly ONE page (then show that page instead). */
export function pageItems(current: number, count: number): (number | 'gap')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const keep = [...new Set([1, count, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= count)
    .sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  let prev = 0;
  for (const p of keep) {
    if (p - prev === 2) out.push(prev + 1);
    else if (p - prev > 2) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}
