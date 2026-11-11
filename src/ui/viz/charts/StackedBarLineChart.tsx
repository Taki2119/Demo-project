// Stacked bars (+ 1 optional line, SAME unit) — kit 03 §2. The first element of `stacks` is at the bottom.
// Also covers BarLineChart (1 slice + line) and diverging bars (stackOffset 'sign': negative slices go
// below the 0 line). A single Y axis.
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, AXIS_PAD, AXIS_TICK_GAP, GRID, gutterFor, HOVER_GLOW, Y_WIDTH } from '../axis';
import type { LegendItem } from '../Legend';
import { barShape, stackEdge } from '../marks';
import { useChartAnim } from '../motion';
import { HOT_NODE, NODE, seriesNode } from '../nodes';
import { Tip } from '../Tip';
import { num, tipFormat, type ChartFormat, type Point } from './common';

export interface BarSpec {
  key: string;
  label: string;
  color: string;
  /** -1 = slice sits BELOW the 0 line (diverging bars). Default above. */
  sign?: 1 | -1;
  /** tooltip shows the absolute value (the slice's sign is flipped only to draw below 0). */
  tipAbs?: boolean;
}
export interface LineSpec {
  key: string;
  label: string;
  color: string;
}

/** Legend in reading order from the TOP down: positive slices reversed, then negative slices, then the line. */
export function stackItems(stacks: readonly BarSpec[], line?: LineSpec): LegendItem[] {
  const up = stacks.filter((s) => s.sign !== -1).reverse();
  const down = stacks.filter((s) => s.sign === -1);
  return [
    ...[...up, ...down].map((s): LegendItem => ({ key: s.key, label: s.label, color: s.color, kind: 'bar' })),
    ...(line ? [{ key: line.key, label: line.label, color: line.color, kind: 'line' as const }] : []),
  ];
}

export function StackedBarLineChart({
  data,
  xKey,
  stacks,
  line,
  fmt,
  maxBarSize = 26,
}: {
  data: readonly Point[];
  xKey: string;
  stacks: readonly BarSpec[];
  line?: LineSpec;
  fmt: ChartFormat;
  maxBarSize?: number;
}) {
  const anim = useChartAnim();
  const keys = stacks.map((s) => s.key);
  // Longest Y label computed on the stacked totals (positive / negative) + the line.
  const extent: (number | null)[] = data.flatMap((d) => {
    let up = 0;
    let down = 0;
    for (const k of keys) {
      const v = num(d[k]);
      if (v != null) (v > 0 ? (up += v) : (down += v));
    }
    return [up, down, line ? num(d[line.key]) : null];
  });
  const items = stackItems(stacks, line);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={[...data]}
        stackOffset="sign"
        margin={{ top: HOVER_GLOW.room, right: line ? NODE.pillEdge : HOVER_GLOW.room, bottom: 0, left: gutterFor(extent, fmt.tick) }}
      >
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tick={AXIS} tickFormatter={fmt.xTick} axisLine={false} tickLine={false} padding={AXIS_PAD} minTickGap={AXIS_TICK_GAP} />
        <YAxis width={Y_WIDTH} tick={AXIS} tickFormatter={fmt.tick} axisLine={false} tickLine={false} />
        <Tooltip cursor={false} isAnimationActive={false} content={<Tip items={items} format={tipFormat(stacks, fmt.value)} title={fmt.xTitle} />} />
        {stacks.map((s) => {
          const edge = (row: Record<string, unknown>) => stackEdge(keys, s.key, row);
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="s"
              fill={s.color}
              maxBarSize={maxBarSize}
              shape={barShape({ color: s.color, edge })}
              activeBar={barShape({ color: s.color, edge, hot: true })}
              {...anim}
            />
          );
        })}
        {line ? (
          <Line
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            strokeLinecap="round"
            connectNulls={false}
            dot={seriesNode({ color: line.color })}
            activeDot={{ ...HOT_NODE }}
            {...anim}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
