// ─────────────────────────────────────────────────────────────────────────────
// Chỉ số TỈ LỆ — tính ở client từ các TỔNG của mart (docs/SCHEMA.md §4.2). Mart cố ý không
// chở tỉ lệ: "tất cả gói" = cộng các gói, mà cộng tỉ lệ thì sai.
//
// Luật: mẫu số = 0 (hoặc thiếu) ⇒ `null`, KHÔNG phải 0. `0` đọc ra "bằng không", sai nghĩa;
// chỗ hiển thị bày dấu gạch.
// ─────────────────────────────────────────────────────────────────────────────

export function ratio(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num == null || den == null || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

/** Cộng các cột số của nhiều dòng (dùng để gộp các gói thành "tất cả gói"). */
export function sumBy<T>(rows: readonly T[], pick: (r: T) => number): number {
  let s = 0;
  for (const r of rows) s += pick(r);
  return s;
}

/** ARPA = MRR cuối kỳ ÷ số công ty trả tiền. */
export const arpa = (mrrEnd: number, payingCompanies: number) => ratio(mrrEnd, payingCompanies);

/** Gross MRR churn = MRR mất (huỷ + thu hẹp, số âm trong mart) ÷ MRR ĐẦU kỳ. Trả số dương. */
export function grossMrrChurn(churnedMrr: number, contractionMrr: number, mrrStart: number): number | null {
  return ratio(-(churnedMrr + contractionMrr), mrrStart);
}

/**
 * NRR = (MRR đầu kỳ + mở rộng + thu hẹp + huỷ + đổi gói vào/ra) ÷ MRR đầu kỳ.
 * Chỉ khách CŨ: bỏ new + reactivation. Có nghĩa ở mức TẤT CẢ GÓI — ở từng gói, đổi gói làm
 * khách "rời" gói đó.
 */
export function nrr(m: {
  mrrStart: number;
  expansion: number;
  contraction: number;
  churned: number;
  planIn: number;
  planOut: number;
}): number | null {
  return ratio(m.mrrStart + m.expansion + m.contraction + m.churned + m.planIn + m.planOut, m.mrrStart);
}

/** Logo churn = số công ty huỷ ÷ số công ty trả tiền ĐẦU kỳ. */
export const logoChurn = (churnedCompanies: number, payingStart: number) => ratio(churnedCompanies, payingStart);

/** DAU trung bình = tổng ngày-người ÷ số ngày của kỳ (tháng đang chạy: tới ngày chốt số). */
export const dauAvg = (activeUserDays: number, daysInPeriod: number) => ratio(activeUserDays, daysInPeriod);

/** Stickiness = DAU trung bình ÷ MAU. */
export function stickiness(activeUserDays: number, daysInPeriod: number, mau: number): number | null {
  const dau = dauAvg(activeUserDays, daysInPeriod);
  return dau == null ? null : ratio(dau, mau);
}

/** Tỉ lệ dùng ghế = MAU ÷ số người dùng (ghế) cuối kỳ. */
export const seatUsage = (mau: number, seatUsersEnd: number) => ratio(mau, seatUsersEnd);

/** Tỉ lệ thu tiền = đã thu ÷ đã xuất hoá đơn. */
export const collectionRate = (paid: number, invoiced: number) => ratio(paid, invoiced);

/** Biến động so kỳ trước = (nay − trước) ÷ |trước|. */
export function deltaRate(now: number | null, before: number | null): number | null {
  if (now == null || before == null) return null;
  return ratio(now - before, Math.abs(before));
}
