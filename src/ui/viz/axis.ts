// Hằng số trục / lưới / hover / pill — số lấy ĐÚNG như kit 03 §4. Đừng chỉnh tay.

/** Chữ trục dùng fill, KHÔNG dùng stroke (stroke làm chữ nhoè). */
export const AXIS = { fill: 'var(--ink-3)', fontSize: 12.5 } as const;
/** Hairline liền, chỉ ngang (vertical={false}); không nét đứt. */
export const GRID = 'var(--grid)';
/** padding của <XAxis> category (không phải margin). */
export const AXIS_PAD = { left: 16, right: 16 } as const;
/** margin.left khi nhãn Y dài 2–4 ký tự / từ 5 ký tự trở lên. */
export const AXIS_GUTTER = -8;
export const AXIS_GUTTER_WIDE = 4;
/** minTickGap cho chuỗi dài. */
export const AXIS_TICK_GAP = 52;
/** <YAxis width> ở mọi khuôn. */
export const Y_WIDTH = 44;

export const HOVER_GLOW = { lift: 3, near: 1.5, far: 5, dim: 0.45, room: 16 } as const;

export const VALUE_PILL = { h: 22, font: 12.5, padX: 10, gap: 6, ch: 7.5 } as const;
/** margin.top của chart có pill. */
export const PILL_TOP = 34;

/** margin.left theo độ dài nhãn Y dài nhất (đo bằng chính tickFormatter). */
export function gutterFor(values: readonly (number | null)[], tick: (v: number) => string): number {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return AXIS_GUTTER;
  const longest = Math.max(...[Math.min(0, ...nums), Math.max(0, ...nums)].map((v) => tick(v).length));
  return longest >= 5 ? AXIS_GUTTER_WIDE : AXIS_GUTTER;
}
