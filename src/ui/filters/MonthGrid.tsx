// Lưới tháng trong panel lọc: mỗi NĂM có dữ liệu một khối 12 ô (4 × 3). Ô ngoài phạm vi dữ liệu bị
// khoá (disabled) chứ không ẩn, để lưới năm nào cũng đủ 12 ô và thẳng hàng.
import { inRange, type MonthRange, type Ym } from '../../data/period';
import { monthLabel } from '../format';
import { useLangStore, useT } from '../i18n';

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

export function MonthGrid({
  months,
  selected,
  edges,
  onPick,
  onHover,
}: {
  /** Tháng có trong dữ liệu (tăng dần). */
  months: readonly Ym[];
  /** Khoảng đang tô (nền nhạt); null ⇒ không tô. */
  selected: MonthRange | null;
  /** Ô đầu/cuối tô đậm + aria-pressed. */
  edges: readonly Ym[];
  onPick: (ym: Ym) => void;
  onHover?: (ym: Ym | null) => void;
}) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const have = new Set(months);
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last) return null;
  const years: number[] = [];
  for (let y = Number(first.slice(0, 4)); y <= Number(last.slice(0, 4)); y += 1) years.push(y);

  return (
    <div className="ui-mgrid-wrap" onPointerLeave={() => onHover?.(null)}>
      {years.map((y) => (
        <section key={y} className="ui-mgrid-year">
          <h3>{t('yearLabel').replace('{y}', String(y))}</h3>
          <div className="ui-mgrid">
            {MONTHS.map((mm) => {
              const ym = `${y}-${mm}`;
              const ok = have.has(ym);
              const edge = edges.includes(ym);
              return (
                <button
                  key={ym}
                  type="button"
                  className="ui-mcell"
                  data-ym={ym}
                  disabled={!ok}
                  aria-pressed={ok ? edge : undefined}
                  aria-label={monthLabel(ym, lang)}
                  data-in={ok && selected != null && inRange(ym, selected) ? 'true' : undefined}
                  onClick={() => onPick(ym)}
                  onPointerEnter={ok ? () => onHover?.(ym) : undefined}
                  onFocus={ok ? () => onHover?.(ym) : undefined}
                >
                  {t('monthCell').replace('{m}', String(Number(mm)))}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
