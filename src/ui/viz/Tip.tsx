// Multi-line tooltip (kit 03 §7). Row order = order of `items` — the stacked-bar template orders them to
// match the picture (top slice first; diverging bars: positive slices top-down, then negative slices).
// Deviation from kit: OPAQUE surface (--surface) instead of glass — Recharts' tooltip sits INSIDE a glass card, and glass
// nested in an ancestor with backdrop-filter can only blur an empty backdrop (kit 02 §3 glass pitfall 1).
import { NO_VALUE } from '../format';
import { Swatch, type LegendItem } from './Legend';

interface Entry {
  dataKey?: string | number;
  value?: unknown;
}

export interface TipProps {
  items: readonly LegendItem[];
  format: (key: string, v: number) => string;
  title: (label: string) => string;
  // Injected by Recharts:
  active?: boolean;
  payload?: readonly Entry[];
  label?: string | number;
}

export function Tip({ items, format, title, active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const byKey = new Map(payload.map((e) => [String(e.dataKey), e.value]));
  const rows = items.filter((it) => byKey.has(it.key));
  return (
    <div className="ui-tip" role="status">
      <div className="ui-tip-title">{title(String(label ?? ''))}</div>
      {rows.map((it) => {
        const v = byKey.get(it.key);
        return (
          <div key={it.key} className="ui-tip-row">
            <Swatch color={it.color} kind={it.kind} />
            <span>{it.label}</span>
            <b>{typeof v === 'number' && Number.isFinite(v) ? format(it.key, v) : NO_VALUE}</b>
          </div>
        );
      })}
    </div>
  );
}
