// Biểu đồ trang Doanh thu (nạp động — kéo Recharts theo). Nhận dòng THÁNG đã gộp theo gói.
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

  // Thang tiền chọn theo ĐÍCH của từng thẻ ⇒ mọi nhãn trục cùng đơn vị (in ở đầu thẻ).
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

  // Cột phân cực: VÀO (mới, mở rộng) trên mốc 0 · RA (thu hẹp, huỷ — mart đã chở số âm) dưới.
  // Kênh mã hoá thứ hai cho tốt/xấu = VỊ TRÍ (trên/dưới 0), không chỉ màu.
  const moves: BarSpec[] = [
    { key: 'new_mrr', label: col('new_mrr'), color: 'var(--ok-fill)' },
    { key: 'expansion_mrr', label: col('expansion_mrr'), color: 'var(--ok-fill-2)' },
    { key: 'contraction_mrr', label: col('contraction_mrr'), color: 'var(--crit-fill-2)', sign: -1 },
    { key: 'churned_mrr', label: col('churned_mrr'), color: 'var(--crit-fill)', sign: -1 },
  ];
  // Biên độ của cột phân cực = tổng chồng mỗi phía (chỉ để chọn đơn vị trục; ô thiếu bị BỎ QUA).
  const movesFmt = money(stackTotals(data, moves), ['up', 'down']);

  const billed: BarSpec[] = [{ key: 'invoiced_amount', label: col('invoiced_amount'), color: 'var(--series-2)' }];
  const paid: LineSpec = { key: 'paid_amount', label: col('paid_amount'), color: 'var(--series-3)' };
  const billFmt = money(data, ['invoiced_amount', 'paid_amount']);

  return (
    <div className="ui-charts">
      <ChartCard title={col('mrr_end')} unit={mrrFmt.unit} wide>
        <SoloLine data={data} xKey="month" yKey="mrr_end" label={col('mrr_end')} goodWhen="up" fmt={mrrFmt} />
      </ChartCard>
      <ChartCard title={col('mrr_delta')} unit={movesFmt.unit} legend={stackItems(moves)}>
        <StackedBarLineChart data={data} xKey="month" stacks={moves} fmt={movesFmt} />
      </ChartCard>
      <ChartCard title={`${col('invoiced_amount')} · ${col('paid_amount')}`} unit={billFmt.unit} legend={stackItems(billed, paid)}>
        <StackedBarLineChart data={data} xKey="month" stacks={billed} line={paid} fmt={billFmt} maxBarSize={22} />
      </ChartCard>
    </div>
  );
}
