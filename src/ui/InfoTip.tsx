// Nút ⓘ cạnh tên chỉ số / tiêu đề thẻ ⇒ popover giải thích, đọc TỪ src/data/glossary.ts
// (kit 02 §6 InfoTip + popoverFocus). Luật:
//   · popover PORTAL ra body (kit 02 §3 bẫy 1–2: không lồng kính, không bị containing block);
//   · mở ⇒ focus vào popover; Esc ⇒ đóng + focus về nút ⓘ; bấm ra ngoài (pointerdown) ⇒ đóng;
//   · vị trí position: fixed, kẹp trong khung (popoverPlace.ts), đặt lại khi cuộn (capture) / đổi cỡ.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { COMMON_SCOPE, GLOSSARY, textOf, type GlossaryKey, type Text } from '../data/glossary';
import { useNameRefs } from '../data/labels';
import { useLangStore, useT } from './i18n';
import { placePopover } from './popoverPlace';

const asList = (keys: GlossaryKey | readonly GlossaryKey[]): readonly GlossaryKey[] => (typeof keys === 'string' ? [keys] : keys);

function InfoGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="5" r=".95" fill="currentColor" />
      <path d="M8 7.3v4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function InfoTip({ keys }: { keys: GlossaryKey | readonly GlossaryKey[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const nameOf = useNameRefs();
  const list = asList(keys);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();
  const names = list.map((k) => nameOf(GLOSSARY[k].name));
  const label = names.every((n) => n != null) ? `${t('info')}: ${names.join(' · ')}` : t('info');

  const place = useCallback(() => {
    const a = btn.current?.getBoundingClientRect();
    const p = pop.current;
    if (!a || !p) return;
    setPos(placePopover(a, { width: p.offsetWidth, height: p.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
  }, []);

  useLayoutEffect(() => {
    if (!open) return setPos(null);
    place();
    pop.current?.focus({ preventScroll: true });
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      btn.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (pop.current?.contains(target) || btn.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', place, true); // scroll của .main không nổi bọt ⇒ capture
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const txt = (v: Text) => textOf(v, lang) ?? t('unconfirmed');
  const partial = list.some((k) => GLOSSARY[k].partialMonth);
  // Vị trí tính trong useLayoutEffect (trước khi vẽ) ⇒ không nháy. KHÔNG dùng visibility: hidden
  // lúc chờ: phần tử ẩn không nhận focus, và focus phải vào popover ngay khi mở.
  const style: CSSProperties = pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 };

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="ui-info"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <InfoGlyph />
      </button>
      {open
        ? createPortal(
            <div ref={pop} id={id} className="ui-pop" role="dialog" aria-label={label} tabIndex={-1} style={style}>
              {list.map((k, i) => {
                const e = GLOSSARY[k];
                return (
                  <section key={k} className="ui-pop-entry">
                    <h3>{names[i] ?? '—'}</h3>
                    <p>{txt(e.what)}</p>
                    <dl>
                      <dt>{t('gFormula')}</dt>
                      <dd>{txt(e.formula)}</dd>
                      <dt>{t('gUnit')}</dt>
                      <dd>{txt(e.unit)}</dd>
                      <dt>{t('gSource')}</dt>
                      <dd><code>{e.source}</code></dd>
                      <dt>{t('gScope')}</dt>
                      <dd>{txt(e.scope)}</dd>
                    </dl>
                  </section>
                );
              })}
              <ul className="ui-pop-common">
                {partial ? <li>{COMMON_SCOPE.partialMonth[lang]}</li> : null}
                <li>{COMMON_SCOPE.testInternal[lang]}</li>
                <li>{COMMON_SCOPE.timezone[lang]}</li>
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
