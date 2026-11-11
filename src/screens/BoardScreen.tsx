// Một bảng của một gói. KHUNG: vỏ trang + trạng thái dữ liệu + ô số chính + bảng số.
// Biểu đồ của từng bảng cắm vào `<section className="viz">` (nạp động, xem CHARTS).
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { useSource, type Params, type Row } from '../data/api';
import { useColumnLabel, useLabel } from '../data/labels';
import { arpa, deltaRate, seatUsage, stickiness } from '../data/metrics';
import { numericRows, rollupByMonth } from '../data/rollup';
import { boardOf, pick, type BoardKey, type PlanKey } from '../nav/catalog';
import { count, monthLabel, pct, yen } from '../ui/format';
import { useLangStore, useT } from '../ui/i18n';
import { boardChunk } from '../ui/chunk';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { DataTable, StatTile, StateBox } from '../ui/parts';

const TABLE_COLUMNS: Record<BoardKey, readonly string[]> = {
  revenue: ['month', 'mrr_end', 'paying_companies', 'new_mrr', 'expansion_mrr', 'contraction_mrr', 'churned_mrr', 'invoiced_amount', 'paid_amount'],
  users: ['month', 'seat_users_end', 'new_users', 'deactivated_users', 'mau', 'active_user_days', 'active_minutes'],
  'by-user': ['full_name', 'company_name', 'plan_id', 'active_days', 'sessions', 'active_minutes', 'last_active_date'],
  'by-company': ['company_name', 'industry', 'plan_id', 'mrr', 'seats', 'seat_users_end', 'mau', 'key_feature_events', 'last_active_date'],
};

const num = (v: unknown) => (typeof v === 'number' ? v : null);

// Biểu đồ nạp ĐỘNG (Recharts không được vào chunk đầu). Mỗi bảng một chunk; Recharts tách chunk chung.
// asOf = ngày dữ liệu của nguồn (updatedAt = mart.as_of()), KHÔNG phải đồng hồ máy người xem.
type ChartsProps = { rows: readonly Row[]; asOf: string | null };
const CHARTS: Record<BoardKey, LazyExoticComponent<ComponentType<ChartsProps>>> = {
  revenue: lazy(boardChunk('revenue', () => import('./charts/RevenueCharts'))),
  users: lazy(boardChunk('users', () => import('./charts/UsersCharts'))),
  'by-user': lazy(boardChunk('by-user', () => import('./charts/ByUserCharts'))),
  'by-company': lazy(boardChunk('by-company', () => import('./charts/ByCompanyCharts'))),
};

function Charts({ board, rows, asOf }: { board: BoardKey } & ChartsProps) {
  const C = CHARTS[board];
  return <C rows={rows} asOf={asOf} />;
}

export function BoardScreen({ plan, board }: { plan: PlanKey; board: BoardKey }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const col = useColumnLabel();
  const def = boardOf(board);
  const monthly = board === 'revenue' || board === 'users';
  // Bảng theo user / công ty: lọc gói ở phía API (nhiều dòng); bảng tháng: lấy đủ rồi gộp ở client.
  const params: Params = !monthly && plan !== 'all' ? { plan } : {};
  const { phase, data } = useSource(def.source, params);
  const rows = data ? numericRows(data.rows) : [];
  const shown = monthly ? rollupByMonth(rows, plan) : rows;
  const last = monthly ? shown.at(-1) : undefined;
  const prev = monthly ? shown.at(-2) : undefined;

  return (
    <section className="page">
      <p className="crumb">{plan === 'all' ? t('allPlans') : label('plan', plan)}</p>
      <h1>{pick(def.name, lang)}</h1>
      <p className="lead">{pick(def.desc, lang)}</p>
      <StateBox phase={phase} empty={phase === 'ready' && shown.length === 0} />

      {last && board === 'revenue' ? (
        <div className="tiles">
          <StatTile label={col('mrr_end')} value={yen(num(last.mrr_end), lang)} sub={`${monthLabel(String(last.month), lang)} · ${pct(deltaRate(num(last.mrr_end), num(prev?.mrr_end)), lang)}`} />
          <StatTile label={col('paying_companies')} value={count(num(last.paying_companies), lang)} />
          <StatTile label={label('metric', 'arpa')} value={yen(arpa(num(last.mrr_end) ?? 0, num(last.paying_companies) ?? 0), lang)} />
        </div>
      ) : null}
      {last && board === 'users' ? (
        <div className="tiles">
          <StatTile label={col('seat_users_end')} value={count(num(last.seat_users_end), lang)} sub={monthLabel(String(last.month), lang)} />
          <StatTile label={col('mau')} value={count(num(last.mau), lang)} />
          <StatTile label={label('metric', 'stickiness')} value={pct(stickiness(num(last.active_user_days) ?? 0, num(last.days_in_period) ?? 0, num(last.mau) ?? 0), lang)} />
          <StatTile label={label('metric', 'seat_usage_rate')} value={pct(seatUsage(num(last.mau) ?? 0, num(last.seat_users_end) ?? 0), lang)} />
        </div>
      ) : null}

      <section className="viz">
        {shown.length > 0 ? (
          <ErrorBoundary fallback={<StateBox phase="failed" />}>
            <Suspense fallback={<div className="ui-charts-wait" />}>
              <Charts board={board} rows={shown} asOf={data?.updatedAt ?? null} />
            </Suspense>
          </ErrorBoundary>
        ) : null}
      </section>
      {shown.length > 0 ? <DataTable rows={monthly ? [...shown].reverse() : shown} columns={TABLE_COLUMNS[board]} /> : null}
    </section>
  );
}
