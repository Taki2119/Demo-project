# 01 · Architecture: from data to screen

Paths in this file are relative to the source repo's `src/` (where the code is copied from).

## 1. End-to-end flow

```
Source (CSV/csv.gz file | API via proxy)
  → fetch text            data/driveSource.ts   (gunzip by magic bytes 1f 8b)
  → parseX(text)          data/<name>.ts        (PURE PARSER, tested in the node env)
  → useDriveData()        data/driveData.ts     (in-memory zustand cache, phase)
  → gate / NoData         ui/DriveConnect.tsx · ui/NoData.tsx
  → <XCharts data/>       the PRESENTATION half, receives data via prop
  → ui/viz/charts/* · StatTile · table
```

**Core principle: the parser does not know the source.** The file store (static URL, Google Drive…) returns CSV. The data proxy (`data/boardData.ts`)
returns `{csv, updatedAt}`, i.e. that same CSV. So switching sources needs no change to any line of the parser.

### 1a. Pure parser (`data/<name>.ts`)

- Declare the data types (`XRow`, `XData`) and the constant `EMPTY_X`.
- `parseX(text)`:
  - **throws** when a header column is missing, when the cell count is wrong, or when the time key does not match `YYYY-MM`;
  - **cross-checks derived columns**, e.g. `net == insert − remove`; on mismatch it throws;
  - sorts by the `YYYY-MM` string, **not** via `new Date`.
- Aggregation functions must be pure and tested:
  - `flowSum` for **flow** quantities (summed);
  - `totalIndexFor` for **stock** quantities (end-of-period value);
  - `prevSpan` returns the immediately preceding span of the same length as the current one; with missing data it returns `null`;
  - `deltaPct` / `deltaBetween` propagate `null`.
- The loader `loadX(fetchText)` takes the read function as a parameter, so tests need no network.
- For CSV with commas inside cells, use `data/csv.ts › parseCsvRows`.

### 1b. Shared loading hook (`data/driveData.ts`)

- `useDriveData({fileId, tag, empty, parse, locate?, bq?})`.
- `fileId` is the **cache key**.
- The cache lives in a module-level zustand store, **in memory only, not persisted**. On sign-out, call `clearDriveData()`.
- `parse` / `locate` go through `useRef`. If they were in the effect's deps, every render would refetch.
- The effect has an `alive` flag to drop late results.
- Phase has 4 values: `need-token | loading | failed | ready`. **With a cache present it is always `ready`**, checked even before `failed`.
- `failReason` has 3 values: `missing` (404 / NOT_FOUND), `forbidden` (403), `other`.

### 1c. Standard board template

```tsx
export function XBoard() {
  if (!GOOGLE_CLIENT_ID) return <NoData />;      // avoid calling the hook when there is no OAuth provider
  return <Connected />;
}
function Connected() {
  const d = useDriveData({ fileId, tag, empty: EMPTY_X, parse: parseX, locate });
  const gate = driveGate(d); if (gate) return gate;      // need-token / loading ⇒ spinner
  if (d.phase === 'failed')
    return <NoData message={d.failReason === 'missing' ? `${t('noDriveFile')} ${FILE}` : t('dataFailed')} />;
  return d.data.months.length === 0 ? <NoData /> : <XCharts data={d.data} />;
}
export function XCharts({ data, now }: { data: XData; now?: Date }) { /* pure presentation */ }
```

Splitting out `XCharts` like this makes it testable and screenshot-able without signing in.
In a new repo without OAuth, drop the `GOOGLE_CLIENT_ID` line and `driveGate`, and replace them with a static JSON/CSV `fetch`.
The rest of the template stays the same.

### 1d. Chunk reload safety net (`boards/chunkReload.ts`)

On every deploy, GitHub Pages **deletes the old chunks**. A tab opened earlier that calls `import()` gets a 404 and React unmounts the whole tree,
leaving a black screen. The function `boardChunk(key, load)` handles it like this:

- If `import()` fails, reload the page **exactly once**. The marker flag is stored in `sessionStorage`.
- Do not reload when offline, and do not reload when there is no storage (otherwise it becomes an infinite loop).
- Once it has decided to reload, the function returns a promise that never resolves, so `<Suspense>` keeps the spinner.
- `ErrorBoundary` wraps **outside** `Suspense`, only around the board part. If a board breaks, the title and navigation remain.

## 2. Anatomy of a board

The `DashboardScreen` screen builds the shell. A board does **not** build its own shell:

