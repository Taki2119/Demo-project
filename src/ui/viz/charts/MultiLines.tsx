// 2–6 series of the SAME unit over time (kit 03 §2). No static pill; hot dot filled with --accent.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, AXIS_PAD, AXIS_TICK_GAP, GRID, gutterFor, HOVER_GLOW, Y_WIDTH } from '../axis';
import type { LegendItem } from '../Legend';
import { useChartAnim } from '../motion';
import { HOT_NODE, NODE, seriesNode } from '../nodes';
import { Tip } from '../Tip';
import { num, type ChartFormat, type Point } from './common';

export const MULTI_LINES_MAX = 6;

export interface SeriesSpec {
  key: string;
  label: string;
  color: string;
}

export const lineItems = (series: readonly SeriesSpec[]): LegendItem[] =>
  series.map((s) => ({ key: s.key, label: s.label, color: s.color, kind: 'line' }));

export function MultiLines({ data, xKey, series, fmt }: { data: readonly Point[]; xKey: string; series: readonly SeriesSpec[]; fmt: ChartFormat }) {
  if (series.length > MULTI_LINES_MAX) throw new Error(`MultiLines: ${series.length} series > ${MULTI_LINES_MAX}`);
  const anim = useChartAnim();
  const values = data.flatMap((d) => series.map((s) => num(d[s.key])));
  const items = lineItems(series);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={[...data]} margin={{ top: HOVER_GLOW.room, right: NODE.pillEdge, bottom: 0, left: gutterFor(values, fmt.tick) }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tick={AXIS} tickFormatter={fmt.xTick} axisLine={false} tickLine={false} padding={AXIS_PAD} minTickGap={AXIS_TICK_GAP} />
        <YAxis width={Y_WIDTH} tick={AXIS} tickFormatter={fmt.tick} axisLine={false} tickLine={false} />
        <Tooltip cursor={false} isAnimationActive={false} content={<Tip items={items} format={(_, v) => fmt.value(v)} title={fmt.xTitle} />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            connectNulls={false}
            dot={seriesNode({ color: s.color })}
            activeDot={{ ...HOT_NODE }}
            {...anim}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
