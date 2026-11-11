// Dự án "cảnh báo huỷ sớm": danh sách cần chăm sóc (ảnh chụp mới nhất) + độ chính xác của điểm
// (band rủi ro có huỷ thật trong 90 ngày không) + biểu đồ (nạp động).
import { lazy, Suspense } from 'react';
import { useSource } from '../data/api';
import { oldestDate } from '../data/freshness';
import { BAND_ORDER, precisionByBand, watchOrder } from '../data/churn';
import { useLabel } from '../data/labels';
import { numericRows } from '../data/rollup';
import { pick, PROJECT_CHURN } from '../nav/catalog';
import { count, pct } from '../ui/format';
import { useLangStore } from '../ui/i18n';
import { boardChunk } from '../ui/chunk';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { DataTable, PageMeta, StatTile, StateBox } from '../ui/parts';

// Biểu đồ nạp ĐỘNG (Recharts không được vào chunk đầu).
const ChurnCharts = lazy(boardChunk('churn', () => import('./charts/ChurnCharts')));

const WATCH_COLUMNS = ['company_name', 'plan_id', 'risk_band', 'risk_score', 'top_reason', 'mrr', 'activity_trend', 'seat_utilization', 'owner_name', 'last_intervention_outcome'];

export function ChurnScreen() {
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const watch = useSource('churn-watchlist');
  const history = useSource('churn-history');
  const interventions = useSource('interventions-monthly');
  // Trang đọc 3 nguồn ⇒ ngày CŨ NHẤT; nguồn nào chưa về ⇒ chưa hiện chip.
  const asOf = oldestDate([watch.data?.updatedAt, history.data?.updatedAt, interventions.data?.updatedAt]);
  const rows = watch.data ? numericRows(watch.data.rows) : [];
  const sorted = watchOrder(rows);
  const precision = history.data ? precisionByBand(history.data.rows) : null;

  return (
    <section className="page">
      <PageMeta asOf={asOf} />
      <h1>{pick(PROJECT_CHURN.name, lang)}</h1>
      <p className="lead">{pick(PROJECT_CHURN.desc, lang)}</p>
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
              <ChurnCharts watch={rows} history={history.data?.rows ?? []} />
            </Suspense>
          </ErrorBoundary>
        ) : null}
      </section>
      {sorted.length > 0 ? <DataTable rows={sorted} columns={WATCH_COLUMNS} /> : null}
    </section>
  );
}
