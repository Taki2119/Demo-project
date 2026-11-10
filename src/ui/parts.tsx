// Các mảnh giao diện dùng chung của KHUNG. ⚠ Đây là lớp giao diện TẠM — thiết kế thật sẽ thay
// toàn bộ file này + index.css, còn hợp đồng (props) giữ nguyên.
import type { ReactNode } from 'react';
import type { Phase, Row } from '../data/api';
import { useColumnLabel, useColumnUnit, useLabel } from '../data/labels';
import { count, NO_VALUE, pct, yen } from './format';
import { LANGS, useLangStore, useT } from './i18n';

export function LangToggle() {
  const { lang, setLang } = useLangStore();
  const t = useT();
  return (
    <div className="lang" role="group" aria-label={t('langLabel')}>
      {LANGS.map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l === 'ja' ? t('langJa') : t('langVi')}
        </button>
      ))}
    </div>
  );
}

/** Trạng thái thay cho dữ liệu: chưa cấu hình API · đang tải · lỗi · rỗng. */
export function StateBox({ phase, empty }: { phase: Phase; empty?: boolean }) {
  const t = useT();
  const msg =
    phase === 'off' ? t('noApi') : phase === 'loading' ? t('loading') : phase === 'failed' ? t('loadFailed') : empty ? t('noData') : null;
  if (!msg) return null;
  return <div className={`state state-${phase}`}>{msg}</div>;
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

// Cột chứa MÃ của một domain nhãn ⇒ ô hiện nhãn ja/vi thay cho mã.
const CODE_DOMAIN: Record<string, string> = {
  plan_id: 'plan', plan_prev: 'plan', industry: 'industry', region: 'region', size_band: 'size_band',
  movement: 'movement', plan_change: 'plan_change', risk_band: 'risk_band', top_reason: 'top_reason',
  last_intervention_channel: 'intervention_channel', last_intervention_outcome: 'intervention_outcome',
  trigger: 'intervention_trigger', channel: 'intervention_channel',
};

/** Bảng số chung: tiêu đề cột + giá trị mã hoá lấy nhãn từ DB, số định dạng theo đơn vị của cột. */
export function DataTable({ rows, columns }: { rows: readonly Row[]; columns: readonly string[] }) {
  const lang = useLangStore((s) => s.lang);
  const col = useColumnLabel();
  const unit = useColumnUnit();
  const label = useLabel();
  const cell = (k: string, v: Row[string]) => {
    if (v == null) return NO_VALUE;
    if (typeof v === 'boolean') return v ? '✓' : '–';
    const domain = CODE_DOMAIN[k];
    if (domain && typeof v === 'string') return label(domain, v);
    if (typeof v === 'number') {
      const u = unit(k);
      return u === 'JPY' ? yen(v, lang) : u === '%' ? pct(v, lang) : count(v, lang);
    }
    return v;
  };
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">{col(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c} className={typeof r[c] === 'number' ? 'num' : undefined}>{cell(c, r[c] ?? null)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub ? <div className="tile-sub">{sub}</div> : null}
    </div>
  );
}
