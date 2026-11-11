// Data date of a PAGE — taken from the `updatedAt` the API returns with each source (= mart.as_of()),
// NOT from the viewer's machine clock. A page reading several sources ⇒ the OLDEST date (the numbers on the page are only
// certain up to that date).

/** Oldest date ('YYYY-MM-DD'). Empty list, or a source with unknown date (null / malformed)
 *  ⇒ null: nothing can be asserted. Compares ISO strings, doesn't go through Date. */
export function oldestDate(dates: readonly (string | null | undefined)[]): string | null {
  if (dates.length === 0) return null;
  let min: string | null = null;
  for (const d of dates) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    if (min == null || d < min) min = d;
  }
  return min;
}
