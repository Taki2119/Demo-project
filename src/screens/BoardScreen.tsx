// One board of one plan. FRAME: page shell + month filter + data state + headline stat tiles + number table.
// Each board's charts plug into `<section className="viz">` (lazy-loaded, see CHARTS).
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { useSource, type Params, type Row } from '../data/api';
import { useColumnLabel, useLabel } from '../data/labels';
import { arpa, deltaRate, seatUsage, stickiness } from '../data/metrics';
import { covers, monthsOf, prevRange, rowAt, sliceRows, stockAt, sumFlow } from '../data/period';
import { numericRows, rollupByMonth } from '../data/rollup';
import { boardOf, pick, type BoardKey, type PlanKey } from '../nav/catalog';
import { useQuery } from '../nav/route';
import { count, pct, yen } from '../ui/format';
import { useLangStore, useT } from '../ui/i18n';
import { boardChunk } from '../ui/chunk';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { FilterBar, MonthPickFilter, MonthRangeFilter, useMonthFilter, usePeriodText, useRangeFilter } from '../ui/filters';
import { DataTable, PageMeta, StatTile, StateBox } from '../ui/parts';

const TABLE_COLUMNS: Record<BoardKey, readonly string[]> = {
  revenue: ['month', 'mrr_end', 'paying_companies', 'new_mrr', 'expansion_mrr', 'contraction_mrr', 'churned_mrr', 'invoiced_amount', 'paid_amount'],
  users: ['month', 'seat_users_end', 'new_users', 'deactivated_users', 'mau', 'active_user_days', 'active_minutes'],
  'by-user': ['full_name', 'company_name', 'plan_id', 'active_days', 'sessions', 'active_minutes', 'last_active_date'],
  'by-company': ['company_name', 'industry', 'plan_id', 'mrr', 'seats', 'seat_users_end', 'mau', 'key_feature_events', 'last_active_date'],
};

const num = (v: unknown) => (typeof v === 'number' ? v : null);

// Charts are lazy-loaded (Recharts must not get into the initial chunk). One chunk per board; Recharts splits into a shared chunk.
// asOf = the source's data date (updatedAt = mart.as_of()), NOT the viewer's machine clock.
type ChartsProps = { rows: readonly Row[]; asOf: string | null };
const CHARTS: Record<BoardKey, LazyExoticComponent<ComponentType<ChartsProps>>> = {
  revenue: lazy(boardChunk('revenue', () => import('./charts/RevenueCharts'))),
  users: lazy(boardChunk('users', () => import('./charts/UsersCharts'))),
  'by-user': lazy(boardChunk('by-user', () => import('./charts/ByUserCharts'))),
  'by-company': lazy(boardChunk('by-company', () => import('./charts/ByCompanyCharts'))),
};

