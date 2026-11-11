# Data API contract — what the web app expects the Vercel side to return

The web app calls only **one** endpoint (`src/data/api.ts`). The Vercel step must build exactly this contract;
if the contract changes, update both sides.

```
POST {VITE_API_URL}/api/board-data
content-type: application/json

{ "source": "<source code>", ...params }
```

Response `200`:

```json
{ "source": "revenue-monthly", "updatedAt": "2026-11-10", "rows": [ { "month": "2026-10-01", "plan_id": "growth", "mrr_end": 1234000 } ] }
```

- `rows` is an array of objects, keys = the **English column names** of the `mart` view. Postgres `numeric` values
  may be returned as strings, because the client coerces them (`numericRows`).
- `updatedAt` = `mart.as_of()`.
- Also returns `rowCount`. Dates are `YYYY-MM-DD` strings; numbers are numbers.
- Errors:

| Code | When |
|---|---|
| `400 bad_json` | body can't be parsed |
| `400 bad_source` | unknown source code |
| `400 bad_params` | malformed params, or unknown keys |
| `403 forbidden_origin` | origin not in the list |
| `405` | not `POST` |
| `413 too_large` | response exceeds the size cap |
| `429 rate_limited` | called too often |
| `502 db_error` | DB error; details go to the log only |

  On error, the client shows "couldn't load data" and draws nothing.
- Code: `server/lib/sources.js` (registry) · `server/lib/handler.js`. Deployment:
  [`server/README.md`](../server/README.md).
- CORS: only the GitHub Pages origin (and `http://localhost:5180` during development).

| `source` | View | Params | Notes |
|---|---|---|---|
| `revenue-monthly` | `mart.revenue_monthly` | — | every month × every plan; the client rolls up "all plans" itself |
| `users-monthly` | `mart.users_monthly` | — | same as above |
| `user-monthly` | `mart.user_monthly` | `plan?`, `month?` | many rows ⇒ filtered on the server; without `month` takes the latest month |
| `company-monthly` | `mart.company_monthly` | `plan?`, `month?` | same as above |
| `churn-watchlist` | `mart.churn_watchlist` | — | latest snapshot |
| `churn-history` | `mart.churn_risk_snapshot` | — | 52 weeks, for the accuracy table |
| `interventions-monthly` | `mart.interventions_monthly` | — | |
| `labels` | `mart.labels` | — | ja/vi labels of coded values |
| `column-labels` | `mart.column_labels` | — | ja/vi labels + units of columns |

The **Ask AI** window (demo version) has no endpoint of its own. It reuses exactly the sources in the table
above (`src/ask/q/*.ts` → `needs`) and shares the client cache with the boards.

⚠ **SQL is fixed per `source` on the server side**, the client does not send SQL. Params go through
placeholders, never string concatenation. The server runs as role `analytics_reader` (read-only, `mart` only).
