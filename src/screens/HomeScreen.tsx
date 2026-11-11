// Home = preview cards: each board (at the "all plans" level) + the early-churn-warning project.
// A card shows ONLY the board's headline number; with no data yet it shows a "preparing" chip —
// no sample numbers at all.
import { apiConfigured, useSource } from '../data/api';
import { oldestDate } from '../data/freshness';
import { useColumnLabel, useLabel } from '../data/labels';
import { numericRows, rollupByMonth } from '../data/rollup';
import { BOARDS, pick, PROJECT_CHURN, type BoardDef } from '../nav/catalog';
import { navigate } from '../nav/route';
import { count, monthLabel, yen } from '../ui/format';
import { useLangStore, useT } from '../ui/i18n';
import { Chip, PageMeta } from '../ui/parts';

function Headline({ board }: { board: BoardDef }) {
  const lang = useLangStore((s) => s.lang);
  const col = useColumnLabel();
  const { data } = useSource(board.source);
  if (!data) return null;
  const last = rollupByMonth(numericRows(data.rows), 'all').at(-1);
  if (!last) return null;
  const [k, fmt] = board.key === 'revenue' ? (['mrr_end', yen] as const) : (['seat_users_end', count] as const);
  const v = last[k];
  return (
    <p className="card-num">
      <span>{col(k)} · {monthLabel(String(last.month), lang)}</span>
      <strong>{fmt(typeof v === 'number' ? v : null, lang)}</strong>
    </p>
  );
}

function ChurnHeadline() {
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const { data } = useSource('churn-watchlist');
  if (!data) return null;
  const n = (band: string) => data.rows.filter((r) => r.risk_band === band).length;
  return (
    <p className="card-num">
      <span>{label('risk_band', 'cancel_scheduled')} / {label('risk_band', 'high')}</span>
      <strong>{count(n('cancel_scheduled'), lang)} / {count(n('high'), lang)}</strong>
    </p>
  );
}

export function HomeScreen() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  // Home reads 3 sources (2 monthly cards + the project card) ⇒ the OLDEST date among those 3.
  const sources = [useSource('revenue-monthly'), useSource('users-monthly'), useSource('churn-watchlist')];
  const asOf = oldestDate(sources.map((x) => x.data?.updatedAt));
  return (
    <section className="page">
      <PageMeta asOf={asOf} />
      <h1>{t('home')}</h1>
      <p className="lead">{t('homeLead')}</p>
      <div className="cards">
        {BOARDS.map((b) => (
          <button key={b.key} type="button" className="card" onClick={() => navigate({ kind: 'board', plan: 'all', board: b.key })}>
            <span className="card-title">{pick(b.name, lang)}</span>
            {!apiConfigured ? <Chip>{t('preparing')}</Chip> : null}
            <span className="card-desc">{pick(b.desc, lang)}</span>
            {/* Only the 2 monthly boards have a light headline number; the by-user / by-company boards are large sources,
                not loaded just to draw a card. */}
            {b.key === 'revenue' || b.key === 'users' ? <Headline board={b} /> : null}
          </button>
        ))}
        <button type="button" className="card card-project" onClick={() => navigate({ kind: 'churn' })}>
          <span className="card-title">{pick(PROJECT_CHURN.name, lang)}</span>
          {!apiConfigured ? <Chip>{t('preparing')}</Chip> : null}
          <span className="card-desc">{pick(PROJECT_CHURN.desc, lang)}</span>
          <ChurnHeadline />
        </button>
      </div>
    </section>
  );
}
