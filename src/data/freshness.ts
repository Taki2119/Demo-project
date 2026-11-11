// Ngày dữ liệu của một TRANG — lấy từ `updatedAt` mà API trả kèm mỗi nguồn (= mart.as_of()),
// KHÔNG lấy đồng hồ máy người xem. Trang đọc nhiều nguồn ⇒ ngày CŨ NHẤT (số trên trang chỉ
// chắc tới ngày đó).

/** Ngày cũ nhất ('YYYY-MM-DD'). Danh sách rỗng, hoặc có nguồn không biết ngày (null / sai dạng)
 *  ⇒ null: không khẳng định được gì. So chuỗi ISO, không đi qua Date. */
export function oldestDate(dates: readonly (string | null | undefined)[]): string | null {
  if (dates.length === 0) return null;
  let min: string | null = null;
  for (const d of dates) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    if (min == null || d < min) min = d;
  }
  return min;
}
