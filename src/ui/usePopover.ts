// Hành vi chung của MỌI popover / panel (nút ⓘ, bộ lọc) — kit 02 §6 popoverFocus + 01 §6 FilterBar:
//   · toàn app chỉ MỘT panel mở mỗi lúc (store `useOpenPanel`): mở cái mới ⇒ cái cũ đóng;
//   · mở ⇒ focus vào panel (hoặc phần tử `focusInside` chỉ ra); Esc ⇒ đóng + focus về nút;
//   · bấm ra ngoài (pointerdown) ⇒ đóng;
//   · vị trí position: fixed, kẹp trong khung (popoverPlace.ts), đặt lại khi cuộn (capture — scroll
//     của .main không nổi bọt) / đổi cỡ. Panel PORTAL ra body là việc của nơi gọi.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { create } from 'zustand';
import { placePopover } from './popoverPlace';

export const useOpenPanel = create<{ id: string | null }>(() => ({ id: null }));

export function usePopover<B extends HTMLElement = HTMLButtonElement>(opts: { focusInside?: (pop: HTMLElement) => HTMLElement | null } = {}) {
  const id = useId();
  const open = useOpenPanel((s) => s.id === id);
  const btn = useRef<B>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const focusInside = useRef(opts.focusInside);
  focusInside.current = opts.focusInside;

  const setOpen = useCallback(
    (v: boolean) => useOpenPanel.setState((s) => (v ? { id } : s.id === id ? { id: null } : s)),
    [id],
  );
  const toggle = useCallback(() => setOpen(useOpenPanel.getState().id !== id), [id, setOpen]);
  /** Đóng; `focusBack` ⇒ trả focus về nút (Esc, chọn xong). */
  const close = useCallback(
    (focusBack = true) => {
      setOpen(false);
      if (focusBack) btn.current?.focus();
    },
    [setOpen],
  );

  const place = useCallback(() => {
    const a = btn.current?.getBoundingClientRect();
    const p = pop.current;
    if (!a || !p) return;
    setPos(placePopover(a, { width: p.offsetWidth, height: p.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
  }, []);

  useLayoutEffect(() => {
    if (!open) return setPos(null);
    place();
    const p = pop.current;
    if (p) (focusInside.current?.(p) ?? p).focus({ preventScroll: true });
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close(true);
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (pop.current?.contains(target) || btn.current?.contains(target)) return;
      close(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place, close]);

  // Gỡ khỏi màn khi đang mở ⇒ nhả khe "panel đang mở".
  useEffect(() => () => setOpen(false), [setOpen]);

  // Vị trí tính trong useLayoutEffect (trước khi vẽ) ⇒ không nháy. KHÔNG dùng visibility: hidden
  // lúc chờ: phần tử ẩn không nhận focus, và focus phải vào panel ngay khi mở.
  const style: CSSProperties = pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 };
  return { id, open, toggle, close, btn, pop, style, place };
}
