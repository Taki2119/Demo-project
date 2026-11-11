// Shared behaviour of EVERY popover / panel (ⓘ button, filters) — kit 02 §6 popoverFocus + 01 §6 FilterBar:
//   · only ONE panel open at a time app-wide (store `useOpenPanel`): opening a new one ⇒ the old one closes;
//   · open ⇒ focus into the panel (or the element `focusInside` points to); Esc ⇒ close + focus back to the button;
//   · click outside (pointerdown) ⇒ close;
//   · position: fixed, clamped to the viewport (popoverPlace.ts), repositioned on scroll (capture — scroll
//     of .main doesn't bubble) / resize. PORTALing the panel to body is the caller's job.
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
  /** Close; `focusBack` ⇒ return focus to the button (Esc, after picking). */
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

  // Unmounted while open ⇒ release the "panel open" slot.
  useEffect(() => () => setOpen(false), [setOpen]);

  // Position computed in useLayoutEffect (before paint) ⇒ no flicker. Do NOT use visibility: hidden
  // while waiting: hidden elements can't take focus, and focus must go into the panel as soon as it opens.
  const style: CSSProperties = pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 };
  return { id, open, toggle, close, btn, pop, style, place };
}
