// NODE – RING – PILL (kit 03 §4): each point is a dot with a ring; the number worth reading sits on ONE pill.
import { VALUE_PILL } from './axis';

export const NODE = { r: 4, hotR: 5, sparkR: 3, sparkRing: 1.5, pillEdge: 34 } as const;

/** Pin the dot's props — use 'none', not undefined (the series' props leak into dot). */
export const DOT_RING = {
  stroke: 'var(--node-ring)',
  strokeWidth: 2,
  fillOpacity: 1,
  strokeOpacity: 1,
  strokeDasharray: 'none',
} as const;

/** Default activeDot: filled with --accent (orange = interaction layer). */
export const HOT_NODE = { r: NODE.hotR, fill: 'var(--accent)', ...DOT_RING } as const;
/** Single line: avoid orange on orange ⇒ hot dot filled with --line-solo-hot. */
export const SOLO_HOT = { r: NODE.hotR, fill: 'var(--line-solo-hot)', ...DOT_RING } as const;

export interface PillSpec {
  /** point index */
  at: number;
  /** expected value at the point — ASSERTION: on mismatch, do NOT draw the pill (rather than tagging the wrong point). */
  value: number;
  text: string;
}

export const pillWidth = (text: string) =>
  Math.max(VALUE_PILL.h * 1.4, text.length * VALUE_PILL.ch + 2 * VALUE_PILL.padX);

/** The BEST point per goodWhen. Ties ⇒ take the LATEST point (own choice: the most recent point is more worth reading). */
export function bestIn(values: readonly (number | null)[], goodWhen: 'up' | 'down'): number | null {
  let best: number | null = null;
  values.forEach((v, i) => {
    if (v == null) return;
    const b = best == null ? null : (values[best] as number);
    if (b == null || (goodWhen === 'up' ? v >= b : v <= b)) best = i;
  });
  return best;
}

interface DotProps {
  cx?: number | null;
  cy?: number | null;
  index?: number;
  value?: unknown;
}

function Pill({ x, y, text }: { x: number; y: number; text: string }) {
  const { h, gap, font } = VALUE_PILL;
  const w = pillWidth(text);
  const top = y - NODE.r - gap - h;
  return (
    <g className="ui-pill" pointerEvents="none">
      <rect x={x - w / 2} y={top} width={w} height={h} rx={h / 2} fill="var(--pill-flat)" />
      <text
        x={x}
        y={top + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--on-pill-flat)"
        fontSize={font}
        fontWeight={600}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {text}
      </text>
    </g>
  );
}

/** `dot` function for <Line>/<Area>. Skips empty points (cy null). Doesn't spread Recharts props into <circle>. */
export function seriesNode({ color, pill }: { color: string; pill?: PillSpec }) {
  return function Node(p: DotProps) {
    const key = `n-${p.index ?? 0}`;
    if (p.cx == null || p.cy == null) return <g key={key} />;
    const v = Array.isArray(p.value) ? p.value[1] : p.value;
    const showPill = pill != null && p.index === pill.at && v === pill.value;
    return (
      <g key={key}>
        <circle cx={p.cx} cy={p.cy} r={NODE.r} fill={color} {...DOT_RING} />
        {showPill ? <Pill x={p.cx} y={p.cy} text={pill.text} /> : null}
      </g>
    );
  };
}
