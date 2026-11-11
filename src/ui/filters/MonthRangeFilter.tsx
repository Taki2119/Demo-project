// Pick a month RANGE (from – to). Kit 01 §6 PeriodFilter, MONTH block only.
// 1st click = one end, 2nd click = the other end (clicking backwards swaps them) ⇒ apply + close + focus back to the button.
// Between the two clicks, hovering / Tabbing over a cell previews the range to be picked.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { MonthRange, Ym } from '../../data/period';
import { useT } from '../i18n';
import { usePopover } from '../usePopover';
import { MonthGrid } from './MonthGrid';

export function MonthRangeFilter({
  value,
  onChange,
  months,
  label,
  text,
}: {
  value: MonthRange;
  onChange: (r: MonthRange) => void;
  months: readonly Ym[];
  label: string;
  /** Text shown on the button (the caller formats it per language). */
  text: string;
}) {
  const t = useT();
  const [anchor, setAnchor] = useState<Ym | null>(null);
  const [hover, setHover] = useState<Ym | null>(null);
  const { id, open, toggle, close, btn, pop, style } = usePopover({
    focusInside: (p) => p.querySelector<HTMLElement>(`[data-ym="${value.to}"]`),
  });

  const onToggle = () => {
    setAnchor(null);
    setHover(null);
    toggle();
  };
  const onPick = (ym: Ym) => {
    if (anchor == null) {
      setAnchor(ym);
      return;
    }
    onChange(anchor <= ym ? { from: anchor, to: ym } : { from: ym, to: anchor });
    setAnchor(null);
    close(true);
  };

  const preview: MonthRange | null =
    anchor == null ? value : hover == null ? { from: anchor, to: anchor } : anchor <= hover ? { from: anchor, to: hover } : { from: hover, to: anchor };
  const edges = anchor == null ? [value.from, value.to] : [anchor];

  return (
    <>
      <button ref={btn} type="button" className="ui-filter" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={onToggle}>
        <span className="ui-filter-k">{label}</span>
        <span className="ui-filter-v">{text}</span>
        <Chevron />
      </button>
      {open
        ? createPortal(
            <div ref={pop} id={id} className="ui-pop ui-fpanel" role="dialog" aria-label={label} tabIndex={-1} style={style}>
              <p className="ui-fpanel-hint" aria-live="polite">{anchor == null ? t('pickStart') : t('pickEnd')}</p>
              <MonthGrid months={months} selected={preview} edges={edges} onPick={onPick} onHover={anchor == null ? undefined : setHover} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function Chevron() {
  return (
    <svg className="ui-filter-chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
