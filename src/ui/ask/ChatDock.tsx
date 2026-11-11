// "Ask AI" button (demo version — does NOT call a real AI) in the top-right corner, on EVERY screen.
// This file is in the initial chunk, so it holds only the button: the question set + chat window (ChatPanel) are
// LAZY-LOADED on first open. Once opened, the window stays in the DOM when collapsed (hidden via `hidden`) ⇒ typed
// text and scroll position are preserved.
import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { pick, PAGE_ASK } from '../../nav/catalog';
import { boardChunk } from '../chunk';
import { ErrorBoundary } from '../ErrorBoundary';
import { useLangStore } from '../i18n';

const ChatPanel = lazy(boardChunk('ask-panel', () => import('./ChatPanel')));

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3 3.5h10a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1H7.2L4.4 13.3v-2.3H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatDock() {
  const lang = useLangStore((s) => s.lang);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="btn ask-fab"
        aria-expanded={open}
        aria-controls="ask-dock"
        onClick={() => {
          setLoaded(true);
          setOpen((o) => !o);
        }}
      >
        <ChatIcon />
        <span>{pick(PAGE_ASK.name, lang)}</span>
      </button>
      {loaded ? (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <ChatPanel open={open} onClose={close} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </>
  );
}
