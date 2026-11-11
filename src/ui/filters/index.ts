// Bộ lọc tháng — trang chỉ import từ đây, KHÔNG tự dựng bộ lọc (kit 01 §6).
//   · useRangeFilter / useMonthFilter: nối URL (route.ts query) ↔ giá trị đã kiểm theo DỮ LIỆU
//     (data/period.ts). Có dữ liệu rồi mới chuẩn hoá URL: giá trị rác / ngoài phạm vi / bằng mặc
//     định ⇒ bỏ khỏi URL (replaceState). Chưa có dữ liệu ⇒ không đụng URL.
//   · usePeriodText: chữ của kỳ đang xem (+ "tính đến ngày X" khi tháng cuối chưa trọn — X lấy từ
//     updatedAt của nguồn, không từ đồng hồ máy).
import { useEffect } from 'react';
import { monthProgress } from '../../data/chartData';
import {
  defaultRange,
  monthQuery,
  rangeLength,
  rangeQuery,
  resolveMonth,
  resolveRange,
  sameRange,
  type MonthRange,
  type Ym,
} from '../../data/period';
import { setQuery, useQuery } from '../../nav/route';
import { monthLabel, monthShort } from '../format';
import { useLangStore, useT } from '../i18n';

export { FilterBar } from './FilterBar';
export { MonthPickFilter } from './MonthPickFilter';
export { MonthRangeFilter } from './MonthRangeFilter';

/** `months` = tháng có trong dữ liệu; null khi dữ liệu chưa về. */
export function useRangeFilter(months: readonly Ym[] | null) {
  const q = useQuery();
  const def = months ? defaultRange(months) : null;
  const range = months ? resolveRange(q, months) : null;
  const key = months?.join(',');
  useEffect(() => {
    if (months) setQuery(rangeQuery(range, def));
  }, [key, q.from, q.to]); // months/range/def suy ra từ key + q
  return {
    range,
    def,
    dirty: range != null && !sameRange(range, def),
    set: (r: MonthRange) => setQuery(rangeQuery(r, def)),
    reset: () => setQuery({}),
  };
}

export function useMonthFilter(months: readonly Ym[] | null) {
  const q = useQuery();
  const def = months ? (months.at(-1) ?? null) : null;
  const month = months ? resolveMonth(q.month, months) : null;
  const key = months?.join(',');
  useEffect(() => {
    if (months) setQuery(monthQuery(month, def));
  }, [key, q.month]);
  return {
    month,
    def,
    dirty: month != null && month !== def,
    set: (m: Ym) => setQuery(monthQuery(m, def)),
    reset: () => setQuery({}),
  };
}

export function usePeriodText(asOf: string | null) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const partial = (ym: Ym) => {
    const p = monthProgress(`${ym}-01`, asOf);
    return p && !p.complete ? t('asOfDay').replace('{d}', String(p.day)) : '';
  };
  return {
    /** Một tháng: 'Tháng 11/2026 (tính đến ngày 10)'. */
    month: (ym: Ym) => monthLabel(ym, lang) + partial(ym),
    /** Khoảng: 1 tháng ⇒ như `month`; nhiều tháng ⇒ '12/2025 – 11/2026 (tính đến ngày 10)'. */
    range: (r: MonthRange) =>
      r.from === r.to ? monthLabel(r.to, lang) + partial(r.to) : `${monthShort(r.from, lang)} – ${monthShort(r.to, lang)}${partial(r.to)}`,
    /** Chữ so sánh theo độ dài khoảng (kit 01 §6 deltaNote). */
    vs: (r: MonthRange) => {
      const n = rangeLength(r);
      return n === 1 ? t('vsPrevMonth') : t('vsPrevRange').replace('{n}', String(n));
    },
  };
}