function ChartsSlot({ board, rows, asOf }: { board: BoardKey } & ChartsProps) {
  const C = CHARTS[board];
  return (
    <section className="viz">
      {rows.length > 0 ? (
        <ErrorBoundary fallback={<StateBox phase="failed" />}>
          <Suspense fallback={<div className="ui-charts-wait" />}>
            <C rows={rows} asOf={asOf} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </section>
  );
}

function Head({ plan, board, asOf }: { plan: PlanKey; board: BoardKey; asOf: string | null }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const def = boardOf(board);
  return (
    <>
      <PageMeta asOf={asOf} />
      <p className="crumb">{plan === 'all' ? t('allPlans') : label('plan', plan)}</p>
      <h1>{pick(def.name, lang)}</h1>
      <p className="lead">{pick(def.desc, lang)}</p>
    </>
  );
}

export function BoardScreen({ plan, board }: { plan: PlanKey; board: BoardKey }) {
  return board === 'revenue' || board === 'users' ? <MonthlyBoard plan={plan} board={board} /> : <SnapshotBoard plan={plan} board={board} />;
}

/** Revenue · Users: the API returns EVERY month ⇒ filter the month RANGE in the browser.
 *  Stat tiles: stock = LAST month of the range · flow = SUM over the range · compared with the previous range of equal length
 *  (that range not fully inside the data ⇒ "—"). Ratios (ARPA, DAU/MAU, seat usage) = last month. */
function MonthlyBoard({ plan, board }: { plan: PlanKey; board: BoardKey }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const col = useColumnLabel();
  const { phase, data } = useSource(boardOf(board).source);
  const asOf = data?.updatedAt ?? null;
  const all = data ? rollupByMonth(numericRows(data.rows), plan) : [];
  const months = data ? monthsOf(all) : null;
  const f = useRangeFilter(months);
  const text = usePeriodText(asOf);
  const r = f.range;
  const shown = r ? sliceRows(all, r) : [];
  const prev = r && months && covers(months, prevRange(r)) ? prevRange(r) : null;
  const end = r ? rowAt(all, r.to) : null;
  const v = (key: string) => (end ? num(end[key]) : null);

  // Secondary figure: "[period · ]±x% vs …". No previous period ⇒ "—".
  const stockSub = (key: string, withMonth: boolean) => {
    if (!r) return undefined;
    const d = pct(deltaRate(stockAt(all, r.to, key), prev ? stockAt(all, prev.to, key) : null), lang);
    return `${withMonth ? `${text.month(r.to)} · ` : ''}${d} ${text.vs(r)}`;
  };
  const flowSub = (key: string) => {
    if (!r) return undefined;
    const d = pct(deltaRate(sumFlow(all, r, key), prev ? sumFlow(all, prev, key) : null), lang);
    return `${text.range(r)} · ${d} ${text.vs(r)}`;
  };

  return (
    <section className="page">
      <Head plan={plan} board={board} asOf={asOf} />
      {r && months ? (
        <FilterBar dirty={f.dirty} onReset={f.reset}>
          <MonthRangeFilter value={r} onChange={f.set} months={months} label={t('period')} text={text.range(r)} />
        </FilterBar>
      ) : null}
      <StateBox phase={phase} empty={phase === 'ready' && shown.length === 0} />

      {r && end && board === 'revenue' ? (
        <div className="tiles">
          <StatTile info="mrr_end" label={col('mrr_end')} value={yen(v('mrr_end'), lang)} sub={stockSub('mrr_end', true)} />
          <StatTile info="paying_companies" label={col('paying_companies')} value={count(v('paying_companies'), lang)} sub={stockSub('paying_companies', false)} />
          <StatTile info="arpa" label={label('metric', 'arpa')} value={yen(arpa(v('mrr_end') ?? 0, v('paying_companies') ?? 0), lang)} />
          <StatTile info="new_mrr" label={col('new_mrr')} value={yen(sumFlow(all, r, 'new_mrr'), lang)} sub={flowSub('new_mrr')} />
          <StatTile info="invoiced_amount" label={col('invoiced_amount')} value={yen(sumFlow(all, r, 'invoiced_amount'), lang)} sub={flowSub('invoiced_amount')} />
        </div>
      ) : null}
      {r && end && board === 'users' ? (
        <div className="tiles">
          <StatTile info="seat_users_end" label={col('seat_users_end')} value={count(v('seat_users_end'), lang)} sub={stockSub('seat_users_end', true)} />
          <StatTile info="mau" label={col('mau')} value={count(v('mau'), lang)} sub={stockSub('mau', false)} />
          <StatTile info="stickiness" label={label('metric', 'stickiness')} value={pct(stickiness(v('active_user_days') ?? 0, v('days_in_period') ?? 0, v('mau') ?? 0), lang)} />
          <StatTile info="seat_usage_rate" label={label('metric', 'seat_usage_rate')} value={pct(seatUsage(v('mau') ?? 0, v('seat_users_end') ?? 0), lang)} />
          <StatTile info="new_users" label={col('new_users')} value={count(sumFlow(all, r, 'new_users'), lang)} sub={flowSub('new_users')} />
        </div>
      ) : null}

      <ChartsSlot board={board} rows={shown} asOf={asOf} />
      {shown.length > 0 ? <DataTable rows={[...shown].reverse()} columns={TABLE_COLUMNS[board]} /> : null}
    </section>
  );
}

/** By user · By company: ONE month at a time, passing the API's EXISTING `month` parameter.
 *  The month list comes from the data (the revenue-monthly source — every month in the mart), not from the clock.
 *  Link with `?month=` ⇒ wait for the month list before loading (avoids loading the latest month by mistake first). */
function SnapshotBoard({ plan, board }: { plan: PlanKey; board: BoardKey }) {
  const t = useT();
  const list = useSource('revenue-monthly');
  const months = list.data ? monthsOf(list.data.rows) : null;
  const f = useMonthFilter(months);
  const q = useQuery();
  const params: Params = {};
  if (plan !== 'all') params.plan = plan;
  if (f.dirty && f.month) params.month = f.month;
  // Only wait when the URL has `month` and the month list hasn't arrived (error / not configured ⇒ stop waiting).
  const ready = q.month == null || months != null || list.phase === 'failed' || list.phase === 'off';
  const { phase, data } = useSource(boardOf(board).source, params, ready);
  const asOf = data?.updatedAt ?? null;
  const text = usePeriodText(asOf);
  const shown = data ? numericRows(data.rows) : [];

  return (
    <section className="page">
      <Head plan={plan} board={board} asOf={asOf} />
      {f.month && months ? (
        <FilterBar dirty={f.dirty} onReset={f.reset}>
          <MonthPickFilter value={f.month} onChange={f.set} months={months} label={t('month')} text={text.month(f.month)} />
        </FilterBar>
      ) : null}
      <StateBox phase={phase} empty={phase === 'ready' && shown.length === 0} />
      <ChartsSlot board={board} rows={shown} asOf={asOf} />
      {shown.length > 0 ? <DataTable rows={shown} columns={TABLE_COLUMNS[board]} /> : null}
    </section>
  );
}
