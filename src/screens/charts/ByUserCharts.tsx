// Biểu đồ trang Theo người dùng (nạp động): phân bố số ngày dùng của người đang giữ ghế, ở tháng
// mà API trả về (tháng mới nhất — có thể là tháng đang chạy, chú thích ghi rõ tháng).
import type { Row } from '../../data/api';
import { histogram, num } from '../../data/chartData';
import { useColumnLabel } from '../../data/labels';
import { count, monthLabel } from '../../ui/format';
import { useLangStore, useT } from '../../ui/i18n';
import { ChartCard } from '../../ui/viz/ChartCard';
import type { ChartFormat, Point } from '../../ui/viz/charts/common';
import { StackedBarLineChart, type BarSpec } from '../../ui/viz/charts/StackedBarLineChart';

// Cận dưới của từng nhóm số ngày (tự chọn). Nhãn là khoảng số — không cần dịch.
const EDGES = [0, 1, 5, 10, 20];
const bucketLabel = (i: number) => {
  const lo = EDGES[i] as number;
  const next = EDGES[i + 1];
  return next == null ? `${lo}+` : next - lo === 1 ? `${lo}` : `${lo}–${next - 1}`;
};

export default function ByUserCharts({ rows }: { rows: readonly Row[] }) {
  const lang = useLangStore((s) => s.lang);
  const t = useT();
  const col = useColumnLabel();
  const seats = rows.filter((r) => r.is_seat === true);
  const counts = histogram(seats.map((r) => num(r.active_days)), EDGES);
  const data: Point[] = counts.map((n, i) => ({ bucket: bucketLabel(i), users: n }));
  const first = rows[0]?.month;
  const month = typeof first === 'string' ? monthLabel(first, lang) : undefined;
  const fmt: ChartFormat = {
    value: (v) => count(v, lang),
    tick: (v) => count(v, lang),
    xTick: (b) => b,
    xTitle: (b) => `${col('active_days')}: ${b}`,
  };
  const bars: BarSpec[] = [{ key: 'users', label: t('userCount'), color: 'var(--series-1)' }];
  return (
    <div className="ui-charts">
      <ChartCard title={col('active_days')} note={month ? `${month} · ${col('is_seat')}` : undefined}>
        <StackedBarLineChart data={data} xKey="bucket" stacks={bars} fmt={fmt} />
      </ChartCard>
    </div>
  );
}
