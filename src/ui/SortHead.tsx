// Sortable column header (kit 03 §8): <th aria-sort> wrapping a <button>. Numeric columns: icon to the LEFT of the text.
import type { SortState } from './tableSort';

function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  // Not sorted: 2 faded arrows. Sorted: 1 arrow in the sort direction.
  const up = 'M5 1 L9 5 H1 Z';
  const down = 'M5 9 L1 5 H9 Z';
  return (
    <svg className="sort-ico" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      {dir === null ? (
        <>
          <path d="M5 0 L8.5 3.5 H1.5 Z" fill="currentColor" />
          <path d="M5 10 L1.5 6.5 H8.5 Z" fill="currentColor" />
        </>
      ) : (
        <path d={dir === 'asc' ? up : down} fill="currentColor" />
      )}
    </svg>
  );
}

export function SortHead({
  label,
  sortKey,
  sort,
  numeric,
  onSort,
}: {
  label: string;
  sortKey: string;
  sort: SortState | null;
  numeric: boolean;
  onSort: (key: string) => void;
}) {
  const dir = sort && sort.key === sortKey ? sort.dir : null;
  const ariaSort = dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none';
  return (
    <th scope="col" aria-sort={ariaSort} className={numeric ? 'num' : undefined}>
      <button type="button" className="sort" onClick={() => onSort(sortKey)}>
        {numeric ? <SortIcon dir={dir} /> : null}
        {label}
        {numeric ? null : <SortIcon dir={dir} />}
      </button>
    </th>
  );
}
