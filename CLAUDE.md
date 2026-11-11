# CLAUDE.md — handoff + long-term context for SaaS Analytics Demo

> Claude Code loads this file automatically at the start of every session. It carries DECISIONS + STATUS + TRAPS
> already hit, so a new session (including an online session reading the repo from GitHub) can continue without re-investigating.
> Technical details live in: [`docs/SCHEMA.md`](docs/SCHEMA.md) (data, formulas, risk score) ·
> [`docs/API.md`](docs/API.md) (API contract) · [`server/README.md`](server/README.md) (deploy) ·
> [`README.md`](README.md) (run commands) · [`docs/ui-kit/`](docs/ui-kit/README.md) (design system +
> rules for drawing charts/tables). Don't copy the content of those files here.
> The user communicates in **Vietnamese**; reply in Vietnamese. Update §5 STATUS every time a step is done.

## 1. What the project is

A **personal** project: a dashboard web app for a **simulated** SaaS (a simplified version of an
internal dashboard platform the user once worked on at a company). It has:
- a Home page (preview cards);
- 4 plans (All · Starter · Growth · Scale) × 4 boards (Revenue · User count ·
  By user · By company);
- ONE revenue-growth project page: **early churn warning** (customers using less, dropping seats, dropping the
  core feature, cancel scheduled);
- **Ask AI ("Hỏi AI" in the vi UI) (demo version)**: a chat window opened from the top-right button on every screen,
  answering from a set of sample questions using the API's numbers. Does NOT call a real AI.

Architecture: **Supabase (Postgres)** `raw → mart` · **Vercel** (`server/`, separate project) ·
**GitHub Pages** (Vite + React web app). Repo: `Taki2119/Demo-project`, branch `main`.

## 2. Constraints that must NOT be broken

1. **No real data, no data from any organization.** Every company / person / email name is created by the
   data generator (`scripts/data/names.mjs` assembles fragments, emails only at `*.example.com`). No sample numbers
   at all in the web bundle: without an API every page says "not configured".
2. **Code / design:** the only source is the kit at [`docs/ui-kit/`](docs/ui-kit/README.md); start reading
   from `README.md` (file map) and `00-VSCODE-GUIDE.md`. The current UI layer
   (`src/ui/parts.tsx` + `src/index.css`) is a TEMPORARY version Claude wrote itself. The "design" step replaces
   those 2 files (keeping props + class names) and adds new modules under `src/ui/`. Exception (the user
   allowed 2026-11-11): may edit `src/screens/Sidebar.tsx` ONLY to (a) make a ≤640px drawer and (b) add EXACTLY
   1 "Giới thiệu" (About) link (`#/about`) at the end of the list (allowed 2026-11-11, phase 5); keep props. Do NOT rebuild pages,
   do NOT run the kit's P2 (build the shell) since the shell already exists. Still keep:
   - **never write the former company's name into this repo** — including the machine path to the source repo (that path
     contains the name). The path lives only in `.claude/settings.local.json` or `/add-dir`, never committed;
   - **don't bring over icons / logos / wordmarks** of the real company (the kit includes none);
   - when copying from the source repo, rename the class prefix `jw-` → `ui-`, and grep for the company name before committing (§7).
3. **Currency: Japanese yen**, `numeric(14,0)`, integers.
4. **Bilingual ja / vi**, toggle button in the side panel. Two text sources, don't mix them:
   - UI text → `src/ui/i18n.ts` (a test locks the 2 key sets to be equal);
   - DATA text (column names, plan names, industries, risk bands…) → `mart.labels` + `mart.column_labels`
     in the DB, read via `src/data/labels.ts`. The app and the AI share this SAME source.

   The DB keeps column names + codes in English.
5. **Mart carries only ADDITIVE numbers.** Ratios (ARPA, NRR, churn, DAU/MAU…) are computed on the client
   (`src/data/metrics.ts`). Denominator 0 ⇒ `null` (shown as "—"), never `0`.
6. **Read-path security:** the browser never talks to Supabase directly. Vercel reads with the role
   **`analytics_reader`** (SELECT only on `mart`, READ ONLY, `statement_timeout 15s`). SQL is fixed
   per `source` in `server/lib/sources.js`; the client does not send SQL. The API requires no login
   (aggregated data + read-only). The user has been told; adding Google login can be done later.
