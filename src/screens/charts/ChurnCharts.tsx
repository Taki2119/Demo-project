// Biểu đồ trang Cảnh báo huỷ sớm (nạp động):
//   · số công ty theo mức rủi ro qua từng ảnh chụp tuần (bỏ mức "thấp" — nó lấn át 3 mức cần chăm sóc)
//   · kết quả chăm sóc theo tháng (interventions-monthly)
//   · nguyên nhân chính trong danh sách cần chăm sóc
import { useSource, type Row } from '../../data/api';
import { countBy, crossCount, fillMonths, sumByKey } from '../../data/chartData';
import { BAND_ORDER } from '../../data/churn';
import { useColumnLabel, useLabel } from '../../data/labels';
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

export default function ChurnCharts({ watch, history }: { watch: readonly Row[]; history: readonly Row[] }) {
  const lang = useLangStore((s) => s.lang);
  const t = useT();
  const col = useColumnLabel();
  const label = useLabel();
  const interventions = useSource('interventions-monthly');
  const counts = (v: number) => count(v, lang);

  // Xếp lớp: lát ĐẦU ở đáy ⇒ mức nặng nhất (hẹn huỷ) nằm sát trục, đậm nhất.
  const ramp = rampSteps(AT_RISK.length);
  const bands: BarSpec[] = AT_RISK.map((b, i) => ({ key: b, label: label('risk_band', b), color: ramp[i] as string }));
  const bandData = crossCount(history, 'snapshot_date', 'risk_band', AT_RISK);
  const weekly: ChartFormat = { value: counts, tick: counts, xTick: (d) => dayShort(d, lang), xTitle: (d) => dayLabel(d, lang) };

  const colors = seriesColors(OUTCOMES.length);
  const outcomes: BarSpec[] = OUTCOMES.map((o, i) => ({ key: o, label: label('intervention_outcome', o), color: colors[i] as string }));
  // Nguồn chỉ có dòng ở tháng CÓ lượt chăm sóc ⇒ lấp tháng trống = 0 thật, để trục thời gian không nhảy cóc.
  const outcomeData = interventions.data ? fillMonths(sumByKey(numericRows(interventions.data.rows), 'month', OUTCOMES), 'month', OUTCOMES) : [];
  const monthly: ChartFormat = { value: counts, tick: counts, xTick: (m) => monthShort(m, lang), xTitle: (m) => monthLabel(m, lang) };

  const reasons: HBarRow[] = countBy(
    watch.filter((r) => r.risk_band !== 'low'),
    'top_reason',
  ).map(({ code, n }) => ({ key: code, label: label('top_reason', code), value: n, text: counts(n) }));

  return (
    <div className="ui-charts">
      <ChartCard title={col('risk_band')} legend={stackItems(bands)} note={t('atRiskOnly')} wide>
        <StackedBarLineChart data={bandData} xKey="snapshot_date" stacks={bands} fmt={weekly} />
      </ChartCard>
      {outcomeData.length > 0 ? (
        <ChartCard title={col('interventions')} legend={stackItems(outcomes)}>
          <StackedBarLineChart data={outcomeData} xKey="month" stacks={outcomes} fmt={monthly} />
        </ChartCard>
      ) : null}
      {reasons.length > 0 ? (
        <ChartCard title={col('top_reason')} note={t('atRiskOnly')} dom>
          <HBars rows={reasons} labelW={11} />
        </ChartCard>
      ) : null}
    </div>
  );
}
