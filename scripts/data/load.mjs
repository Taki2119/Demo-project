// Load the CSVs (from data:generate) into Supabase: WIPE the raw layer then COPY again, refresh the mart,
// print the dq_checks results. The whole raw part runs in ONE transaction — if it fails midway, the DB
// keeps the old set.
//
//   DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres npm run data:load
//
// ⚠ Use the SESSION connection string (port 5432, user `postgres`) — it needs privileges to write raw + run
//   mart.refresh(). Do NOT use `analytics_reader` (read-only) and do NOT commit this string.
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import postgres from 'postgres';
import { TABLES } from './generate.mjs';

const { values } = parseArgs({ options: { dir: { type: 'string', default: 'data/out' } } });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL (set it in .env or an environment variable — see docs/SCHEMA.md §8).');
  process.exit(1);
}
for (const t of Object.keys(TABLES)) {
  if (!existsSync(join(values.dir, `${t}.csv`))) {
    console.error(`${t}.csv not found in ${values.dir} — run npm run data:generate first.`);
    process.exit(1);
  }
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  const t0 = Date.now();
  await sql.begin(async (tx) => {
    await tx.unsafe(`truncate ${Object.keys(TABLES).map((t) => `raw.${t}`).join(', ')}`);
    for (const [t, cols] of Object.entries(TABLES)) {
      const w = await tx.unsafe(`copy raw.${t} (${cols.join(', ')}) from stdin with (format csv, header true)`).writable();
      await pipeline(createReadStream(join(values.dir, `${t}.csv`)), w);
      const [{ n }] = await tx.unsafe(`select count(*)::int as n from raw.${t}`);
      console.log(`  raw.${t.padEnd(22)} ${String(n).padStart(9)}`);
    }
  });
  // Freshly COPYed tables have no statistics ⇒ the planner picks bad plans. Supabase also sets
  // statement_timeout (~2 minutes) for `postgres`; refreshing MVs on the Free plan can take longer,
  // so the limit is lifted ONLY inside this transaction.
  await sql.unsafe(`analyze ${Object.keys(TABLES).map((t) => `raw.${t}`).join(', ')}`);
  await sql.begin(async (tx) => {
    await tx`set local statement_timeout = 0`;
    await tx`select mart.refresh()`;
  });
  const dq = await sql`select check_name, failed_rows::int as failed_rows from mart.dq_checks`;
  const bad = dq.filter((r) => r.failed_rows !== 0);
  console.log(`Load finished in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  for (const r of dq) console.log(`  ${r.failed_rows === 0 ? '✔' : '✖'} ${r.check_name}: ${r.failed_rows}`);
  if (bad.length) process.exitCode = 2;
} finally {
  await sql.end();
}
