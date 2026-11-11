// Pagination bar (kit 03 §8): <nav aria-label>, aria-current="page", page size picked with a button group.
// Table ≤ the smallest page size (20 rows) ⇒ NOT shown.
import { count } from './format';
import { useLangStore, useT } from './i18n';
import { pageCount, pageItems, pageSlice, PAGE_SIZES, type PageSize } from './tablePage';

export function TablePager({
  total,
  page,
  size,
  onPage,
  onSize,
}: {
  total: number;
  page: number;
  size: PageSize;
  onPage: (page: number) => void;
  onSize: (size: PageSize) => void;
}) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  if (total <= PAGE_SIZES[0]) return null;
  const pages = pageCount(total, size);
  const { from, to } = pageSlice(page, total, size);
  return (
    <nav className="pager" aria-label={t('pager')}>
      <div className="pager-pages">
        <button type="button" className="btn" aria-label={t('prevPage')} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹
        </button>
        {pageItems(page, pages).map((it, i) =>
          it === 'gap' ? (
            <span key={`gap-${i}`} className="pager-gap" aria-hidden="true">…</span>
          ) : (
            <button
              key={it}
              type="button"
              className="btn"
              aria-current={it === page ? 'page' : undefined}
              onClick={() => onPage(it)}
            >
              {count(it, lang)}
            </button>
          ),
        )}
        <button type="button" className="btn" aria-label={t('nextPage')} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          ›
        </button>
      </div>
      <span className="pager-range">
        {count(from + 1, lang)}–{count(to, lang)} / {count(total, lang)}
      </span>
      <div className="seg" role="group" aria-label={t('pageSize')}>
        {PAGE_SIZES.map((s) => (
          <button key={s} type="button" aria-pressed={s === size} onClick={() => onSize(s)}>
            {s}
          </button>
        ))}
      </div>
    </nav>
  );
}
