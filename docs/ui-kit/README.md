# Dashboard UI Kit

A kit for building a static dashboard site on **GitHub Pages**. It gives you:

- a design system (color tokens, glass effect, app shell, motion);
- the logic for drawing charts and number tables;
- a workflow for building a board from data to UI.

The kit was extracted from a dashboard repo that runs in production, but every name, logo and example tied to the original product has been removed. So any repo can use it.

## What the kit contains

| File | Read when |
|---|---|
| [`00-VSCODE-GUIDE.md`](00-VSCODE-GUIDE.md) | **Start here**: step by step, applying the kit to a new repo with VS Code + Claude Code, all the way to GitHub Pages |
| [`01-ARCHITECTURE.md`](01-ARCHITECTURE.md) | Building the app skeleton: data flow → board, catalog, hash route, filters, Pages deploy |
| [`02-DESIGN-SYSTEM.md`](02-DESIGN-SYSTEM.md) | Building the UI: color tokens (3 palettes × light/dark), liquid glass, app shell, hover/motion, shared components |
| [`03-CHARTS-TABLES.md`](03-CHARTS-TABLES.md) | Drawing charts and tables: 12 chart templates, rules for choosing a form, node–ring–pill marks, series colors, number formatting, tables with sort and pagination |
| [`04-PITFALLS-CHECKLIST.md`](04-PITFALLS-CHECKLIST.md) | Before merging: pitfalls actually hit, acceptance checklist, CI gates |
| [`05-PROMPTS.md`](05-PROMPTS.md) | Prompts to paste into Claude Code, plus a `CLAUDE.md` template for the new repo |

## How to use it: 4 steps

> If you use VS Code + Claude Code, follow `00-VSCODE-GUIDE.md`. That document goes into more detail than the 4 steps below.

1. **Create a new repo** with exactly this stack: Vite 6, React 18, TypeScript strict, Tailwind CSS v4
   (`@tailwindcss/vite`), Recharts 2.x, zustand 5, vitest 2.
2. **Copy code from the source repo** following the *File map* below. You can use prompt P1 in `05-PROMPTS.md`. When copying:
   - rename the class prefix `jw-` to `ui-`;
   - rename the localStorage keys to your app's name;
   - remove any name or logo of the source product left in strings and comments.
3. **Copy the CLAUDE.md template** (`05-PROMPTS.md`, section P0) into the root of the new repo. Copy the kit's 6 files into `docs/ui-kit/`.
4. **Run the prompts** P2 → P3 → P4, then use P5 for each board.

> This kit only records what the code actually does. Where the source repo's old docs disagree with the code, the kit follows the **code**.
> For example: donut at most 5 slices, chart animation 1000ms.

## File map: what to take from the source repo's `src/`

### A. Can be copied as-is (needs only React, Recharts and the CSS tokens)

| Group | File |
|---|---|
| Viz: constants and marks | `ui/viz/axis.ts` · `marks.tsx` · `nodes.tsx` · `series.ts` · `motion.ts` · `donutCorner.ts` · `heat.ts` · `beeswarm.ts` |
| Viz: helpers | `ui/viz/Tip.tsx` · `FloatTip.tsx` · `TrendArrow.tsx` · `CellBar.tsx` · `ChartZoom.tsx` |
| Viz: 12 chart templates | `ui/viz/charts/*.tsx` (imports nothing outside `ui/viz`) |
| Tables (pure part) | `ui/tablePage.ts` · `ui/tableSort.ts` |
| Theme / palette | `ui/theme.ts` · `ui/palette.ts` (rename `STORAGE_KEY`) · `ui/viewSwitch.ts`, plus the prePaint script in `index.html` |
| Motion | `ui/reveal.ts` · `ui/staggerIn.ts` · `ui/useStaggerIn.ts` · `ui/cssMotion.ts` · `ui/usePresence.ts` |
| UI infrastructure | `ui/useEscape.ts` · `useMediaQuery.ts` · `popoverFocus.ts` · `popoverPlace.ts` · `tipPlace.ts` |
| Components | `ui/SlideToggle.tsx` · `ConfirmDialog.tsx` · `HoverTip.tsx` · `Toast.tsx` + `toastStore.ts` · `Loading.tsx` · `NoData.tsx` · `ErrorBoundary.tsx` |
| Filters | `ui/filters/*` (both the pure part and the components) |
| Data (pure) | `data/csv.ts` · `lib/day.ts` · `data/fiscal.ts` (reset `FISCAL_START_MONTH`, `ANCHOR`) |
| Navigation | `nav/route.ts` (rename segments) · `boards/chunkReload.ts` |
| Background | `ui/ambient/` (`Ambient.tsx`, `svgFile.ts`, `ribbon.svg`; can be replaced with another image) |
| CI | `.github/workflows/deploy.yml` · `checks.yml` · `scripts/check-bundle-*.mjs` · `scripts/check-branch.mjs` · `privacy-rules.mjs` |
| Example tests | `boards/boardShell.test.ts` · `ui/cssSource.test.ts` · `ui/markContrast.test.ts` · `ui/i18n.test.ts` · `ui/prePaint.test.ts` |

### B. Can be copied but the WIRES must be CUT

| File | Wires to cut |
|---|---|
| `ui/format.ts` | `numberLocaleNow` (regional-format store) → fixed locale; type `Bucket` imported from a data module → declare locally; type `Lang`; currency symbol |
| `ui/viz/StatTile.tsx` · `stats.tsx` | `useT` / `useLangStore` (i18n) · `InfoTip` (tied to glossary + catalog) |
| `ui/TablePager.tsx` | `SegmentFilter` (already in `ui/filters`) · `SolarIcon` + `solarIcons` (the open-source Solar icon set) · the i18n keys `pager*`, `pageSize` |
| `ui/SortHead.tsx` | `SolarIcon` · key `sortHint` |
| `ui/i18n.ts` | Keep the skeleton (`Lang`, `DICT`, `useT`, `fill`), replace all content |
| `ui/InfoTip.tsx` | Keep the popover UI, replace the glossary source with the new repo's glossary |
| `data/driveData.ts` · `driveSource.ts` | Getting the file-store token → the new repo's adapter; drop the folder/file id constants |
| `data/boardData.ts` | List of board codes |
| `nav/catalog.ts` · `resolve.ts` | Keep the **types** and utility functions, drop the concrete catalog tree and the `LEGACY_*` tables |
| `src/index.css` | **Do not copy as-is** (about 1 MB). Extract only the blocks listed in `02-DESIGN-SYSTEM.md` §9 |

### C. Do not bring over

- The source product's specific boards, parsers and glossary.
- Sign-in (`auth/`) and the proxy server.
- The Home screen, the specific side panel.
- Product-specific modules: AI chat, telemetry, settings.
- Any brand logo, wordmark or icon.
- `GlassDefs.tsx` (an abandoned backup).

You build the new repo's logo, name and favicon yourself.

## Three decisions worth keeping

1. **Hash routes** (`#/dashboard/...`). A static host has no rewrites, so pressing F5 on a deep path gives a 404.
2. **Recharts lazy-loaded (dynamic import)** via `lazy(boardChunk(...))`. This cuts the initial bundle from 578 kB to 170 kB.
3. **Treat every byte in `dist/` as public.** Pages is public even when the repo is private, so real data, SQL or
   secrets must never go into the bundle.
