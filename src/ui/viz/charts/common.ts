// Kiểu dùng chung của các khuôn chart.

/** Một mốc: khoá trục x là chuỗi; mọi số đã là number | null (null ⇒ đứt nét / "—", không bao giờ 0). */
export type Point = Record<string, string | number | null>;

export const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Hàm định dạng dùng chung: giá trị đầy đủ (tooltip/pill), nhãn trục, nhãn trục x, tiêu đề tooltip. */
export interface ChartFormat {
  value: (v: number) => string;
  tick: (v: number) => string;
  xTick: (x: string) => string;
  xTitle: (x: string) => string;
}
