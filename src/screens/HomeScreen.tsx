// Home = các thẻ xem trước: mỗi bảng (ở mức "tất cả gói") + dự án cảnh báo huỷ sớm.
// Thẻ chỉ bày ĐÚNG con số chính của bảng; chưa có dữ liệu thì bày chip "đang chuẩn bị" —
// không có số mẫu nào.
import { apiConfigured, useSource } from '../data/api';
import { useColumnLabel, useLabel } from '../data/labels';
import { numericRows, rollupByMonth } from '../data/rollup';
import { BOARDS, pick, PROJECT_CHURN, type BoardDef } from '../nav/catalog';
import { navigate } from '../nav/route';
import { count, monthLabel, yen } from '../ui/format';
import { useLangStore, useT } from '../ui/i18n';
import { Chip } from '../ui/parts';

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
  return (
    <section className="page">
      <h1>{t('home')}</h1>
      <p className="lead">{t('homeLead')}</p>
      <div className="cards">
        {BOARDS.map((b) => (
          <button key={b.key} type="button" className="card" onClick={() => navigate({ kind: 'board', plan: 'all', board: b.key })}>
            <span className="card-title">{pick(b.name, lang)}</span>
            {!apiConfigured ? <Chip>{t('preparing')}</Chip> : null}
            <span className="card-desc">{pick(b.desc, lang)}</span>
            {/* Chỉ 2 bảng theo tháng có con số chính nhẹ; bảng theo user / công ty là nguồn lớn,
                không tải chỉ để vẽ một thẻ. */}
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
