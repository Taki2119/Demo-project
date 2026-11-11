// Bars (kit 03 §4): BAR_R radius on the FREE EDGE; stacked bars have a 0.5px gap, the real edge is computed from the VALUE;
// shared gradient overlay id `ui-bar-shade` declared RIGHT inside the shape (wrapping it in a child component makes
// Recharts silently filter it out); hover = 2 paths (faint halo + opaque bar) lifted 3px.
import { HOVER_GLOW } from './axis';

export const BAR_R = 6;
const GAP = 0.5;

export type Edge = 'top' | 'bottom' | null;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Free edge of slice `key` in a stacked bar (order of `keys` = stacking order, first element at the bottom).
 *  Computed from the VALUE: only the last SAME-SIGN slice with value ≠ 0 is the edge (a trailing 0 slice doesn't steal the edge). */
export function stackEdge(keys: readonly string[], key: string, row: Record<string, unknown>): Edge {
  const v = num(row[key]);
  if (v == null || v === 0) return null;
  const same = keys.filter((k) => {
    const x = num(row[k]);
    return x != null && x !== 0 && Math.sign(x) === Math.sign(v);
  });
  if (same.at(-1) !== key) return null;
  return v > 0 ? 'top' : 'bottom';
}

/** Rectangle path with each corner rounded separately [tl, tr, br, bl]. */
export function roundedRect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: [number, number, number, number]): string {
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : '',
    `V${y + h - br}`,
    br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : '',
    `H${x + bl}`,
    bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : '',
    `V${y + tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : '',
    'Z',
  ].join('');
}

interface ShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Record<string, unknown>;
}

/** `shape` function (and `activeBar` with hot=true) for <Bar>. */
export function barShape({ color, edge, hot = false }: { color: string; edge: (row: Record<string, unknown>) => Edge; hot?: boolean }) {
  return function BarMark(p: unknown) {
    const { x = 0, y = 0, width = 0, height = 0, payload = {} } = p as ShapeProps;
    if (!width || !height) return <g />;
    const e = edge(payload);
    let top = Math.min(y, y + height);
    let h = Math.abs(height);
    // 0.5px gap: each NON-free edge pulls back 0.25px ⇒ two adjacent slices are 0.5px apart.
    if (e !== 'top') { top += GAP / 2; h -= GAP / 2; }
    if (e !== 'bottom') h -= GAP / 2;
    if (h <= 0) return <g />;
    const r = Math.min(BAR_R, width / 2, h);
    const corners: [number, number, number, number] = e === 'top' ? [r, r, 0, 0] : e === 'bottom' ? [0, 0, r, r] : [0, 0, 0, 0];
    const d = roundedRect(x, top, width, h, corners);
    return (
      <g transform={hot ? `translate(0 -${HOVER_GLOW.lift})` : undefined}>
        <defs>
          <linearGradient id="ui-bar-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--mark-shade)', stopOpacity: 'var(--mark-shade-top)' }} />
            <stop offset="1" style={{ stopColor: 'var(--mark-shade)', stopOpacity: 'var(--mark-shade-bot)' }} />
          </linearGradient>
        </defs>
        {hot ? (
          <path
            d={d}
            fill={color}
            opacity={HOVER_GLOW.dim}
            style={{ filter: `drop-shadow(0 0 ${HOVER_GLOW.near}px ${color}) drop-shadow(0 0 ${HOVER_GLOW.far}px ${color})` }}
          />
        ) : null}
        <path d={d} fill={color} />
        <path d={d} fill="url(#ui-bar-shade)" pointerEvents="none" />
      </g>
    );
  };
}
