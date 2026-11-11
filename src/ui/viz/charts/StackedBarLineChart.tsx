// Cột xếp lớp (+ 1 đường tuỳ chọn, CÙNG đơn vị) — kit 03 §2. Phần tử đầu của `stacks` ở đáy.
// Gộp luôn vai trò BarLineChart (1 lát + đường) và cột phân cực (stackOffset 'sign': lát âm đi
// xuống dưới mốc 0). Một trục Y duy nhất.
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, AXIS_PAD, AXIS_TICK_GAP, GRID, gutterFor, HOVER_GLOW, Y_WIDTH } from '../axis';
import type { LegendItem } from '../Legend';
import { barShape, stackEdge } from '../marks';
import { useChartAnim } from '../motion';
import { HOT_NODE, NODE, seriesNode } from '../nodes';
import { Tip } from '../Tip';
import { num, type ChartFormat, type Point } from './common';

export interface BarSpec {
  key: string;
  label: string;
  color: string;
  /** -1 = lát nằm DƯỚI mốc 0 (cột phân cực). Mặc định trên. */
  sign?: 1 | -1;
}
export interface LineSpec {
  key: string;
  label: string;
  color: string;
}

/** Chú giải theo thứ tự đọc từ TRÊN xuống: lát dương đảo ngược, rồi lát âm, rồi đường. */
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
  // Nhãn Y dài nhất tính trên tổng chồng (dương / âm) + đường.
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
        <Tooltip cursor={false} isAnimationActive={false} content={<Tip items={items} format={(_, v) => fmt.value(v)} title={fmt.xTitle} />} />
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
