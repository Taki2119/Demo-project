// Chia trang bảng — hàm THUẦN (kit 03 §8). Trang đánh số từ 1.

export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, Math.trunc(page) || 1), pageCount(total, size));
}

/** Khoảng [from, to) của trang (đã kẹp). */
export function pageSlice(page: number, total: number, size: number): { from: number; to: number } {
  const from = (clampPage(page, total, size) - 1) * size;
  return { from, to: Math.min(total, from + size) };
}

/** Đổi cỡ trang mà vẫn giữ hàng đang đứng đầu (chỉ số `from`) trong tầm nhìn. */
export function pageKeepingRow(from: number, newSize: number): number {
  return Math.floor(Math.max(0, from) / newSize) + 1;
}

/** ≤7 trang: liệt kê hết. Nhiều hơn: trang đầu, trang cuối, ±1 quanh trang hiện tại, còn lại
 *  là 'gap' — nhưng KHÔNG dùng 'gap' để thay đúng MỘT trang (khi đó hiện luôn trang ấy). */
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
