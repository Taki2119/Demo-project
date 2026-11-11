// Nút ⓘ cạnh tên chỉ số / tiêu đề thẻ ⇒ popover giải thích, đọc TỪ src/data/glossary.ts
// (kit 02 §6 InfoTip + popoverFocus). Luật:
//   · popover PORTAL ra body (kit 02 §3 bẫy 1–2: không lồng kính, không bị containing block);
//   · mở ⇒ focus vào popover; Esc ⇒ đóng + focus về nút ⓘ; bấm ra ngoài (pointerdown) ⇒ đóng;
//   · vị trí position: fixed, kẹp trong khung, đặt lại khi cuộn / đổi cỡ;
//   · chung luật "một panel mở mỗi lúc" với bộ lọc — tất cả ở usePopover.ts.
import { createPortal } from 'react-dom';
import { COMMON_SCOPE, GLOSSARY, textOf, type GlossaryKey, type Text } from '../data/glossary';
import { useNameRefs } from '../data/labels';
import { useLangStore, useT } from './i18n';
import { usePopover } from './usePopover';

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
  // Mở/đóng, focus, Esc, bấm ra ngoài, vị trí, "một panel mở mỗi lúc": usePopover.ts.
  const { id, open, toggle, btn, pop, style } = usePopover();
  const names = list.map((k) => nameOf(GLOSSARY[k].name));
  const label = names.every((n) => n != null) ? `${t('info')}: ${names.join(' · ')}` : t('info');

  const txt = (v: Text) => textOf(v, lang) ?? t('unconfirmed');
  const partial = list.some((k) => GLOSSARY[k].partialMonth);

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="ui-info"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
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
