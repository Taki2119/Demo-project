// Single-series line over time (kit 03 §3) — EXACTLY ONE pill, at the best point per goodWhen.
// Its own template (doesn't use MultiLines): the multi-series template has no static pill.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, AXIS_PAD, AXIS_TICK_GAP, GRID, gutterFor, PILL_TOP, Y_WIDTH } from '../axis';
import type { LegendItem } from '../Legend';
import { useChartAnim } from '../motion';
import { bestIn, NODE, seriesNode, SOLO_HOT } from '../nodes';
import { Tip } from '../Tip';
import { num, type ChartFormat, type Point } from './common';

export function SoloLine({
  data,
  xKey,
  yKey,
  label,
  goodWhen,
  fmt,
}: {
  data: readonly Point[];
  xKey: string;
  yKey: string;
  label: string;
  /** NO default (kit 03 §1). */
  goodWhen: 'up' | 'down';
  fmt: ChartFormat;
}) {
  const anim = useChartAnim();
  const values = data.map((d) => num(d[yKey]));
  const at = bestIn(values, goodWhen);
  const best = at == null ? null : values[at];
  const pill = at == null || best == null ? undefined : { at, value: best, text: fmt.value(best) };
  const items: LegendItem[] = [{ key: yKey, label, color: 'var(--line-solo)', kind: 'line' }];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={[...data]} margin={{ top: PILL_TOP, right: NODE.pillEdge, bottom: 0, left: gutterFor(values, fmt.tick) }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tick={AXIS} tickFormatter={fmt.xTick} axisLine={false} tickLine={false} padding={AXIS_PAD} minTickGap={AXIS_TICK_GAP} />
        <YAxis width={Y_WIDTH} tick={AXIS} tickFormatter={fmt.tick} axisLine={false} tickLine={false} />
        <Tooltip cursor={false} isAnimationActive={false} content={<Tip items={items} format={(_, v) => fmt.value(v)} title={fmt.xTitle} />} />
        <Line
          type="monotone"
          dataKey={yKey}
          name={label}
          stroke="var(--line-solo)"
          strokeWidth={2}
          strokeLinecap="round"
          connectNulls={false}
          dot={seriesNode({ color: 'var(--line-solo)', pill })}
          activeDot={SOLO_HOT}
          {...anim}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
