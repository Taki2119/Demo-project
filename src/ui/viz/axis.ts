// Axis / grid / hover / pill constants — numbers taken EXACTLY from kit 03 §4. Don't tweak by hand.

/** Axis text uses fill, NOT stroke (stroke blurs the text). */
export const AXIS = { fill: 'var(--ink-3)', fontSize: 12.5 } as const;
/** Solid hairline, horizontal only (vertical={false}); no dashes. */
export const GRID = 'var(--grid)';
/** padding of the category <XAxis> (not margin). */
export const AXIS_PAD = { left: 16, right: 16 } as const;
/** margin.left when the Y label is 2–4 characters / 5 characters or more. */
export const AXIS_GUTTER = -8;
export const AXIS_GUTTER_WIDE = 4;
/** minTickGap for long series. */
export const AXIS_TICK_GAP = 52;
/** <YAxis width> in every template. */
export const Y_WIDTH = 44;

export const HOVER_GLOW = { lift: 3, near: 1.5, far: 5, dim: 0.45, room: 16 } as const;

export const VALUE_PILL = { h: 22, font: 12.5, padX: 10, gap: 6, ch: 7.5 } as const;
/** margin.top of a chart with a pill. */
export const PILL_TOP = 34;

/** margin.left by the length of the longest Y label (measured with the tickFormatter itself). */
export function gutterFor(values: readonly (number | null)[], tick: (v: number) => string): number {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return AXIS_GUTTER;
  const longest = Math.max(...[Math.min(0, ...nums), Math.max(0, ...nums)].map((v) => tick(v).length));
  return longest >= 5 ? AXIS_GUTTER_WIDE : AXIS_GUTTER;
}
