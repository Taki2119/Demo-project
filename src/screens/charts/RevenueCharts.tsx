// Charts for the Revenue page (lazy-loaded — pulls Recharts in). Receives MONTH rows already rolled up by plan.
import type { Row } from '../../data/api';
import { maxAbs, pickColumns, stackTotals } from '../../data/chartData';
import { useColumnLabel } from '../../data/labels';
import { monthLabel, monthShort, moneyScale, scaled, yen } from '../../ui/format';
import { useLangStore } from '../../ui/i18n';
import { ChartCard } from '../../ui/viz/ChartCard';
import type { ChartFormat, Point } from '../../ui/viz/charts/common';
import { SoloLine } from '../../ui/viz/charts/SoloLine';
import { StackedBarLineChart, stackItems, type BarSpec, type LineSpec } from '../../ui/viz/charts/StackedBarLineChart';

const KEYS = ['mrr_end', 'new_mrr', 'expansion_mrr', 'contraction_mrr', 'churned_mrr', 'invoiced_amount', 'paid_amount'];

export default function RevenueCharts({ rows }: { rows: readonly Row[] }) {
  const lang = useLangStore((s) => s.lang);
  const col = useColumnLabel();
  const data = pickColumns(rows, 'month', KEYS);

  // Money scale chosen by each card's TARGET ⇒ all axis labels share one unit (printed at the top of the card).
  const money = (points: readonly Point[], keys: readonly string[]): ChartFormat & { unit: string } => {
    const s = moneyScale(maxAbs(points, keys) ?? 0, lang);
    return {
      unit: s.unit,
      value: (v) => yen(v, lang),
      tick: (v) => scaled(v, s, lang),
      xTick: (m) => monthShort(m, lang),
      xTitle: (m) => monthLabel(m, lang),
    };
  };

  const mrrFmt = money(data, ['mrr_end']);

  // Diverging bars: IN (new, expansion) above 0 · OUT (contraction, churn — the mart already carries negatives) below.
  // Second encoding channel for good/bad = POSITION (above/below 0), not just colour.
  const moves: BarSpec[] = [
    { key: 'new_mrr', label: col('new_mrr'), color: 'var(--ok-fill)' },
    { key: 'expansion_mrr', label: col('expansion_mrr'), color: 'var(--ok-fill-2)' },
    { key: 'contraction_mrr', label: col('contraction_mrr'), color: 'var(--crit-fill-2)', sign: -1 },
    { key: 'churned_mrr', label: col('churned_mrr'), color: 'var(--crit-fill)', sign: -1 },
  ];
  // Extent of the diverging bars = stacked total per side (only to pick the axis unit; missing cells are SKIPPED).
  const movesFmt = money(stackTotals(data, moves), ['up', 'down']);

  const billed: BarSpec[] = [{ key: 'invoiced_amount', label: col('invoiced_amount'), color: 'var(--series-2)' }];
  const paid: LineSpec = { key: 'paid_amount', label: col('paid_amount'), color: 'var(--series-3)' };
  const billFmt = money(data, ['invoiced_amount', 'paid_amount']);

  return (
    <div className="ui-charts">
      <ChartCard title={col('mrr_end')} info="mrr_end" unit={mrrFmt.unit} wide>
        <SoloLine data={data} xKey="month" yKey="mrr_end" label={col('mrr_end')} goodWhen="up" fmt={mrrFmt} />
      </ChartCard>
      <ChartCard title={col('mrr_delta')} info="mrr_delta" unit={movesFmt.unit} legend={stackItems(moves)}>
        <StackedBarLineChart data={data} xKey="month" stacks={moves} fmt={movesFmt} />
      </ChartCard>
      <ChartCard title={`${col('invoiced_amount')} · ${col('paid_amount')}`} info={['invoiced_amount', 'paid_amount']} unit={billFmt.unit} legend={stackItems(billed, paid)}>
        <StackedBarLineChart data={data} xKey="month" stacks={billed} line={paid} fmt={billFmt} maxBarSize={22} />
      </ChartCard>
    </div>
  );
}
