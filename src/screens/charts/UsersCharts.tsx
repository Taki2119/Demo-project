// Charts for the User count page (lazy-loaded). Receives MONTH rows already rolled up by plan.
import type { Row } from '../../data/api';
import { negate, pickColumns, stickinessByMonth } from '../../data/chartData';
import { useColumnLabel, useLabel } from '../../data/labels';
import { count, monthLabel, monthShort, pct } from '../../ui/format';
import { useLangStore } from '../../ui/i18n';
import { ChartCard } from '../../ui/viz/ChartCard';
import type { ChartFormat } from '../../ui/viz/charts/common';
import { lineItems, MultiLines, type SeriesSpec } from '../../ui/viz/charts/MultiLines';
import { SoloLine } from '../../ui/viz/charts/SoloLine';
import { StackedBarLineChart, stackItems, type BarSpec } from '../../ui/viz/charts/StackedBarLineChart';
import { seriesColors } from '../../ui/viz/series';

export default function UsersCharts({ rows }: { rows: readonly Row[] }) {
  const lang = useLangStore((s) => s.lang);
  const col = useColumnLabel();
  const label = useLabel();
  const x = { xTick: (m: string) => monthShort(m, lang), xTitle: (m: string) => monthLabel(m, lang) };
  const counts: ChartFormat = { ...x, value: (v) => count(v, lang), tick: (v) => count(v, lang) };
  const rate: ChartFormat = { ...x, value: (v) => pct(v, lang), tick: (v) => pct(v, lang, 0) };

  const data = negate(pickColumns(rows, 'month', ['seat_users_end', 'mau', 'new_users', 'deactivated_users']), 'deactivated_users', 'deactivated_out');
  const [c1, c2] = seriesColors(2);
  const levels: SeriesSpec[] = [
    { key: 'seat_users_end', label: col('seat_users_end'), color: c1 as string },
    { key: 'mau', label: col('mau'), color: c2 as string },
  ];
  // Diverging bars: new users (above) · deactivated users (below, sign flipped ONLY for drawing; tooltip shows the absolute value).
  const flows: BarSpec[] = [
    { key: 'new_users', label: col('new_users'), color: 'var(--ok-fill)' },
    { key: 'deactivated_out', label: col('deactivated_users'), color: 'var(--crit-fill)', sign: -1, tipAbs: true },
  ];

  return (
    <div className="ui-charts">
      <ChartCard title={`${col('seat_users_end')} · ${col('mau')}`} info={['seat_users_end', 'mau']} legend={lineItems(levels)} wide>
        <MultiLines data={data} xKey="month" series={levels} fmt={counts} />
      </ChartCard>
      <ChartCard title={`${col('new_users')} · ${col('deactivated_users')}`} info={['new_users', 'deactivated_users']} legend={stackItems(flows)}>
        <StackedBarLineChart data={data} xKey="month" stacks={flows} fmt={counts} />
      </ChartCard>
      <ChartCard title={label('metric', 'stickiness')} info="stickiness">
        <SoloLine data={stickinessByMonth(rows)} xKey="month" yKey="stickiness" label={label('metric', 'stickiness')} goodWhen="up" fmt={rate} />
      </ChartCard>
    </div>
  );
}
