// Chú giải (kit 03 §5): chữ dùng token CHỮ; ô màu mô phỏng đúng hình của mark, 11×11, bo 30%.
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
  if (items.length < 2) return null; // 1 chuỗi: tiêu đề thẻ đã là tên chuỗi
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
