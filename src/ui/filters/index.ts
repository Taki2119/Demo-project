// Month filter — pages import only from here, they do NOT build filters themselves (kit 01 §6).
//   · useRangeFilter / useMonthFilter: connect the URL (route.ts query) ↔ values validated against the DATA
//     (data/period.ts). Only normalise the URL once data has arrived: garbage / out-of-range / equal-to-default
//     values ⇒ removed from the URL (replaceState). No data yet ⇒ don't touch the URL.
//   · usePeriodText: text for the period being viewed (+ "tính đến ngày X" (as of day X) when the last month is partial — X comes from
//     the source's updatedAt, not the machine clock.
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

/** `months` = months present in the data; null while the data hasn't arrived. */
export function useRangeFilter(months: readonly Ym[] | null) {
  const q = useQuery();
  const def = months ? defaultRange(months) : null;
  const range = months ? resolveRange(q, months) : null;
  const key = months?.join(',');
  useEffect(() => {
    if (months) setQuery(rangeQuery(range, def));
  }, [key, q.from, q.to]); // months/range/def derived from key + q
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
    /** One month: 'Tháng 11/2026 (tính đến ngày 10)'. */
    month: (ym: Ym) => monthLabel(ym, lang) + partial(ym),
    /** Range: 1 month ⇒ same as `month`; several months ⇒ '12/2025 – 11/2026 (tính đến ngày 10)'. */
    range: (r: MonthRange) =>
      r.from === r.to ? monthLabel(r.to, lang) + partial(r.to) : `${monthShort(r.from, lang)} – ${monthShort(r.to, lang)}${partial(r.to)}`,
    /** Comparison text by range length (kit 01 §6 deltaNote). */
    vs: (r: MonthRange) => {
      const n = rangeLength(r);
      return n === 1 ? t('vsPrevMonth') : t('vsPrevRange').replace('{n}', String(n));
    },
  };
}
