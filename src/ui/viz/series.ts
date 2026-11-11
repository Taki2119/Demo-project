// Màu chuỗi — CHỈ tên token, không hex (kit 03 §5). Giá trị ở styles/tokens.css.

export const SERIES = [1, 2, 3, 4, 5, 6].map((i) => `var(--series-${i})`);
export const ORDINAL = [1, 2, 3, 4, 5].map((i) => `var(--ord-${i})`);

/** n màu chuỗi đầu; NÉM nếu n > 6 (quá 6 chuỗi thì phải đổi hình, không phải thêm màu). */
export function seriesColors(n: number): string[] {
  if (n > SERIES.length) throw new Error(`seriesColors: ${n} chuỗi > ${SERIES.length}`);
  return SERIES.slice(0, n);
}

/** n bậc rải ĐỀU trên thang thứ bậc (không slice): n=3 ⇒ ord-1, ord-3, ord-5. */
export function rampSteps(n: number): string[] {
  if (n > ORDINAL.length) throw new Error(`rampSteps: ${n} bậc > ${ORDINAL.length}`);
  if (n <= 1) return ORDINAL.slice(0, n);
  return Array.from({ length: n }, (_, i) => ORDINAL[Math.round((i * (ORDINAL.length - 1)) / (n - 1))] as string);
}
