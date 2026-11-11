// Series colours — token NAMES ONLY, no hex (kit 03 §5). Values live in styles/tokens.css.

export const SERIES = [1, 2, 3, 4, 5, 6].map((i) => `var(--series-${i})`);
export const ORDINAL = [1, 2, 3, 4, 5].map((i) => `var(--ord-${i})`);

/** The first n series colours; THROWS if n > 6 (more than 6 series means changing the chart type, not adding colours). */
export function seriesColors(n: number): string[] {
  if (n > SERIES.length) throw new Error(`seriesColors: ${n} series > ${SERIES.length}`);
  return SERIES.slice(0, n);
}

/** n steps spread EVENLY on the ordinal scale (no slice): n=3 ⇒ ord-1, ord-3, ord-5. */
export function rampSteps(n: number): string[] {
  if (n > ORDINAL.length) throw new Error(`rampSteps: ${n} steps > ${ORDINAL.length}`);
  if (n <= 1) return ORDINAL.slice(0, n);
  return Array.from({ length: n }, (_, i) => ORDINAL[Math.round((i * (ORDINAL.length - 1)) / (n - 1))] as string);
}
