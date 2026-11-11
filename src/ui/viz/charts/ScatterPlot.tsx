// Quan hệ 2 biến, ≤ 3 nhóm (kit 03 §2): chấm R 4.5, vùng bắt chuột HIT 12.
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, GRID, gutterFor, HOVER_GLOW, Y_WIDTH } from '../axis';
import type { LegendItem } from '../Legend';
import { useChartAnim } from '../motion';
import { DOT_RING, NODE } from '../nodes';
import { Swatch } from '../Legend';

export const SCATTER_MAX_GROUPS = 3;
const R = 4.5;
const HIT = 12;

export interface ScatterDatum {
  id: string;
  name: string;
  x: number;
  y: number;
  series: string;
}

function dotShape(color: string) {
  return function ScatterDot(p: unknown) {
    const { cx, cy } = p as { cx?: number; cy?: number };
    if (cx == null || cy == null) return <g />;
    return (
      <g>
        <circle cx={cx} cy={cy} r={HIT} fill="transparent" />
        <circle cx={cx} cy={cy} r={R} fill={color} {...DOT_RING} />
      </g>
    );
  };
}

function ScatterTip({
  active,
  payload,
  groups,
  xLabel,
  yLabel,
  formatX,
  formatY,
}: {
  active?: boolean;
  payload?: readonly { payload?: ScatterDatum }[];
  groups: readonly LegendItem[];
  xLabel: string;
  yLabel: string;
  formatX: (v: number) => string;
  formatY: (v: number) => string;
}) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  const g = groups.find((x) => x.key === d.series);
  return (
    <div className="ui-tip" role="status">
      <div className="ui-tip-title">{d.name}</div>
      {g ? (
        <div className="ui-tip-row">
          <Swatch color={g.color} kind="dot" />
          <span>{g.label}</span>
        </div>
      ) : null}
      <div className="ui-tip-row"><span>{xLabel}</span><b>{formatX(d.x)}</b></div>
      <div className="ui-tip-row"><span>{yLabel}</span><b>{formatY(d.y)}</b></div>
    </div>
  );
}

export function ScatterPlot({
  data,
  groups,
  xLabel,
  yLabel,
  formatX,
  formatY,
}: {
  data: readonly ScatterDatum[];
  /** nhóm (key = giá trị `series`), tối đa 3 */
  groups: readonly LegendItem[];
  xLabel: string;
  yLabel: string;
  formatX: (v: number) => string;
  formatY: (v: number) => string;
}) {
  if (groups.length > SCATTER_MAX_GROUPS) throw new Error(`ScatterPlot: ${groups.length} nhóm > ${SCATTER_MAX_GROUPS}`);
  const anim = useChartAnim();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: HOVER_GLOW.room, right: NODE.pillEdge, bottom: 0, left: gutterFor(data.map((d) => d.y), formatY) }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis type="number" dataKey="x" name={xLabel} tick={AXIS} tickFormatter={formatX} axisLine={false} tickLine={false} />
        <YAxis type="number" dataKey="y" name={yLabel} width={Y_WIDTH} tick={AXIS} tickFormatter={formatY} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={false}
          isAnimationActive={false}
          content={<ScatterTip groups={groups} xLabel={xLabel} yLabel={yLabel} formatX={formatX} formatY={formatY} />}
        />
        {groups.map((g) => (
          <Scatter key={g.key} name={g.label} data={data.filter((d) => d.series === g.key)} fill={g.color} shape={dotShape(g.color)} {...anim} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
