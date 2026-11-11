// DATE arithmetic with integers (days since 1970-01-01, in UTC) — never goes through the machine's time zone.
// Every date in the dataset is a date in the business time zone; the arithmetic here does not change it.

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

/** Day 1 of the month containing `day`, shifted by `k` months. */
export function monthStartOf(day, k = 0) {
  const { y, m } = ymOf(day);
  return Date.UTC(y, m - 1 + k, 1) / MS;
}

export function monthEndOf(day) {
  return monthStartOf(day, 1) - 1;
}

/** 0 = Sunday … 6 = Saturday (1970-01-01 was a Thursday). */
export function dow(day) {
  return (((day + 4) % 7) + 7) % 7;
}

// Japanese long holidays (approximate — enough for charts to "dip" in the right places, not the official calendar).
const HOLIDAY_MD = new Set([
  '01-01', '01-02', '01-03', '02-11', '02-23', '03-20', '04-29', '05-03', '05-04', '05-05',
  '07-21', '08-11', '08-13', '08-14', '08-15', '08-16', '09-16', '09-23', '10-14', '11-03',
  '11-23', '12-29', '12-30', '12-31',
]);

export function isHoliday(day) {
  return HOLIDAY_MD.has(isoOf(day).slice(5));
}
