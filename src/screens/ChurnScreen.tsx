// "Early churn warning" project: watch list (latest snapshot) + score precision
// (did the risk band actually churn within 90 days) + charts (lazy-loaded).
import { lazy, Suspense } from 'react';
import { useSource } from '../data/api';
import { oldestDate } from '../data/freshness';
import { BAND_ORDER, precisionByBand, watchOrder } from '../data/churn';
import { useLabel } from '../data/labels';
import { monthsOf, sliceRows } from '../data/period';
import { numericRows } from '../data/rollup';
import { pick, PROJECT_CHURN } from '../nav/catalog';
import { count, pct } from '../ui/format';
import { useLangStore, useT } from '../ui/i18n';
import { boardChunk } from '../ui/chunk';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { FilterBar, MonthRangeFilter, usePeriodText, useRangeFilter } from '../ui/filters';
import { DataTable, PageMeta, StatTile, StateBox } from '../ui/parts';

// Charts are lazy-loaded (Recharts must not get into the initial chunk).
const ChurnCharts = lazy(boardChunk('churn', () => import('./charts/ChurnCharts')));

const WATCH_COLUMNS = ['company_name', 'plan_id', 'risk_band', 'risk_score', 'top_reason', 'mrr', 'activity_trend', 'seat_utilization', 'owner_name', 'last_intervention_outcome'];

export function ChurnScreen() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const watch = useSource('churn-watchlist');
  const history = useSource('churn-history');
  const interventions = useSource('interventions-monthly');
  // The page reads 3 sources ⇒ the OLDEST date; a source not yet arrived ⇒ chip not shown yet.
  const asOf = oldestDate([watch.data?.updatedAt, history.data?.updatedAt, interventions.data?.updatedAt]);
  const rows = watch.data ? numericRows(watch.data.rows) : [];
  const sorted = watchOrder(rows);
  const precision = history.data ? precisionByBand(history.data.rows) : null;
  // The month range applies ONLY to the 2 history charts (weekly snapshot ⇒ filtered by the month containing it; outreach
  // results by month). The watch list + precision by band do NOT change with the filter.
  const months = history.data ? monthsOf(history.data.rows, 'snapshot_date') : null;
  const f = useRangeFilter(months);
  const text = usePeriodText(asOf);
  const historyShown = history.data && f.range ? sliceRows(history.data.rows, f.range, 'snapshot_date') : [];

  return (
    <section className="page">
      <PageMeta asOf={asOf} />
      <h1>{pick(PROJECT_CHURN.name, lang)}</h1>
      <p className="lead">{pick(PROJECT_CHURN.desc, lang)}</p>
      {f.range && months ? (
        <FilterBar dirty={f.dirty} onReset={f.reset}>
          <MonthRangeFilter value={f.range} onChange={f.set} months={months} label={t('period')} text={text.range(f.range)} />
        </FilterBar>
      ) : null}
      <StateBox phase={watch.phase} empty={watch.phase === 'ready' && rows.length === 0} />

      {rows.length > 0 ? (
        <div className="tiles">
          {BAND_ORDER.map((b) => (
            <StatTile key={b} info="risk_band" label={label('risk_band', b)} value={count(rows.filter((r) => r.risk_band === b).length, lang)} />
          ))}
        </div>
      ) : null}

      {precision ? (
        <div className="tiles">
          {precision.map((p) => (
            <StatTile key={p.band} info="churned_within_90d" label={`${label('risk_band', p.band)} → ${label('intervention_outcome', 'churned')}`} value={pct(p.churnRate, lang)} sub={`n=${count(p.n, lang)}`} />
          ))}
        </div>
      ) : null}

      <section className="viz">
        {rows.length > 0 ? (
          <ErrorBoundary fallback={<StateBox phase="failed" />}>
            <Suspense fallback={<div className="ui-charts-wait" />}>
              <ChurnCharts watch={rows} history={historyShown} range={f.range} />
            </Suspense>
          </ErrorBoundary>
        ) : null}
      </section>
      {sorted.length > 0 ? <DataTable rows={sorted} columns={WATCH_COLUMNS} /> : null}
    </section>
  );
}
