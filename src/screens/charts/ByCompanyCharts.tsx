// Biểu đồ trang Theo công ty (nạp động): ghế dùng vs MAU theo gói (scatter, ≤3 nhóm) + top 10 MRR.
import type { Row } from '../../data/api';
import { num } from '../../data/chartData';
import { useColumnLabel, useLabel } from '../../data/labels';
import { PLAN_KEYS } from '../../nav/catalog';
import { count, yen } from '../../ui/format';
import { useLangStore, useT } from '../../ui/i18n';
import { ChartCard } from '../../ui/viz/ChartCard';
import { HBars, type HBarRow } from '../../ui/viz/charts/HBars';
import { ScatterPlot, type ScatterDatum } from '../../ui/viz/charts/ScatterPlot';
import type { LegendItem } from '../../ui/viz/Legend';
import { seriesColors } from '../../ui/viz/series';

export default function ByCompanyCharts({ rows }: { rows: readonly Row[] }) {
  const lang = useLangStore((s) => s.lang);
  const t = useT();
  const col = useColumnLabel();
  const label = useLabel();

  // Nhóm = gói có mặt trong dữ liệu (lọc gói ⇒ 1 nhóm). Thứ tự theo catalog.
  const plans = PLAN_KEYS.filter((p) => p !== 'all' && rows.some((r) => r.plan_id === p));
  const colors = seriesColors(plans.length);
  const groups: LegendItem[] = plans.map((p, i) => ({ key: p, label: label('plan', p), color: colors[i] as string, kind: 'dot' }));
  const points: ScatterDatum[] = rows.flatMap((r) => {
    const x = num(r.seat_users_end);
    const y = num(r.mau);
    return x == null || y == null || typeof r.plan_id !== 'string'
      ? []
      : [{ id: String(r.company_id), name: String(r.company_name ?? r.company_id), x, y, series: r.plan_id }];
  });

  const top: HBarRow[] = [...rows]
    .filter((r) => num(r.mrr) != null)
    .sort((a, b) => (num(b.mrr) as number) - (num(a.mrr) as number))
    .slice(0, 10)
    .map((r) => ({ key: String(r.company_id), label: String(r.company_name ?? r.company_id), value: num(r.mrr), text: yen(num(r.mrr), lang) }));

  return (
    <div className="ui-charts">
      <ChartCard
        title={`${col('seat_users_end')} × ${col('mau')}`}
        legend={groups}
        note={`${t('axisX')}: ${col('seat_users_end')} · ${t('axisY')}: ${col('mau')}`}
      >
        <ScatterPlot
          data={points}
          groups={groups}
          xLabel={col('seat_users_end')}
          yLabel={col('mau')}
          formatX={(v) => count(v, lang)}
          formatY={(v) => count(v, lang)}
        />
      </ChartCard>
      <ChartCard title={`${col('mrr')} · ${t('top10')}`} dom>
        <HBars rows={top} labelW={11} />
      </ChartCard>
    </div>
  );
}
