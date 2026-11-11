// Legend (kit 03 §5): text uses TEXT tokens; the swatch mimics the mark's shape exactly, 11×11, 30% radius.
import type { CSSProperties } from 'react';

export type SwatchKind = 'bar' | 'dot' | 'line' | 'dash';

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  kind: SwatchKind;
}

export function Swatch({ color, kind }: { color: string; kind: SwatchKind }) {
  return <span className={`ui-swatch ui-swatch--${kind}`} style={{ '--sw': color } as CSSProperties} aria-hidden="true" />;
}

export function Legend({ items }: { items: readonly LegendItem[] }) {
  if (items.length < 2) return null; // 1 series: the card title is already the series name
  return (
    <ul className="ui-legend">
      {items.map((it) => (
        <li key={it.key}>
          <Swatch color={it.color} kind={it.kind} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
