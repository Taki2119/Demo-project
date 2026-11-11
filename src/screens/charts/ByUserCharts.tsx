// Charts for the By user page (lazy-loaded): distribution of days active among seat holders, in the month
// the API returns (the latest month — possibly the running month). Partial month ⇒ the card header says
// "tính đến ngày X" (as of day X; X = the source's asOf data date) + a note under the card.
import type { Row } from '../../data/api';
import { histogram, monthProgress, num } from '../../data/chartData';
import { useColumnLabel } from '../../data/labels';
import { count, monthLabel } from '../../ui/format';
import { useLangStore, useT } from '../../ui/i18n';
import { ChartCard } from '../../ui/viz/ChartCard';
import type { ChartFormat, Point } from '../../ui/viz/charts/common';
import { StackedBarLineChart, type BarSpec } from '../../ui/viz/charts/StackedBarLineChart';

// Lower bound of each day-count bucket (hand-picked). Labels are numeric ranges — no translation needed.
const EDGES = [0, 1, 5, 10, 20];
const bucketLabel = (i: number) => {
  const lo = EDGES[i] as number;
  const next = EDGES[i + 1];
  return next == null ? `${lo}+` : next - lo === 1 ? `${lo}` : `${lo}–${next - 1}`;
};

export default function ByUserCharts({ rows, asOf }: { rows: readonly Row[]; asOf: string | null }) {
  const lang = useLangStore((s) => s.lang);
  const t = useT();
  const col = useColumnLabel();
  const seats = rows.filter((r) => r.is_seat === true);
  const counts = histogram(seats.map((r) => num(r.active_days)), EDGES);
  const data: Point[] = counts.map((n, i) => ({ bucket: bucketLabel(i), users: n }));
  const first = rows[0]?.month;
  const progress = typeof first === 'string' ? monthProgress(first, asOf) : null;
  const partial = progress?.complete === false ? progress.day : null;
  const month = typeof first === 'string' ? monthLabel(first, lang) + (partial != null ? t('asOfDay').replace('{d}', String(partial)) : '') : undefined;
  const fmt: ChartFormat = {
    value: (v) => count(v, lang),
    tick: (v) => count(v, lang),
    xTick: (b) => b,
    xTitle: (b) => `${col('active_days')}: ${b}`,
  };
  const bars: BarSpec[] = [{ key: 'users', label: t('userCount'), color: 'var(--series-1)' }];
  return (
    <div className="ui-charts">
      <ChartCard info="active_days" title={month ? `${col('active_days')} · ${month}` : col('active_days')} note={[col('is_seat'), partial != null ? t('partialMonthNote') : null].filter(Boolean).join(' · ')}>
        <StackedBarLineChart data={data} xKey="bucket" stacks={bars} fmt={fmt} />
      </ChartCard>
    </div>
  );
}
