// Real Postgres connection (Supabase) — used ONLY on Vercel. One client per instance, reused
// across invocations.
//
// DATABASE_URL = Supabase's Transaction pooler string (port 6543), user
// `analytics_reader.<project-ref>` — see server/README.md. `prepare: false` is MANDATORY with the
// transaction pooler (Supavisor doesn't keep prepared statements across transactions).
import postgres from 'postgres';

let sql = null;

export function getQuery() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    sql = postgres(url, {
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      types: {
        // numeric (yen, ratios) + bigint (count) ⇒ number; yen are integers < 2^53 so no precision is lost.
        num: { to: 1700, from: [1700, 20], serialize: String, parse: Number },
        // date ⇒ keep the 'YYYY-MM-DD' string as is, don't go through Date (avoids timezone shifts).
        day: { to: 1082, from: [1082], serialize: (x) => x, parse: (x) => x },
      },
    });
  }
  return (text, args) => sql.unsafe(text, args);
}
