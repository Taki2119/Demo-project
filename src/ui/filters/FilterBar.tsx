// Filter bar (kit 01 §6 FilterBar): the filters + a reset button shown ONLY when different from default (`dirty`).
// Clicking reset ⇒ the button disappears, so focus moves to the first filter button (doesn't fall back to body).
import { useRef, type ReactNode } from 'react';
import { useT } from '../i18n';

function FilterCloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M2 3h9L7.6 7.4V12L5.4 13.2V7.4Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m10.5 9.5 3.5 3.5m0-3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function FilterBar({ dirty, onReset, children }: { dirty: boolean; onReset: () => void; children: ReactNode }) {
  const t = useT();
  const bar = useRef<HTMLDivElement>(null);
  const reset = () => {
    onReset();
    bar.current?.querySelector<HTMLElement>('.ui-filter')?.focus();
  };
  return (
    <div ref={bar} className="ui-filterbar" role="group" aria-label={t('filters')}>
      {children}
      {dirty ? (
        <button type="button" className="btn ui-filter-reset" aria-label={t('resetFilter')} title={t('resetFilter')} onClick={reset}>
          <FilterCloseIcon />
          <span>{t('reset')}</span>
        </button>
      ) : null}
    </div>
  );
}
