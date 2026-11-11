// HORIZONTAL bars in DOM (kit 03 §2) — rankings, long labels. null value ⇒ no bar drawn, text "—".
// Overlay: --mark-shade-grad-x. DOM hover: box-shadow radius TWICE the drop-shadow (1.5→3, 5→10).
import type { CSSProperties } from 'react';
import { NO_VALUE } from '../../format';

export interface HBarRow {
  key: string;
  label: string;
  value: number | null;
  text: string;
  note?: string;
  color?: string;
}

export function HBars({ rows, max, labelW = 7 }: { rows: readonly HBarRow[]; max?: number; labelW?: number }) {
  const top = max ?? Math.max(0, ...rows.map((r) => r.value ?? 0));
  return (
    <ul className="ui-hbars" style={{ '--hb-label': `${labelW}rem` } as CSSProperties}>
      {rows.map((r) => (
        <li key={r.key} className="ui-hbar">
          <span className="ui-hbar-label">{r.label}</span>
          <span className="ui-hbar-track">
            {r.value != null && top > 0 ? (
              <span
                className="ui-hbar-fill"
                style={{ width: `${(Math.max(0, r.value) / top) * 100}%`, '--hb': r.color ?? 'var(--bar-fill)' } as CSSProperties}
              />
            ) : null}
          </span>
          <span className="ui-hbar-text">
            {r.value == null ? NO_VALUE : r.text}
            {r.note ? <small>{r.note}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
