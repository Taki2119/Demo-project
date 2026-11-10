// Số học NGÀY bằng số nguyên (số ngày kể từ 1970-01-01, theo UTC) — không đi qua múi giờ máy.
// Mọi ngày trong bộ dữ liệu là ngày theo múi giờ kinh doanh; phép tính ở đây không đổi nó.

const MS = 86400000;

export function dayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / MS;
}

export function isoOf(day) {
  return new Date(day * MS).toISOString().slice(0, 10);
}

export function ymOf(day) {
  const dt = new Date(day * MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function monthStart(y, m) {
  return Date.UTC(y, m - 1, 1) / MS;
}

/** Ngày 1 của tháng chứa `day`, dịch thêm `k` tháng. */
export function monthStartOf(day, k = 0) {
  const { y, m } = ymOf(day);
  return Date.UTC(y, m - 1 + k, 1) / MS;
}

export function monthEndOf(day) {
  return monthStartOf(day, 1) - 1;
}

/** 0 = Chủ nhật … 6 = Thứ bảy (1970-01-01 là Thứ năm). */
export function dow(day) {
  return (((day + 4) % 7) + 7) % 7;
}

// Kỳ nghỉ dài của Nhật (xấp xỉ — đủ để biểu đồ có "lõm" đúng chỗ, không phải lịch chính thức).
const HOLIDAY_MD = new Set([
  '01-01', '01-02', '01-03', '02-11', '02-23', '03-20', '04-29', '05-03', '05-04', '05-05',
  '07-21', '08-11', '08-13', '08-14', '08-15', '08-16', '09-16', '09-23', '10-14', '11-03',
  '11-23', '12-29', '12-30', '12-31',
]);

export function isHoliday(day) {
  return HOLIDAY_MD.has(isoOf(day).slice(5));
}
