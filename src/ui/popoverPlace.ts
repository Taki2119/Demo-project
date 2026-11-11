// Vị trí popover (position: fixed) — hàm THUẦN. Mặc định dưới nút; không đủ chỗ mà phía trên đủ
// ⇒ lật lên. Luôn nằm trong khung nhìn, cách mép `M` px (kit 03: popover cách mép 8px).
export const M = 8;
const GAP = 6;

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function placePopover(anchor: Box, pop: { width: number; height: number }, view: { width: number; height: number }): { top: number; left: number } {
  const below = anchor.top + anchor.height + GAP;
  const above = anchor.top - GAP - pop.height;
  let top = below + pop.height <= view.height - M || above < M ? below : above;
  top = Math.max(M, Math.min(top, view.height - M - pop.height));
  let left = anchor.left + anchor.width / 2 - pop.width / 2;
  left = Math.max(M, Math.min(left, view.width - M - pop.width));
  return { top, left };
}
