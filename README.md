# SaaS Analytics Demo

A personal project: an analytics dashboard for a **simulated** SaaS. The data is fully synthetic
(company names, people's names and emails are all randomly generated). The UI has two languages,
Japanese and Vietnamese, switched with a button in the side panel. The currency is Japanese yen.

| Part | Technology | Status |
|---|---|---|
| Data | Supabase (Postgres), `raw` → `mart` | ✅ schema + data generator |
| Web app | Vite + React 18 + TypeScript, GitHub Pages | ✅ shell: navigation · ja/vi · data layer · empty pages |
| API | Vercel (`server/`, separate project) | ✅ `POST /api/board-data` + `GET /api/health`. Contract in [`docs/API.md`](docs/API.md), deployment in [`server/README.md`](server/README.md) |
| Design, charts | per [`docs/ui-kit/`](docs/ui-kit/README.md), Recharts 2 (lazy-loaded) | ✅ |
| Ask AI | **demo version**: chat window (top-right button, every screen), sample questions + approximate matching, does NOT call a real AI | ✅ see section below |

```bash
npm install
npm run dev              # http://localhost:5173/Demo-project/
npm run typecheck && npm test && npm run build
npm run db:test          # migrations + generator on Postgres WASM (PGlite)
npm run api:test         # the whole API on PGlite, using the read-only role
npm run api:dev          # local API with an in-memory demo DB → VITE_API_URL=http://localhost:3001 npm run dev
npm run data:generate    # → data/out/*.csv
npm run data:load        # needs DATABASE_URL in .env — see docs/SCHEMA.md §8
```

Build-time variables: `VITE_API_URL` (API root on Vercel; leave empty and the app runs without data),
`VITE_BASE_PATH` (default `/Demo-project/`).

## `src/` structure

| Folder | Purpose |
|---|---|
| `nav/` | `catalog.ts`: ONE source for the page tree · `route.ts`: hash router |
| `data/` | `api.ts`: the only read path · `labels.ts`: ja/vi labels from the DB · `metrics.ts`: ratio formulas · `rollup.ts`: plan rollup · `churn.ts` · `period.ts`: month filter · `glossary.ts`: metric explanations |
| `ask/` | Ask AI demo: `match.ts` (matching) · `q/*.ts` (37 sample questions) · `questions.ts` · `chat.ts` |
| `ui/` | `i18n.ts`: ja/vi UI text · `format.ts`: numbers / yen / months · `parts.tsx` · `viz/` (charts) · `filters/` · `ask/` (Ask AI button + chat window) |
| `screens/` | Sidebar · Home · Board (4 boards × 4 plans) · Early churn warning · About |

**Two rules:**
- No sample numbers in the bundle: without an API every page says plainly that there is no data yet.
- **UI** text lives in `ui/i18n.ts`; **data** text (column names, plan names, industries…) comes from
  `mart.labels` / `mart.column_labels`.

Data design, metric formulas, churn risk score: [`docs/SCHEMA.md`](docs/SCHEMA.md).

## Ask AI — demo version

The **Ask AI** button in the top-right corner, present on every screen, opens a chat window. On desktop the window
floats next to the current page; at ≤640px it covers the full screen. The conversation persists across page
changes.

This window **does not call any AI**: no Claude CLI, no API key, no new endpoint.
The window says so clearly (a "Demo" chip + a note on open).

1. The user types a question, in Japanese or Vietnamese, with or without diacritics.
   - While typing: shows up to 3 nearest sample questions (↑↓ to select, Enter to ask, Tab to fill the input).
   - Empty input: shows 3 suggested questions. The full sample-question list is NOT displayed.
2. `src/ask/match.ts` matches that question **approximately** against the 37 sample questions:
   - Vietnamese is compared by word;
   - Japanese is compared by character pairs;
   - words that every question has carry little weight.

   It also recognizes a plan parameter ("gói Tăng trưởng", "グロース") and top N ("top 5", "上位20社").
3. Close enough ⇒ answers the nearest sample question, plus 3 related questions. Not close enough ⇒ only suggests 4 questions.
4. Numbers come from the **existing** sources of `POST /api/board-data`, so they match the dashboard. Answers
   are pure functions of the data and the language (`src/ask/q/*.ts`); ratios are computed with
   `src/data/metrics.ts`. Every answer has a "data used and how it is calculated" section.

**Adding a question:**
- Add an entry to `src/ask/q/<group>.ts`, with: ≥ 2 phrasings per language, `needs`, `build`,
  `related`.
- `npm test` will check:
  - every phrasing matches back to that exact question;
  - the answer builds in both ja and vi;
  - no `undefined`/`NaN`;
  - empty data returns `null`.
- If a differently worded question misses, add phrasings or keywords to the sample question. Don't lower the
  `ANSWER_MIN` threshold.