7. **Don't commit secrets.** `.env` is ignored. DB passwords / connection strings live only in `.env` (local machine) and
   Vercel env. Don't ask the user to paste passwords into the chat.
8. **Every date ≤ `as_of`** (`raw.dataset_meta.as_of_date`, default 2026-11-10). The data is static
   but consistent because mart computes up to this point, not up to `current_date`.

## 3. Repo map

| Path | Purpose |
|---|---|
| `supabase/migrations/*_raw.sql` | 13 raw tables (SCD2 `subscription_periods` is the MRR source of truth) |
| `supabase/migrations/*_mart.sql` | views + 3 materialized views, `mart.refresh()`, `mart.dq_checks`, risk score v2 |
| `supabase/migrations/*_access.sql` | role `analytics_reader`, RLS, revoke anon/authenticated privileges |
| `supabase/migrations/*_labels.sql` | ja/vi dictionary |
| `supabase/tests/` | `schema.test.mjs` (hand-computed scenarios) · `generate.test.mjs` (generator → DB) |
| `scripts/data/` | seeded generator (`generate.mjs` pure) · `generate-cli.mjs` → `data/out/*.csv` · `load.mjs` (COPY into Supabase) |
| `scripts/dev/` | `demo-db.mjs` (PGlite + migrations + data) · `api-dev.mjs` (local API) |
| `scripts/ci/` | gate inspecting `dist/`: `bundle-checks.mjs` (rules, pure functions) · `check-bundle.mjs` (reads `dist/` + env) · tests |
| `server/` | Vercel project: `api/board-data.js` · `api/health.js` · `lib/{sources,handler,db}.js` · `test/` |
| `src/nav/` | `catalog.ts` (ONE source for the page tree) · `route.ts` (hash router) |
| `src/ask/` | Ask AI demo (pure): `match.ts` · `kit.ts` · `q/*.ts` (37 questions) · `questions.ts` (`resolve`, `autocomplete`) · `chat.ts` (conversation store) |
| `src/data/` | `api.ts` (the only read path + cache, `loadSource`) · `labels.ts` · `metrics.ts` · `rollup.ts` · `churn.ts` · `glossary.ts` (metric explanations; names POINT to DB labels) · `freshness.ts` |
| `src/screens/` | Sidebar · Home · Board (shared for 4×4) · Churn · About (`#/about`) |
| `src/ui/ask/` | `ChatDock` (button, initial chunk) · `ChatPanel` (window, lazy-loaded) · `AnswerView` · `AskLine` |
| `.github/workflows/deploy.yml` | ONE `checks` job for both PRs and `main`: typecheck → test → db:test → api:test → check:test → build → check:bundle → deploy Pages (only `main`) |

## 4. Commands + measured numbers (2026-11-11)

```bash
npm install
npm run typecheck && npm test && npm run build   # web: 17 files / 543 tests (2026-11-12)
npm run check:test  # 10 tests (gate rules, fake bundle)
npm run check:bundle  # after build: recharts · css · privacy · env (PRIVACY_DENY missing: local ⇒ warning, CI=true ⇒ FAIL)
npm run db:test     # 16 tests, ~90s (PGlite)
npm run api:test    # 7 tests, ~10s, runs as role analytics_reader
npm run data:generate                            # 261 companies · 5,103 users · ~835k activity rows · ~26 MB CSV
npm run api:dev     # local API + in-memory demo DB (~2 minutes to build) → port 3001
VITE_API_URL=http://localhost:5173 npm run dev   # vite proxy /api → 3001 (same origin)
```

- End-to-end run on the local machine: Home shows MRR **¥10,980,820**, matching the generator's summary.
- Risk score accuracy (churn within 90 days), 24 months of data:

| Band | Churn rate |
|---|---|
| cancel scheduled | 93.8% |
| 高 | 45.7% |
| 中 | 13.8% |
| 低 | 3.2% |

## 5. STATUS

**Done (pushed to `main`):**
- schema + data generator;
- web shell;
- Vercel API (code + tests);
- Pages workflow.

**Waiting on the user (outside the repo):** per [`server/README.md`](server/README.md).
1. ~~Supabase~~ **DONE 2026-11-11:** project `Demo` (ref `tozsokrpjfrpdokvoydo`, Tokyo).
   Ran 4 migrations, set the `analytics_reader` password, `data:load` (dq_checks 5/5 = 0,
   116.8s). The local `.env` already has `DATABASE_URL` (Session pooler).