```
<div class="ui-board">                         ← gap = --blk-out 24px
  <PageTitle crumbs title desc actions after/> ← the ONLY H1, name taken from the catalog
  <ErrorBoundary><Suspense><Board ref_/></Suspense></ErrorBoundary>
```

A board does not draw an H1. Card titles are `<h2>`. The `boardShell.test.ts` gate forbids board files from declaring `"ui-board"` themselves.

**Order of blocks inside a board:**

1. `<section class="ui-blk">` containing a `FilterBar` and, **directly below it**, the block that filter controls.
   Do not gather all filters at the top of the page. The gap inside a block is `--blk-in` 12px.
2. `<div class="ui-kpis">` holding the `StatTile`s. The grid uses `repeat(auto-fit, minmax(12.75rem, 1fr))`.
   Pick a tile count so no tile is left alone on the last row.
3. `<div class="ui-charts">` holding `<figure class="ui-card ui-glass ui-viz [ui-card--wide]">`:
   ```html
   <h2 class="ui-card-title">Name <InfoTip metric="key"/></h2>
   <p class="ui-card-sub">subtitle</p>
   <div class="ui-chart"><ResponsiveContainer>…</ResponsiveContainer></div>
   ```
   The grid declares **2 explicit columns**, not `auto-fit`. The number of non-wide cards must be **even**.
4. Tables consist of `.ui-tablewrap > table.ui-table`, `SortHead` and `TablePager`. See `03-CHARTS-TABLES.md` §6.

## 3. Registry and catalog

```tsx
// boards/registry.tsx
export interface BoardProps { ref_: DashboardRef }
export const BOARDS: Record<BoardKey, ComponentType<BoardProps>> = {
  sales: lazy(boardChunk('sales', () => import('./SalesBoard').then(m => ({ default: m.SalesBoard })))),
};
```

`lazy()` is mandatory. Recharts weighs about 400 kB and must not leak into the initial chunk.

```ts
// nav/catalog.ts (abridged)
type DashboardStatus = 'ready' | 'live' | 'stale' | 'planned';
interface DashboardDef { id: string; name: string; desc?: LocalStr; status: DashboardStatus;
  board?: BoardKey; preview?: PreviewKey; icon?: GroupIcon }
interface GroupDef    { id; name; desc; icon; dashboards: DashboardDef[] }
interface DivisionDef { id; name; short; desc; icon; groups: GroupDef[] }
interface SectionDef  { id; name; icon; divisions: DivisionDef[] }
export const CATALOG = SECTIONS.flatMap(s => s.divisions);
```

Meaning of `status`:

| status | Meaning |
|---|---|
| `planned` | Hidden everywhere |
| `ready` | Name shown; the page draws `NoData` |
| `live` | Data connected |
| `stale` | Connected but the numbers are out of date |

`catalog.test.ts` locks these constraints:

- `live` / `stale` **must** have a `board`;
- `planned` **must not** have a `board`;
- no duplicate ids within the same level.

**Array order is display order.** Reordering elements breaks nobody's URL.

### Checklist for adding a board

1. `data/<name>.ts`: declare types, `EMPTY_X`, `parseX` (throws on missing columns, cross-checks derived columns),
   pure aggregation functions and `loadX(fetchText)`.
2. `data/<name>.test.ts`: build the data inside the test, run in the `node` env.
3. `data/glossary.ts`: add a metric explanation entry (`what` in both vi and ja, `formula`, `unit`, `note`) for the ⓘ button.
4. Source constants (folder + **file name**). Do not pin `fileId`, because overwriting a file changes the id while the name stays.
5. `BoardKey` and the catalog entry (`status: 'live'`, `board`, `icon`).
6. `boards/<Name>Board.tsx` following the §1c template, and **one line** in `registry.tsx`.
7. Add CSS only when a new class is truly needed. Grep the class name first to make sure it is not taken.

No changes needed to `App.tsx`, the group bar or Home.

## 4. Hash routes (`nav/route.ts`)

- Kinds: `login | home | dashboard{division, path[]}`. Hashes look like `#/home`, `#/dashboard/<division>/<group>/<board>`.
- `parseHash` / `toHash` are pure functions. A test locks `toHash(parseHash(h)) === h`.
- `navigate(route, replace)`. Automatic forwarding steps use `location.replace` so the Back button does not get stuck.
- `route.ts` **does not know the catalog**. `nav/resolve.ts` connects routes to the catalog:
  - URL shortening: when the only group has the same name as its division, drop the group segment;
  - old links are translated through explicit `LEGACY_*` tables.
