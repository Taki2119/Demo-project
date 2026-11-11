// Chọn MỘT tháng (kit 01 §6 PickFilter, dạng lưới tháng). Bấm ô ⇒ áp dụng + đóng + focus về nút.
import { createPortal } from 'react-dom';
import type { Ym } from '../../data/period';
import { useT } from '../i18n';
import { usePopover } from '../usePopover';
import { MonthGrid } from './MonthGrid';
import { Chevron } from './MonthRangeFilter';

export function MonthPickFilter({
  value,
  onChange,
  months,
  label,
  text,
}: {
  value: Ym;
  onChange: (m: Ym) => void;
  months: readonly Ym[];
  label: string;
  text: string;
}) {
  const t = useT();
  const { id, open, toggle, close, btn, pop, style } = usePopover({
    focusInside: (p) => p.querySelector<HTMLElement>(`[data-ym="${value}"]`),
  });
  const onPick = (ym: Ym) => {
    onChange(ym);
    close(true);
  };
  return (
    <>
      <button ref={btn} type="button" className="ui-filter" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}>
        <span className="ui-filter-k">{label}</span>
        <span className="ui-filter-v">{text}</span>
        <Chevron />
      </button>
      {open
        ? createPortal(
            <div ref={pop} id={id} className="ui-pop ui-fpanel" role="dialog" aria-label={label} tabIndex={-1} style={style}>
              <p className="ui-fpanel-hint">{t('pickMonth')}</p>
              <MonthGrid months={months} selected={{ from: value, to: value }} edges={[value]} onPick={onPick} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
