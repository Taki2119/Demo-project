import { describe, expect, it } from 'vitest';
import { M, placePopover } from './popoverPlace';

const view = { width: 430, height: 900 };
const pop = { width: 300, height: 200 };

describe('placePopover', () => {
  it('đủ chỗ ⇒ dưới nút, căn giữa theo nút', () => {
    expect(placePopover({ top: 100, left: 200, width: 20, height: 20 }, pop, view)).toEqual({ top: 126, left: 60 });
  });
  it('sát đáy ⇒ lật lên trên', () => {
    expect(placePopover({ top: 800, left: 200, width: 20, height: 20 }, pop, view).top).toBe(800 - 6 - 200);
  });
  it('sát mép trái / phải ⇒ kẹp trong khung, cách mép 8px', () => {
    expect(placePopover({ top: 100, left: 0, width: 20, height: 20 }, pop, view).left).toBe(M);
    expect(placePopover({ top: 100, left: 420, width: 20, height: 20 }, pop, view).left).toBe(430 - M - 300);
  });
  it('popover cao hơn khung ⇒ dán mép trên', () => {
    expect(placePopover({ top: 400, left: 100, width: 20, height: 20 }, { width: 300, height: 2000 }, view).top).toBe(M);
  });
});