- **Why hash:** a static host has no rewrites, so F5 on a deep path gives 404. The hash keeps deep links and bookmarks working.

## 5. App shell

```
main.tsx: initTheme(); initPalette(); set lang; initRouter(); render <App/>
App: viewFor({loading, hasUser, ...}) → boot | login | app   (render by view, the URL follows)
.ui-app = [<Ambient/>] [AppSide (side panel)] [.ui-body = .ui-topbars + .ui-main (the ONLY scroll container)]
.ui-screen key={hash}  → a route change remounts; useStaggerIn runs the fan-out effect
```

Detailed CSS layout is in `02-DESIGN-SYSTEM.md` §3.

## 6. Filters (`ui/filters/`)

Boards only import from `ui/filters`, they **do not build their own filters**.

| Component | Job |
|---|---|
| `DateRangeFilter` | Date range, with a quick-pick column |
| `PeriodFilter` | Range in week / month / fiscal-quarter blocks |
| `PickFilter` | Single choice (optional `search` box) |
| `MultiPickFilter` | Multiple choice; empty set = no filtering (`passesMulti`) |
| `SelectFilter` | Native `<select>` for long lists |
| `RangeSliderFilter` | Numeric range with a slider |
| `NumberRangeFilter` | Threshold `≥ > ≤ <`; empty box = no limit |
| `TextFilter` | Search within rows (NFKC, case-insensitive) |
| `SegmentFilter` | 2–4 fixed steps |

```tsx
<FilterBar dirty={!samePeriodRange(range, def)} onReset={() => setRange(def)} aside={…}>
  <PeriodFilter value={range} onChange={setRange} label={t('period')} min max today clearable={false} />
</FilterBar>
```

**FilterBar:**
- The reset button (icon `filter-close`) only shows when `dirty`.
- `aside` is the part pushed to the right, not counted in `dirty`.
- Panels are portaled to `body`.
- The whole app allows only **one open panel** at a time (`openPanel.ts`).

**Pure part `period.ts`:**
- `periodRangeDays` converts a range to days, so boards do not need to know the unit.
- `prevPeriodRange` steps back exactly the same number of blocks.
- `convertPeriodRange` always widens the range, never trims it.

**`data/fiscal.ts`:**
- The fiscal year starts in month `FISCAL_START_MONTH` and has **one** anchor `ANCHOR` (which period number starts in which year). In a new repo, reset both.
- Do **not** compute quarters yourself with `(month-1)/3`: the result is off by 2 months while the labels still look plausible.

**How to plug a filter into a board:**
- Default to the latest month **present in the file**, not based on the system clock.
- `min` / `max` come from the file's range.
- KPIs use `clearable={false}`. For charts, a `null` value means viewing the whole series.
- **Flow** quantities are summed. **Stock** quantities take the end-of-period value (for sparse tables use LOCF, i.e.
  the most recent value of each entity).
- Labels must name the range being viewed exactly. `deltaNote` changes with the range length ("vs previous month" / "vs previous period").
- A sparkline uses the same time window as the number it accompanies.

## 7. GitHub Pages deploy

- `vite.config.ts`: `base = command === 'build' ? (VITE_BASE_PATH || '/<repo-name>/') : '/'`.
  - With a custom domain, set `VITE_BASE_PATH=/`.
  - The favicon uses the relative path `./logo.svg`.
  - The version comes from `define: { __APP_VERSION__ }`, read from `package.json`.
- Vitest: `environment: 'node'`, **`pool: 'threads'`**. The `forks` pool silently drops test files on Windows.
- `deploy.yml`: runs on `push` to `main` or `workflow_dispatch`; permissions `pages: write`, `id-token: write`;
  `concurrency.cancel-in-progress: false`. Steps:
  `npm ci → npm test → npm run build → check:clientid → privacy:bundle → check:glass → check:viewport → upload-pages-artifact(dist) → deploy-pages`.
- `checks.yml`:
  - runs on `pull_request`, with **the same gates in the same order** as `deploy.yml`;
  - has only `contents: read` permission, so it cannot deploy by accident;
  - adds one gate: `grep -c activeTooltipIndex dist/assets/index-*.js` must return 0, i.e. Recharts is not in the initial chunk.
- Work outside the repo:
  - Pages Source = **GitHub Actions**;
  - default branch = `main`;
  - a ruleset protecting `main` (require PR, approvals = 0 if there is only one person, block force push);
  - do **not** tick "Require branches to be up to date", because every merge would rerun CI for every open PR.
