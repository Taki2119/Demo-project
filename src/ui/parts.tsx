// Các mảnh giao diện dùng chung. Hợp đồng (props + tên class) giữ từ khung; kiểu dáng theo
// docs/ui-kit/ (CSS ở src/styles/*).
import { useState, type ReactNode } from 'react';
import type { Phase, Row } from '../data/api';
import { useColumnLabel, useColumnUnit, useLabel } from '../data/labels';
import type { GlossaryKey } from '../data/glossary';
import { count, dayLabel, monthLabel, NO_VALUE, pct, yen } from './format';
import { LANGS, useLangStore, useT } from './i18n';
import { InfoTip } from './InfoTip';
import { SortHead } from './SortHead';
import { TablePager } from './TablePager';
import { clampPage, pageKeepingRow, pageSlice, PAGE_SIZES, type PageSize } from './tablePage';
import { sortRows, toggleSort, type SortState, type SortValue } from './tableSort';

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

/** Đầu mỗi trang: nhãn "Dữ liệu mẫu" (luôn có, nằm trong luồng — không position: fixed) + chip
 *  "có số tới ngày …". `asOf` lấy từ updatedAt của nguồn (freshness.ts), KHÔNG từ đồng hồ máy;
 *  null ⇒ không hiện chip ngày. Trang không có dữ liệu (Giới thiệu) bỏ `asOf`. */
export function PageMeta({ asOf }: { asOf?: string | null }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  return (
    <div className="page-meta">
      <span className="chip chip-sample">{t('sampleData')}</span>
      {asOf ? <span className="chip chip-asof">{t('dataUntil').replace('{d}', dayLabel(asOf, lang))}</span> : null}
    </div>
  );
}

// Cột chứa MÃ của một domain nhãn ⇒ ô hiện nhãn ja/vi thay cho mã.
const CODE_DOMAIN: Record<string, string> = {
  plan_id: 'plan', plan_prev: 'plan', industry: 'industry', region: 'region', size_band: 'size_band',
  movement: 'movement', plan_change: 'plan_change', risk_band: 'risk_band', top_reason: 'top_reason',
  last_intervention_channel: 'intervention_channel', last_intervention_outcome: 'intervention_outcome',
  trigger: 'intervention_trigger', channel: 'intervention_channel',
};

/** Bảng số chung: tiêu đề cột + giá trị mã hoá lấy nhãn từ DB, số định dạng theo đơn vị của cột.
 *  Sort + chia trang theo kit 03 §8. State nằm TRONG bảng (giữ props cũ); chưa bấm sort thì giữ
 *  thứ tự nơi gọi truyền vào. */
export function DataTable({ rows, columns }: { rows: readonly Row[]; columns: readonly string[] }) {
  const lang = useLangStore((s) => s.lang);
  const col = useColumnLabel();
  const unit = useColumnUnit();
  const label = useLabel();
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(PAGE_SIZES[0]);

  const isNumeric = (k: string) => typeof rows.find((r) => r[k] != null)?.[k] === 'number';
  // Giá trị để sort = cái người xem THẤY: cột mã ⇒ nhãn; cờ ⇒ 1/0.
  const sortValue = (r: Row, k: string): SortValue => {
    const v = r[k] ?? null;
    if (v == null) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const domain = CODE_DOMAIN[k];
    if (domain && typeof v === 'string') return label(domain, v);
    return v;
  };
  const sorted = sort ? sortRows(rows, (r) => sortValue(r, sort.key), sort.dir) : rows;
  const cur = clampPage(page, sorted.length, size);
  const { from, to } = pageSlice(cur, sorted.length, size);
  const shown = sorted.slice(from, to);

  const onSort = (k: string) => {
    setSort((s) => toggleSort(s, k, isNumeric(k) ? 'desc' : 'asc'));
    setPage(1);
  };
  const onSize = (s: PageSize) => {
    setSize(s);
    setPage(pageKeepingRow(from, s));
  };

  const cell = (k: string, v: Row[string]) => {
    if (v == null) return NO_VALUE;
    if (typeof v === 'boolean') return v ? '✓' : '–';
    // Cột tháng: nhãn tháng thay cho ngày đầu tháng ISO. Sort vẫn theo chuỗi ISO gốc.
    if (k === 'month' && typeof v === 'string') return monthLabel(v, lang);
    const domain = CODE_DOMAIN[k];
    if (domain && typeof v === 'string') return label(domain, v);
    if (typeof v === 'number') {
      const u = unit(k);
      return u === 'JPY' ? yen(v, lang) : u === '%' ? pct(v, lang) : count(v, lang);
    }
    return v;
  };
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <SortHead key={c} label={col(c)} sortKey={c} sort={sort} numeric={isNumeric(c)} onSort={onSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={from + i}>
                {columns.map((c) => (
                  <td key={c} className={typeof r[c] === 'number' ? 'num' : undefined}>{cell(c, r[c] ?? null)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager total={sorted.length} page={cur} size={size} onPage={setPage} onSize={onSize} />
    </>
  );
}

/** `info` = khoá glossary ⇒ nút ⓘ cạnh nhãn (glossary.test.ts bắt mọi StatTile phải có). */
export function StatTile({ label, value, sub, info }: { label: string; value: string; sub?: string; info?: GlossaryKey }) {
  return (
    <div className="tile">
      <div className="tile-label">
        {label}
        {info ? <InfoTip keys={info} /> : null}
      </div>
      <div className="tile-value">{value}</div>
      {sub ? <div className="tile-sub">{sub}</div> : null}
    </div>
  );
}
