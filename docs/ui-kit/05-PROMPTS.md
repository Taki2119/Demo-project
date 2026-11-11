# 05 · Prompts for Claude Code and the CLAUDE.md template

This assumes the new repo already has a `docs/ui-kit/` folder containing this kit's files (`README.md`, `00`–`05`).
If you use VS Code, run **P1-VSCode** from `00-VSCODE-GUIDE.md` instead of P1 below.
Every prompt below refers to that folder.
The parts inside `<...>` are where you must fill in values before pasting.

---

## P0 · `CLAUDE.md` template for the new repo

Paste into `CLAUDE.md` at the root of the new repo, then fill in the `<...>` parts.

```markdown
# CLAUDE.md: <Project name>

Static dashboard on GitHub Pages. UI/UX and the chart/table drawing logic follow the kit in `docs/ui-kit/`.
Detailed rules live in `docs/ui-kit/` (01 architecture · 02 design system · 03 charts & tables · 04 pitfalls & checklist).
**Before building or changing a board, a chart or CSS, read the matching file in that folder.**

## Tech stack (LOCKED, do not change on your own)
Vite 6 · React 18 + TypeScript strict (no `any`) · zustand · Tailwind CSS v4 · **Recharts 2.x** (the only
chart library, lazy-loaded via DYNAMIC `lazy`) · vitest (`environment: node`, `pool: threads`) · GitHub Pages · hash routes.

## Non-negotiable rules
1. No made-up data in `src/`. With no source yet, keep the board at `status: 'ready'` and show `NoData`.
2. Each chart has only ONE Y axis. Do not use Recharts' `<Funnel>`.
3. Treat every byte in `dist/` as public: no real data, SQL or secrets in the bundle.
4. Chart components do not format numbers themselves. `goodWhen` has no default. With no number, show `—`, not `0`.
5. Use color tokens only (`var(--series-n)`…), never type hex in a component. `--accent` is only for the interaction layer.
6. `backdrop-filter` may only be declared in `.ui-glass`. Overlays (popover, menu, dialog, toast) must portal to `body`.
7. A board does not draw its own H1 and does not declare `ui-board` itself. Adding a board = 1 parser file + 1 board file + 1 registry line + 1 catalog entry.
8. Typecheck with `npm run typecheck`, NOT `npx tsc --noEmit`. After building, grep `dist/` to confirm the new CSS is in the shipped build.

## Workflow
Never commit directly to `main`. Create a `feat/*` · `fix/*` · `chore/*` · `docs/*` branch, push the branch, then STOP and wait for review.
The agent does not open PRs or merge on its own.

## Map of src/
| Folder | Job |
|---|---|
| `src/data/` | Pure parsers + loaders + glossary |
| `src/boards/` | `registry.tsx` (lazy + boardChunk) + `*Board.tsx` |
| `src/nav/` | `catalog.ts` · `route.ts` (hash) · `resolve.ts` |
| `src/screens/` | Screen shells (DashboardScreen, Home, side panel) |
| `src/ui/` | Theme / palette / i18n / format / toast / dialog / tooltip / table |
| `src/ui/viz/` | Marks, axes, series colors, motion + `charts/` (12 templates) |
| `src/ui/filters/` | Shared filters (boards do not build their own filters) |
| `src/styles/` | CSS extracted from the original index.css, split by block |
```

---

## P1 · Copy files from the source repo to the new repo

Run this prompt **in the source repo** `<SOURCE_REPO_PATH>`, because the code is there.

```
Read <KIT_FOLDER>/README.md, section "File map". Copy into the target repo <NEW_REPO_PATH>:
- group A (as-is): copy verbatim, keeping the folder structure under src/;
- group B (cut wires): copy over but DO NOT edit YET; write the list into <NEW_REPO_PATH>/docs/ui-kit/TODO-cut.md,
  one line per file stating which wires must be cut;
- DO NOT copy group C and DO NOT copy src/index.css.
- Copy the folder <KIT_FOLDER>/ into <NEW_REPO_PATH>/docs/ui-kit/.
- On the files JUST COPIED into the target repo:
  · rename the prefix `jw-` to `ui-` (classes, SVG ids, CSS variables);
  · rename STORAGE_KEY in theme.ts, palette.ts, i18n.ts to '<app>.theme' / '<app>.palette' / '<app>.lang';
  · grep -i the source product/company name in strings and comments and remove or rewrite it neutrally,
    delete imports of brand logos/wordmarks. Report the number of edits in each file.
Commit nothing in the source repo. Report the list of copied files, with the file count per group.
```

---

## P2 · Build the new repo's skeleton

Run **in the new repo**.

```
This repo is a new GitHub Pages dashboard. Read CLAUDE.md and docs/ui-kit/01-ARCHITECTURE.md (§5, §7),
then build the skeleton:
1. package.json with exactly the stack in CLAUDE.md, with the scripts: dev, build (tsc -b && vite build), typecheck
   (tsc --noEmit -p tsconfig.app.json), test (vitest run), privacy:bundle, check:glass, check:viewport.
2. vite.config.ts: base = command === 'build' ? (process.env.VITE_BASE_PATH || '/<REPO_NAME>/') : '/';
   plugins react + @tailwindcss/vite; define __APP_VERSION__ read from package.json; vitest with environment 'node', pool 'threads'.
3. index.html: a prePaint script (classic script tag, placed in <head>) that sets data-theme and data-palette from localStorage
   before the body is painted; localStorage keys use the prefix '<app>.'; load Google Fonts Space Grotesk, Noto Sans JP,
   Zen Kaku Gothic New, Outfit.
4. src/main.tsx calls initTheme(), initPalette(), initRouter() and only then renders. App.tsx builds the shell
   .ui-app > [Ambient][AppSide][.ui-body > .ui-topbars + .ui-main > .ui-screen key={hash}].
5. .github/workflows/deploy.yml (runs only on main, with pages: write permission) and checks.yml (runs on pull_request,
   with only contents: read), with the SAME gates in the SAME order; checks.yml adds a gate: grep activeTooltipIndex in
   the initial chunk must equal 0.
6. Create branch chore/bootstrap, run npm test, typecheck and build; if green, push the branch and STOP.
Follow docs/ui-kit/04-PITFALLS-CHECKLIST.md (sections A, B).
```

---

## P3 · Port the design system (CSS + theme)

```
Read docs/ui-kit/02-DESIGN-SYSTEM.md, all of it. Extract CSS from <SOURCE_REPO_PATH>/src/index.css following
the table in §9. Read ONLY the line ranges listed in the table; do not read the whole file because it is very large.
- Split into src/styles/{tokens,palettes,base,ambient,controls,motion,shell,viz,overlays,hover}.css.
  src/index.css keeps only @import "tailwindcss", @custom-variant dark, and @import of the files above.
- Keep token names unchanged. Rename the source CSS's class/id/variable prefix `jw-` to `ui-`.
- Drop every CSS block that only serves a specific board or feature of the source repo (i.e. blocks not in the §9 table).
- Replace the logo and brand colors with <NEW_BRAND_DESCRIPTION>. Keep the 3 palettes Ember/Rime/Aurora as they are,
  unless I say to change them.
- Add the tests cssSource.test.ts (catches comment-close sequences outside comments), prePaint.test.ts and
  markContrast.test.ts (contrast floors in 03-CHARTS-TABLES.md §5).
- After building, grep dist/assets/*.css to confirm .ui-glass, .ui-app, @supports not (height:100dvh)
  and both backdrop-filter lines (one with the -webkit- prefix) are present.
Build a temporary /#/home page with 3 .ui-card.ui-glass cards and a theme/palette switch button, then take screenshots at
1440 and 430 × light/dark. Branch: feat/design-system. Push, then STOP.
```

---

## P4 · Port the chart and table layer

```
Read docs/ui-kit/03-CHARTS-TABLES.md and docs/ui-kit/TODO-cut.md.
1. Cut the wires for the group B files: format.ts (use the fixed locale '<ja-JP|vi-VN>' and declare type Bucket locally),
   StatTile.tsx and stats.tsx (use this repo's i18n; InfoTip reads the new src/data/glossary.ts), TablePager.tsx
   and SortHead.tsx (replace SolarIcon with this repo's icon set, or copy SolarIcon + solarIcons if needed).
2. DO NOT change the constants in axis.ts, nodes.tsx, marks.tsx, motion.ts, donutCorner.ts. They are the result of
   measurement over many tuning rounds.
3. Build a demo page #/dashboard/demo/charts, lazy-loaded, drawing all 12 chart templates with data GENERATED IN
   A TEST FILE (not put into src/). If the "no made-up data" rule leaves the demo page without numbers, show only
   NoData, and take screenshots from the test harness.
4. Run the full machine checklist in 04-PITFALLS-CHECKLIST.md. Branch: feat/viz-port. Push, then STOP.
```

---

## P5 · Add a new board (reuse for each board)

```
Add board "<BOARD_NAME>" to division/group "<DIVISION> › <GROUP>".
Source: <CSV file at URL/Drive/BigQuery proxy>, grain = one row is <…>. Columns: <column:type:meaning…>.
Business question the board must answer: <…>. Required metrics: <name — formula — flow or stock — goodWhen>.

Follow the checklist in docs/ui-kit/01-ARCHITECTURE.md §3:
1. src/data/<name>.ts: data types + EMPTY + parseX (throws on missing columns, cross-checks derived columns if any)
   + pure aggregation functions (flows summed, stocks take end-of-period, prevSpan, delta returns null when it cannot be computed).
2. src/data/<name>.test.ts runs in the node env, building data inside the test.
3. Add a glossary entry for each metric (ⓘ).
4. Add a catalog entry (status 'live', board, icon) and one lazy(boardChunk(...)) line in the registry.
5. Board follows the template in 01 §1c: XBoard → Connected → XCharts. Block order: FilterBar + the block it controls →
   .ui-kpis (StatTile) → .ui-charts (2 columns, even card count) → table (SortHead + TablePager).
6. Choose forms per the table in 03 §3. Before coding, explain to me why you chose each form.
7. Run the machine + eyes checklist in 04. Branch feat/<name>. Push, then STOP, and send the 4 screenshots.
```

---

## P6 · Add or change a chart in an existing board

```
In board <BOARD_NAME>, I want to see <data question>. Before coding:
(a) state what JOB this data does (comparison / composition / trend / steps / relationship…);
(b) choose a template per docs/ui-kit/03-CHARTS-TABLES.md §3, and state that template's "DO NOT use when" column;
(c) list the color tokens you will use.
Wait for my approval before coding. No second Y axis, no picking font sizes yourself, no typing hex.
```

---

## P7 · Review a branch against the rule set

```
Review the current branch's diff against main, per docs/ui-kit/04-PITFALLS-CHECKLIST.md and the rules in CLAUDE.md.
For each violation, write: file:line · rule broken · why it is wrong (a concrete scenario) · how to fix it.
Also run the machine gates and report the NUMBER of files/tests (not just the word "passed"). Change nothing, only report.
```

---

## P8 · Quick questions while working (one line)

- `Per docs/ui-kit/03 §3, which template should draw the data <…>? Also give the reasons for ruling out the other templates.`
- `Does this mark meet the contrast floor in 03 §5 against the worst background in both the light and dark themes? Measure with numbers.`
- `Check whether the CSS rule just added is really in dist/, and whether it creates a backdrop root over any glass.`
