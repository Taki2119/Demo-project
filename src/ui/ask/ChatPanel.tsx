// "Ask AI" chat window (demo version — does NOT call a real AI), lazy-loaded from ChatDock.
//   · Portaled to body (kit 02 §3: floating panels must portal — an ancestor with filter/backdrop-filter breaks
//     the glass and position: fixed).
//   · Desktop: the floating window does NOT block the page (browse boards while asking). ≤640px: covers the full
//     screen ⇒ treated as a dialog: .main + side panel `inert`, Esc / close button returns focus to the open button.
//   · Does NOT lay out the sample question list. Suggestions: 3 while the input is empty · 3 based on typed text
//     (combobox: ↑↓ select, Enter asks, Tab fills the input, Esc closes suggestions) · 3 related after each answer.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '../../ask/chat';
import type { PlanNames } from '../../ask/match';
import { autocomplete, promptOf, questionById, WELCOME } from '../../ask/questions';
import { useSource } from '../../data/api';
import { useLabel } from '../../data/labels';
import { pick, PAGE_ASK } from '../../nav/catalog';
import { useLangStore, useT } from '../i18n';
import { useMediaQuery } from '../useMediaQuery';
import { BotMessage, QuestionButtons } from './AnswerView';

/** ja/vi plan names from DB labels ⇒ recognizes "グロース" / "gói Tăng trưởng" in typed queries. */
function usePlanNames(): PlanNames {
  const { data } = useSource('labels');
  const out: PlanNames = {};
  for (const r of data?.rows ?? []) {
    if (r.domain === 'plan' && (r.code === 'starter' || r.code === 'growth' || r.code === 'scale') && typeof r.ja === 'string' && typeof r.vi === 'string') {
      out[r.code] = { ja: r.ja, vi: r.vi };
    }
  }
  return out;
}

export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const names = usePlanNames();
  const { messages, busy, ask, askId, clear } = useChat();
  const mobile = useMediaQuery('(max-width: 640px)');
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [text, setText] = useState('');
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUserRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const listId = useId();

  const auto = useMemo(() => autocomplete(text, lang, names), [text, lang, names]);
  const showAuto = auto.length > 0 && !dismissed;

  // Open ⇒ focus the chat input.
  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // ≤640px the window covers the full screen ⇒ content behind it gets no focus / no scrolling.
  useEffect(() => {
    if (!(open && mobile)) return;
    const behind = [...document.querySelectorAll<HTMLElement>('.main, .side, .side-bar')];
    for (const el of behind) el.inert = true;
    document.documentElement.setAttribute('data-chat-open', '');
    return () => {
      for (const el of behind) el.inert = false;
      document.documentElement.removeAttribute('data-chat-open');
    };
  }, [open, mobile]);

  // New turn ⇒ the just-sent question goes to the top of the scroll area, the answer grows right below it.
  const userCount = messages.filter((m) => m.role === 'user').length;
  useEffect(() => {
    // ⚠ Do NOT use scrollIntoView: it scrolls EVERY scrollable ancestor, including .ask-dock (overflow hidden
    // is still scrollable from code) ⇒ the whole window slides up, the chat is pushed to the middle, bottom half empty.
    // Scroll only the conversation area.
    const body = bodyRef.current;
    const el = lastUserRef.current;
    if (userCount === 0 || !body || !el) return;
    const top = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 8;
    body.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }, [userCount, reduce]);
  const lastUserId = [...messages].reverse().find((m) => m.role === 'user')?.id;

  const reset = () => {
    setText('');
    setActive(-1);
    setDismissed(false);
  };
  const pickQ = (id: string, slots?: Parameters<typeof askId>[1]) => {
    void askId(id, slots);
    reset();
    inputRef.current?.focus({ preventScroll: true });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (showAuto && active >= 0) return pickQ(auto[active]!.id);
    if (!text.trim()) return;
    void ask(text, names);
    reset();
  };
  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showAuto) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      // Cycle through -1 (nothing selected — Enter sends the typed text) … n−1.
      const slots = auto.length + 1;
      setActive((a) => ((a + 1 + d + slots) % slots) - 1);
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      setText(auto[Math.max(0, active)]!.text);
      setActive(-1);
      setDismissed(true);
    }
  };
  const onPanelKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (showAuto) {
      setDismissed(true);
      setActive(-1);
    } else onClose();
  };

  return createPortal(
    <div
      id="ask-dock"
      className="ui-glass ask-dock"
      role="dialog"
      aria-modal={mobile}
      aria-labelledby={titleId}
      hidden={!open}
      onKeyDown={onPanelKey}
    >
      <header className="ask-dock-head">
        <h2 id={titleId}>{pick(PAGE_ASK.name, lang)}</h2>
        <span className="chip chip-sample">{t('askDemoChip')}</span>
        <span className="ask-dock-grow" />
        {messages.length ? (
          <button type="button" className="btn" onClick={clear} disabled={busy}>
            {t('askClear')}
          </button>
        ) : null}
        <button type="button" className="btn ask-dock-close" aria-label={t('askClose')} onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div ref={bodyRef} className="ask-dock-body">
        {messages.length === 0 ? (
          <div className="ask-welcome">
            <p className="ask-note">{t('askDemoNote')}</p>
            <h3>{t('askSuggestLabel')}</h3>
            <QuestionButtons ids={WELCOME} onPick={pickQ} lang={lang} />
          </div>
        ) : (
          <div className="ask-log" role="log" aria-label={t('askLog')}>
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} ref={m.id === lastUserId ? lastUserRef : undefined} className="ask-msg ask-user">
                  <span className="ask-who">{t('askYou')}</span>
                  <p>{m.text ?? (m.qid ? promptOf(questionById(m.qid)!, lang) : '')}</p>
                </div>
              ) : (
                <div key={m.id} className="ask-msg ask-bot" aria-busy={m.status === 'thinking'}>
                  <span className="ask-who">{t('askBot')}</span>
                  <BotMessage m={m} label={label} onPick={pickQ} />
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <form className="ask-composer" onSubmit={submit}>
        {showAuto ? (
          <ul id={listId} role="listbox" aria-label={t('askSuggestLabel')} className="ask-auto">
            {auto.map((a, i) => (
              <li
                key={a.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown keeps focus in the chat input (clicking doesn't dismiss the combobox)
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickQ(a.id)}
              >
                {a.text}
              </li>
            ))}
            <li className="ask-auto-hint" aria-hidden="true">{t('askAutoHint')}</li>
          </ul>
        ) : null}
        <div className="ask-compose-row">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showAuto}
            aria-controls={listId}
            aria-activedescendant={showAuto && active >= 0 ? `${listId}-${active}` : undefined}
            aria-label={t('askInputLabel')}
            value={text}
            maxLength={300}
            onChange={(e) => {
              setText(e.target.value);
              setActive(-1);
              setDismissed(false);
            }}
            onKeyDown={onInputKey}
            placeholder={t('askPlaceholder')}
            enterKeyHint="send"
            autoComplete="off"
          />
          <button type="submit" className="btn ask-send" disabled={busy || (!text.trim() && !(showAuto && active >= 0))}>
            {t('askSend')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
