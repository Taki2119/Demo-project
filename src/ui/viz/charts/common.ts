// Types shared by the chart templates.

/** One point: the x-axis key is a string; every number is already number | null (null ⇒ gap / "—", never 0). */
export type Point = Record<string, string | number | null>;

export const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Shared formatters: full value (tooltip/pill), axis label, x-axis label, tooltip title. */
export interface ChartFormat {
  value: (v: number) => string;
  tick: (v: number) => string;
  xTick: (x: string) => string;
  xTitle: (x: string) => string;
}

/** Per-series number format in the tooltip. `tipAbs` = series whose sign is flipped only to DRAW below the 0 line
 *  (e.g. deactivated users): the position already says it's a decrease ⇒ the tooltip shows the absolute value. */
export function tipFormat(specs: readonly { key: string; tipAbs?: boolean }[], value: (v: number) => string): (key: string, v: number) => string {
  const abs = new Set(specs.filter((s) => s.tipAbs).map((s) => s.key));
  return (key, v) => value(abs.has(key) ? Math.abs(v) : v);
}
