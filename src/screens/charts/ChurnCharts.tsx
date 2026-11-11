// Charts for the Early churn warning page (lazy-loaded):
//   · number of companies by risk level per weekly snapshot (drops the "low" level — it dwarfs the 3 levels that need attention)
//   · outreach results by month (interventions-monthly)
//   (the 2 charts above follow the filter's month range; the cause chart follows the current list)
//   · main causes in the watch list
import { useSource, type Row } from '../../data/api';
import { countBy, crossCount, fillMonths, sumByKey } from '../../data/chartData';
import { BAND_ORDER } from '../../data/churn';
import { useColumnLabel, useLabel } from '../../data/labels';
import { sliceRows, type MonthRange } from '../../data/period';
import { numericRows } from '../../data/rollup';
import { count, dayLabel, dayShort, monthLabel, monthShort } from '../../ui/format';
import { useLangStore, useT } from '../../ui/i18n';
import { ChartCard } from '../../ui/viz/ChartCard';
import type { ChartFormat } from '../../ui/viz/charts/common';
import { HBars, type HBarRow } from '../../ui/viz/charts/HBars';
import { StackedBarLineChart, stackItems, type BarSpec } from '../../ui/viz/charts/StackedBarLineChart';
import { rampSteps, seriesColors } from '../../ui/viz/series';

const AT_RISK = BAND_ORDER.filter((b) => b !== 'low');
const OUTCOMES = ['saved', 'churned', 'no_response', 'pending'] as const;

// `history` is already filtered by range on the page; `range` filters the outreach results (source loaded here).
// range null (no history yet) ⇒ draw the whole series.
export default function ChurnCharts({ watch, history, range }: { watch: readonly Row[]; history: readonly Row[]; range: MonthRange | null }) {
  const lang = useLangStore((s) => s.lang);
  const t = useT();
  const col = useColumnLabel();
  const label = useLabel();
  const interventions = useSource('interventions-monthly');
  const counts = (v: number) => count(v, lang);

  // Stacking: the FIRST slice is at the bottom ⇒ the most severe level (cancel scheduled) sits against the axis, darkest.
  const ramp = rampSteps(AT_RISK.length);
  const bands: BarSpec[] = AT_RISK.map((b, i) => ({ key: b, label: label('risk_band', b), color: ramp[i] as string }));
  const bandData = crossCount(history, 'snapshot_date', 'risk_band', AT_RISK);
  const weekly: ChartFormat = { value: counts, tick: counts, xTick: (d) => dayShort(d, lang), xTitle: (d) => dayLabel(d, lang) };

  const colors = seriesColors(OUTCOMES.length);
  const outcomes: BarSpec[] = OUTCOMES.map((o, i) => ({ key: o, label: label('intervention_outcome', o), color: colors[i] as string }));
  // The source only has rows in months WITH outreach ⇒ fill empty months with a real 0, so the time axis doesn't skip.
  const outcomeRows = interventions.data ? numericRows(interventions.data.rows) : [];
  const outcomeData = fillMonths(sumByKey(range ? sliceRows(outcomeRows, range) : outcomeRows, 'month', OUTCOMES), 'month', OUTCOMES);
  const monthly: ChartFormat = { value: counts, tick: counts, xTick: (m) => monthShort(m, lang), xTitle: (m) => monthLabel(m, lang) };

  const reasons: HBarRow[] = countBy(
    watch.filter((r) => r.risk_band !== 'low'),
    'top_reason',
  ).map(({ code, n }) => ({ key: code, label: label('top_reason', code), value: n, text: counts(n) }));

  return (
    <div className="ui-charts">
      <ChartCard title={col('risk_band')} info="risk_band" legend={stackItems(bands)} note={t('atRiskOnly')} wide>
        <StackedBarLineChart data={bandData} xKey="snapshot_date" stacks={bands} fmt={weekly} />
      </ChartCard>
      {outcomeData.length > 0 ? (
        <ChartCard title={col('interventions')} info="interventions" legend={stackItems(outcomes)}>
          <StackedBarLineChart data={outcomeData} xKey="month" stacks={outcomes} fmt={monthly} />
        </ChartCard>
      ) : null}
      {reasons.length > 0 ? (
        <ChartCard title={col('top_reason')} info="top_reason" note={t('atRiskOnly')} dom>
          <HBars rows={reasons} labelW={11} />
        </ChartCard>
      ) : null}
    </div>
  );
}
