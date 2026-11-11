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

/** Định dạng số trong tooltip theo từng chuỗi. `tipAbs` = chuỗi chỉ đổi dấu để VẼ dưới mốc 0
 *  (vd. người dùng bị tắt): vị trí đã nói chiều giảm ⇒ tooltip hiện số tuyệt đối. */
export function tipFormat(specs: readonly { key: string; tipAbs?: boolean }[], value: (v: number) => string): (key: string, v: number) => string {
  const abs = new Set(specs.filter((s) => s.tipAbs).map((s) => s.key));
  return (key, v) => value(abs.has(key) ? Math.abs(v) : v);
}
