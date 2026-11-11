# API (Vercel) — deployment

A **separate** Vercel project, Root Directory = `server/` (so Vercel doesn't build the Vite app at the repo
root). Two endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/board-data` | the web app's only data read path — contract in [`../docs/API.md`](../docs/API.md) |
| `GET /api/health` | post-deploy check: `{ ok, asOf }` |

## 1. Supabase — once

1. Run the 4 migrations in `supabase/migrations/` in order (SQL editor, or `supabase db push`).
2. Set a password for the read-only role (SQL editor; do **not** paste the password into the repo or into chat):
   ```sql
   alter role analytics_reader with login password '<strong password>';
   ```
3. Load data from your machine: `npm run data:generate && npm run data:load` (needs the `DATABASE_URL` of
   user `postgres` in `.env`, see `docs/SCHEMA.md` §8).

## 2. Vercel — create the project

1. *Add New → Project* → choose repo `Demo-project` → **Root Directory = `server`**.
   Framework Preset: *Other*. No build command.
2. *Settings → Environment Variables* (Production):

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler** string (port **6543**), user `analytics_reader.<project-ref>` | *Supabase → Connect → Transaction pooler*. Mark as **Sensitive** |
| `ALLOWED_ORIGINS` | `https://taki2119.github.io` | multiple origins separated by commas; NO path, NO trailing `/`. Empty ⇒ default (Pages + localhost) |
| `MAX_RESPONSE_BYTES` | (optional) | default 4,000,000 |

3. *Region*: `vercel.json` sets `hnd1` (Tokyo). **Choose the same region as the Supabase project** (e.g.
   Supabase `ap-northeast-1` ⇒ `hnd1`; `ap-southeast-1` ⇒ `sin1`), otherwise every query will take a detour
   through another region.
4. Deploy, then check:
   ```bash
   curl https://<project>.vercel.app/api/health
   curl -X POST -H "content-type: application/json" -d '{"source":"labels"}' https://<project>.vercel.app/api/board-data
   ```

## 3. Connect the web app

GitHub repo → *Settings → Secrets and variables → Actions → **Variables*** → `VITE_API_URL` =
`https://<project>.vercel.app` (no trailing `/`). This is not a secret: it ends up in the bundle.
Pushing to `main` ⇒ `deploy.yml` rebuilds with this variable.

## Running locally (no Supabase needed)

```bash
npm run api:dev                                   # in-memory demo DB (PGlite) — ~1–2 minutes to build
VITE_API_URL=http://localhost:3001 npm run dev    # the app reads the local API
npm run api:dev -- --supabase                     # or: connect to the real DATABASE_URL in .env
npm run api:test                                  # test the whole handler on PGlite, as role analytics_reader
```

## Why it is safe without login

The data is synthetic, and this path is **read-only**. There are 4 layers of protection:

| Layer | Guards against |
|---|---|
| SQL fixed per `source` | the client sends no SQL; params go through placeholders and are type-checked |
| Role `analytics_reader` | only `SELECT` on `mart`, READ ONLY transactions, `statement_timeout = 15s` |
| Response size cap | 413 when exceeded |
| Rate limit | 120 requests / minute / IP / instance |

CORS only blocks browsers from unknown origins, not `curl`. Don't treat it as a barrier.