2. ~~Vercel~~ **DONE 2026-11-11:** `https://demo-project-server.vercel.app`, `/api/health`
   returns `{"ok":true,"asOf":"2026-11-10"}`. Configuration used (for reference):
   Root Directory = `server`. Env:
   - `DATABASE_URL` = Transaction pooler 6543 with user **`analytics_reader.<ref>`**, not
     `postgres`;
   - `ALLOWED_ORIGINS=https://taki2119.github.io`.

   Check with `/api/health`.
3. GitHub: Settings → Pages → Source = **GitHub Actions**; Variables → `VITE_API_URL` = Vercel production
   domain (`https://<name>.vercel.app`, no trailing `/`).

**Next work (in the agreed order):**
1. ~~Deploy support~~ DONE (Pages + Vercel + Supabase running; Vercel's `/` returning 404 is correct — there is only `api/`).
2. **Ask AI — DEMO VERSION, does NOT call a real AI. D1–D3 DONE, the user approved each phase (2026-11-12).
   Branch `ai-qa-demo`, MERGED into `main` locally (2026-11-12, `--no-ff`).**
   Fully replaces the Claude CLI plan. Dropped: the local bridge, the public `api/query`, Cloudflare Tunnel,
   `setup-token`. Reasons: no quota usage, no endpoint accepting SQL, works on any machine. Stop
   for the user to review after each phase.
   - A chat window, with a set of sample questions (37 questions, full ja + vi).
   - Free typing is matched APPROXIMATELY, no 100% match needed:
     - close enough ⇒ answer the nearest sample question, plus suggest a few related questions;
     - not close enough ⇒ only suggest questions.
   - State clearly in the window "demo version, not connected to a real AI" (a "Demo" chip + a note on open).
   - **Numbers come from the EXISTING `board-data` sources:**
     - NO new SQL, NO edits to `server/`, NO Vercel redeploy;
     - answer = ja/vi sentence templates filled with numbers; ratios computed on the client (`metrics.ts`);
     - NO numbers in the bundle (§2.1);
     - every answer states "data used: source + calculation". Do NOT pretend to show executed SQL.
   - **Changed 2026-11-12 (the user):** NO separate page. Replaced by a chat window opened from the top-right
     button on EVERY screen; the sample-question list is hidden, only 2–3 questions are suggested + autosuggest while typing. No more
     `#/ask` route, no edits to `Sidebar.tsx`.
   - Matching:
     - NFKC normalization + lowercase;
     - Vietnamese strips diacritics, so typing without diacritics still matches;
     - Japanese compares character bigrams, split by script (kanji/katakana separate, hiragana separate) so
       bigrams don't straddle particles;
     - do NOT put negation words ("không", "chưa") in the stop-word list;
     - simple parameter extraction: plan (code + DB label), top N.
   - Phases:
     - **D1 DONE, approved** — core `src/ask/`:
       - `match.ts`: normalization, features, IDF, `ANSWER_MIN`;
       - `kit.ts`: types + helper functions;
       - `q/{revenue,users,companies,churn}.ts`: 37 questions (13 · 7 · 8 · 9);
       - `questions.ts`: `resolve` / `resolveId` / `STARTERS`;
       - tests: `match.test.ts` (every phrasing matches itself + 77 paraphrases + off-topic questions) ·
         `questions.test.ts` (hand-computed fake data);
       - ran all 37 questions × ja/vi × (all plans / growth) on the demo DB through the real API handler (temporary
         test, not kept in the repo because it takes ~50s).
       - To add a question, add it to `q/*.ts`. A paraphrase that misses ⇒ add phrasings / keywords,
         do NOT lower `ANSWER_MIN`.
     - **D2 DONE (redone 2026-11-12 as a chat window), approved** — chat window:
       - `src/ui/ask/ChatDock.tsx`: button `.ask-fab` fixed at the top right, mounted in `App.tsx` OUTSIDE
         `.main` (main is rebuilt per route) ⇒ the window + conversation persist across page changes. The button is in
         the initial chunk (209 → 214 kB); `ChatPanel.tsx` (the question set, ~80 kB) is lazy-loaded on first open, after that
         only hidden via `hidden` (keeps typed text + scroll position);
       - `ChatPanel.tsx`: portals to body; on desktop a floating window that does NOT block the page; at ≤640px it covers the full screen,
         `.main`/`.side`/`.side-bar` inert. The chat input is a combobox: `autocomplete()` (≤ 3 questions; sample questions
         CONTAINING the typed text come first) · ↑↓ select · Enter asks · Tab fills · Esc once closes suggestions, twice collapses
         the window (focus back to the button). Empty input ⇒ 3 `WELCOME` questions;
       - `AnswerView.tsx` (stat tiles · HBars · table · "data used") + `AskLine.tsx` (SoloLine, lazy-loaded);
       - `src/ask/chat.ts`: the conversation stores question CODES + raw data ⇒ switching ja/vi rebuilds the whole conversation;
       - `loadSource()` in `src/data/api.ts`: loads outside React, shares the cache with `useSource`;
       - `src/styles/ask.css`: the kit has NO chat pattern ⇒ assembled from existing pieces. The window is glass (glass panel
         of menu/popover/dialog); every block inside is an opaque surface, stat tiles/tables turn glass off with
         `--glass-blur: 0px` (no nested glass, no extra `backdrop-filter` declarations). `hover.css` lowers the
         z-index of `.btn` on hover ⇒ `.btn.ask-fab` keeps z 30;
       - `PAGE_ASK` in the catalog is now only the button name + a line on the About page;
       - browser check `Demo-project-shots/tools/ask.mjs` 86/86 (screenshots in `Demo-project-shots/out/ask/`).
         The 404 for `/favicon.ico` at the preview server root is the browser's; the tool ignores that URL specifically.
     - **D3 DONE 2026-11-12** — README (Ask AI section + how to add a question) · `docs/API.md` (no new
       endpoint) · §1/§2.2/§3/§4/§5. Final check: typecheck clean · 17 files / 543 tests · build · check:test 10/10 ·
       check:bundle 4/4. No SQL / `server/` touched ⇒ db:test / api:test not run.
   - Noted so it needn't be re-investigated, if a real AI is wanted later: Claude CLI v2.1.322 has the flags
     `-p --tools "" --system-prompt --output-format json --model --no-session-persistence --json-schema`.
     `--bare` only accepts an API key. The current machine does not have `claude` in PATH.
3. **Charts** for each board: the slot is `<section className="viz">` in BoardScreen / ChurnScreen.
   Library: **Recharts 2.x, lazy-loaded (dynamic import)** per `docs/ui-kit/03-CHARTS-TABLES.md`. Done together with item 4.
4. **Design + charts (item 3 merged into this):** permitted (§2.2), plan APPROVED 2026-11-11, done
   on branch `feat/ui-kit`, stopping for the user to review after each phase (with screenshots 1440/430 × light/dark).
   Settled decisions:
   - **Option 2**: do NOT read the source repo, rebuild from the `docs/ui-kit/` spec. Constants take exactly the numbers the kit
     states; where the kit states nothing, say so, don't set a value yourself and then treat it as a rule;
   - only the **Ember** palette, light/dark follows the system (`data-theme` via prePaint), no toggle button yet;
   - Google Fonts as in the kit; check that Vietnamese with diacritics doesn't fall back to a fallback font;
   - **don't install Tailwind**; install Recharts 2.x;
   - keep props + class names of `parts.tsx` / `index.css`; CSS split into `src/styles/*`;
   - single-series MRR = a hand-written single-series line chart, exactly ONE pill at the best point (don't use MultiLines);
   - new gate added to `deploy.yml` (not replacing the file): `npm run check:bundle`. `bundle-privacy`
     reads the deny list from `PRIVACY_DENY`: missing when `CI=true` ⇒ FAIL, locally ⇒ warning.

   Phases: (1) install Recharts → (2) CSS + parts.tsx + prePaint → (3) viz + charts per page →
   (4) CI gate. **All 4 phases merged into `main` (PR #1, `6f9b864`, 2026-11-11).**
   The user's task after (4): GitHub → Settings → Secrets → Actions → **`PRIVACY_DENY`** (denied names,
   commas / newlines). Without this secret the `checks` job goes RED at `check:bundle`.
   Partial month (By user page): date X = the `updatedAt` the API returns with each source
   (= `mart.as_of()`), NOT the viewer's machine clock. The source already has this date so no "today"
   fallback is needed; `updatedAt` missing ⇒ write nothing (`monthProgress` returns null).
   Screenshots + capture tools live OUTSIDE the repo: `Desktop/Claude Workspace/Demo-project-shots/`
   (this folder does NOT follow the repo: the user works on MULTIPLE MACHINES, pulling the repo onto a new machine doesn't bring
  the screenshot folder; the old tools `shoot.mjs`, `fontcheck.mjs`… are on the previous machine; the current machine has `tools/period.mjs`).
   The Recharts gate (`bundle-recharts`) walks index.html → initial chunk → STATIC IMPORT closure + every
   modulepreload, identifying the Recharts chunk by CONTENT (`RECHARTS_MARKERS`); the manualChunks case was re-tried ⇒ red.
5. **Phase 5 — MERGED (PR #1, together with phases 1–4):** glossary + ⓘ
   (`src/ui/InfoTip.tsx`, popover portaled to body, glass uses one single shared rule) · About page ·
   "data through …" chip (from `updatedAt`; pages with several sources ⇒ the OLDEST date, `oldestDate`) · the
   "Dữ liệu mẫu" (Sample data) label placed inline in the page flow (not `position: fixed`). `glossary.test.ts` locks: full ja/vi, the labels pointed to really exist in
   the labels migration, every `StatTile`/`ChartCard` in `src/screens/**` has `info=`.
   Unresolved review points (non-blocking, do when convenient):
   - initial chunk 170 → 196 kB because of glossary text. To reduce it, load the glossary TEXT when ⓘ opens (StatTile only
     needs the key), don't split the About page (saves only 4–5 kB);
   - `raw.dataset_meta.timezone = Asia/Ho_Chi_Minh` (`generate.mjs:108`) for a SaaS billing in yen: does not make
     numbers wrong (the data has dates only). Changing to `Asia/Tokyo` = regenerate + reload Supabase;
   - `mart.*` view names are in the public bundle (the glossary's `source` field): fine with sample data,
     remove from the bundle before using real data;
   - churn rates by band in `docs/SCHEMA.md:149-153` differ from the §4 table in this file — reconcile them;
   - the ⓘ of the MRR chart card shows the stat tile's secondary-number explanation line too, while the chart has no such secondary number.
6. **Phase 6 — MONTH FILTER: the user APPROVED, `feat/period-filter` merged into `main`
   (2026-11-11, merged locally because `gh` is not logged in).** Still open: Churn warning page — the filter applies only to the 2
   history charts; a note next to the filter bar could be added if the user wants. The approved plan came with 3 points: (a) ADD flow tiles — New MRR + Invoices (Revenue), New
   users (Users), with glossary `new_mrr`; (b) changing pages ⇒ the filter resets to default (doesn't carry over);
   (c) NO 3/6/12-month quick-pick buttons. Done:
   - `src/data/period.ts` (pure) · query in `src/nav/route.ts` (NOT part of `Route`, because App rebuilds the
     page by `key={toHash(route)}`; changing the filter = `replaceState`) · `src/ui/filters/*` · `src/styles/filters.css`;
   - `src/ui/usePopover.ts`: shared popover behavior + "one panel open" store — `InfoTip` uses it too;
   - `useSource(source, params, enabled)`: a single-month page with `?month=` waits for the month list (from
     `revenue-monthly`) before loading ⇒ exactly 1 request;
   - measurements: 15 files / 94 web tests · initial chunk 196 → 209 kB · browser check
     `Demo-project-shots/tools/period.mjs` 57/57 (screenshots in `Demo-project-shots/out/`).
   Original spec (kept for review):
   - Filter by MONTH only (mart data only goes to month granularity; risk history is weekly). NO day filtering, NO
     edits to `server/`, `supabase/`, `scripts/data`.
   - Built per `docs/ui-kit/01-ARCHITECTURE.md` §6, only the needed parts: FilterBar + month-range picker
     (from – to) + single-month picker. Don't build other patterns, no quarter/year.
   - Revenue, Users: month range, filtered in the browser (the API already returns every month). Default 12 months
     ending at the latest month PRESENT IN THE DATA. Stat tiles: flow (new MRR, invoices, new users…) summed over the
     range; stock (end-of-month MRR, paying companies, end-of-month users) takes the last month of the range; MAU,
     DAU/MAU take the last month. Compared with the previous range of equal length; missing ⇒ "—". Charts + tables follow the range.
   - By user, By company: pick 1 month, passing the API's EXISTING `month` parameter
     (`server/lib/sources.js`). The month list comes from the data, not from the machine clock.
   - Churn warning: the month range applies only to the 2 history charts (a week is filtered by the month containing it); the
     watchlist does not change.
   - Labels name exactly the range being viewed; a range containing a partial month keeps the "as of date X" wording.
   - The filter is stored in the URL hash (e.g. `#/…?from=2026-01&to=2026-11`): F5 + shared links keep it; invalid
     / out-of-data-range values ⇒ back to default, no error.
   - 1 panel open at a time; panels portal to body; Esc closes + focus back to the button; the reset button only shows when different from
     the default.
   - Pure-function tests: summing flow / end-of-period stock, previous range at the data edge, URL parse/serialize with
     garbage values, default month from data. Screenshots 1440/430 × light/dark with a panel open; no horizontal scroll at 430.
7. **Separate TODO — `loaded_at` (NOT done in `feat/about-glossary`):** the chip only says "data through date"
   because the DB doesn't store the load TIME. To get "updated at …": `scripts/data/load.mjs` writes `loaded_at` into
   `raw.dataset_meta` → `mart` exposes it (a SECURITY DEFINER function like `as_of`) → `server/` returns it alongside
   `updatedAt`; the user reloads Supabase + redeploys Vercel.
8. Odds and ends:
   - ambient background of SVG stroke layers (`ribbon.svg`), cursor-following light (`reveal.ts`), staggered reveal
     (`staggerIn.ts`) — requires editing `App.tsx`, not done (the user postponed 2026-11-11);
   - plan names show the CODE when the API hasn't returned labels yet (by design, but could be reconsidered).

## 6. TRAPS already hit — don't step on them again

- **`.gitignore` with `data/` (no `/`) also swallows `src/data/` and `scripts/data/`.** Fixed
  to `/data/`. When adding ignore patterns, anchor them with a leading `/`.
- **`mart.as_of()` must be `SECURITY DEFINER`** (+ `search_path = ''`). Functions called in views run
  with the CALLER's privileges, so without this flag `analytics_reader` errors right at `mart.months`.
  Likewise: for `analytics_reader` to see any `raw` column, it must be copied into a `mart` view/MV
  (done for `full_name` / `company_name` in `user_monthly`).
- **Risk score v1 almost never raised an alert.** It measured "days with nobody logging in" and "users who
  logged in within 28 days", but companies with many users rarely have 7 blank days. v2 measures TREND (28 days
  vs. the previous 28 days) + WAU/seats. When changing thresholds, review the band table that `generate.test.mjs` prints;
  the test fails when the risky band doesn't churn at least 3 times more than the low band.
- **`vitest@2` pulls in its own `vite@5` ⇒ type errors with `vite@6`.** Using `vitest@3`. Vitest only scans
  `src/**`; `supabase/tests` and `server/test` run with `node --test`.
- **postgres.js + Supavisor transaction pooler need `prepare: false`.** `numeric`/`bigint` are parsed
  to number, `date` kept as string (`server/lib/db.js`), to avoid timezone shifts.
- **When generating / editing data, don't use `Math.random()`.** Everything goes through `makeRng(seed)` +
  `fork(label)`; tests lock byte-for-byte reproducibility.
- **The user's Windows machine:**
  - stopping `npm run dev` (background task) does NOT stop the child process `node vite.js`, so the port stays held.
    Find the PID by port and stop exactly that process;
  - Credential Manager used to hold the old GitHub account `Taki-Thai`. This repo has set
    `credential.https://github.com.username Taki2119` locally;
  - `gh` is not logged in (can't view CI from the machine).
- **The desktop app's preview browser can only reach the origin being previewed**, so calling `localhost:3001`
  is refused. Use Vite's `/api` proxy.
- **Supabase sets `statement_timeout` (~2 minutes) for `postgres`**: `mart.refresh()` on the Free
  plan exceeds it. `load.mjs` runs `analyze` on raw and then refreshes inside a transaction with
  `set local statement_timeout = 0`.
- **Supabase changed the Connect UI:** Session / Transaction pooler are in the **Direct** tab
  (*Connection string*) → the Method dropdown.
- **The Claude session's Supabase connector** is logged into a different account (the company org) and can't see
  the `Demo` project: the user runs migrations / SQL themselves in the SQL Editor.
- **Vercel Hobby plan:** use only the production domain (`<name>.vercel.app`). Per-deployment URLs
  are blocked by Vercel Authentication. Region is set to `hnd1` in `server/vercel.json`, must be in the same region as
  Supabase.
- **The local API blocks unknown Origins (`403 forbidden_origin`)**: only accepts `localhost:5180` / `5173`
  (`server/lib/handler.js`). When running `vite preview` for screenshots, use `--port 5180` and build with
  `VITE_API_URL=http://localhost:5180`, into a folder OUTSIDE `dist/`. curl sends no Origin so it still passes
  — don't take curl as proof that the browser can call it.
- **Ports 5180 / 3001 may be held by other processes** (2026-11-11: 5180 = the dev server of ANOTHER
  PROJECT of the user — don't stop it; 3001 = `api-dev.mjs` still running from a previous session, reusable).
  Look up PID + CommandLine before stopping anything; for screenshot previews use 5173 (the API accepts it too).
- **The user works on multiple machines (pulls the repo onto other machines):** anything OUTSIDE the repo doesn't come along —
  `Demo-project-shots/`, `.env`, `node_modules` (run `npm ci`). If missing, rebuild them; don't treat them as "lost".
  Capture tools are rebuilt with `puppeteer-core` + the Chrome already on the machine (no browser download).
  The "Windows machine" traps above (Credential Manager, `gh`…) were written for the old machine — recheck on a new one.
- **Editing files with Python on Windows writes CRLF** (`open(..., 'w')`). The repo uses LF: write with
  `newline=''` or run `sed -i 's/\r$//'` afterwards.
- **Taking 430px screenshots with `chrome --headless --screenshot --window-size=430,…` is WRONG on Windows**:
  the window has a minimum width of ~500px so the page renders at ~500 and is then cropped ⇒ looks like horizontal scroll. Use
  puppeteer `setViewport` and print `innerWidth`/`scrollWidth`.
- **`manualChunks: { recharts: ['recharts'] }` pulls React into the `recharts-*.js` chunk too** ⇒ the initial chunk
  statically `import`s that chunk + `index.html` preloads it: Recharts (573 kB) loads on the very first page, yet
  `grep -c activeTooltipIndex dist/assets/index-*.js` STILL returns 0. Removed; let Rollup split on its own (the
  Recharts chunk is named after one of its own modules, e.g. `nodes-*.js`). Identify the Recharts chunk by CONTENT.
- **`--font-display` (Outfit) has no Vietnamese subset** (Google Fonts only has latin/latin-ext):
  measured for real, ạ ữ ỗ fall back to Segoe UI. Use only for the logo + numbers; `i18n.test.ts` locks the logo to contain no
  accented Latin characters.
- **`scrollIntoView` scrolls EVERY scrollable ancestor, including `overflow: hidden` containers** (the user can't
  scroll them but code can). Bug hit in the Ask AI window: after a few questions the whole `.ask-dock` slid up,
  the title disappeared, the chat frame was pushed up to the middle, the bottom half empty. Fix: scroll exactly `.ask-dock-body` with
  `scrollTo` + `.ask-dock { overflow: clip }`. The `ask.mjs` tool measures that the title / chat frame stick to their edges after
  EVERY answer. Lesson learned too: when reviewing screenshots, check the top of the window as well; older screenshots already had the bug and it was missed.
- **Contrast floor (`markContrast.test.ts`):** the "worst glass background" floor (#e8dbd0 / #543a25) applies ONLY to
  MARKS (≥2:1). TEXT is measured ≥4.5:1 against the text's REAL background (`--surface`, `--pill-flat`…) — `--ink-3`
  on the worst background is only ~3.5:1, and that is not a bug (the user decided 2026-11-11).

## 7. Process

- Personal project, the repo owner is the user. **Commit/push only when the user says so.** Commit messages
  end with a `Co-Authored-By` line per the session's instructions.
- **Repo language is English (user's decision, 2026-11-12):** docs, code comments, test titles and
  developer-facing messages are written in English. Product content stays bilingual ja/vi and is never
  translated: `src/ui/i18n.ts` dictionaries, `mart.labels` / `mart.column_labels` rows, Ask AI phrasings and
  answer templates (`src/ask/q/*.ts`), glossary text, `catalog.ts` names. Quoting a vi/ja UI string in a
  comment is fine; add an English gloss.
- Before reporting "done": run `npm run typecheck`, `npm test`, `npm run build`, and `db:test` /
  `api:test` if SQL or the server was touched. Report the test NUMBERS, not just the word "pass".
- Scan before pushing: no real company name strings, no real emails/phone numbers, no
  `.env`.
