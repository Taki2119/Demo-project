// Popover position (position: fixed) — PURE function. Default below the button; not enough room but enough above
// ⇒ flip up. Always inside the viewport, `M` px from the edge (kit 03: popover 8px from the edge).
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
