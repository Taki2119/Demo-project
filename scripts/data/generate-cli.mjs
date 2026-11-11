// Generate the dataset as CSV (one file per raw table) + print a summary for eyeballing.
//   npm run data:generate                       (defaults: seed demo-2026, as_of 2026-11-10, 24 months)
//   npm run data:generate -- --seed abc --as-of 2026-12-31 --months 18 --out data/out
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { toCsv } from './csv.mjs';
import { DEFAULTS, generate } from './generate.mjs';

const { values } = parseArgs({
  options: {
    seed: { type: 'string' },
    'as-of': { type: 'string' },
    months: { type: 'string' },
    arrivals: { type: 'string' },
    out: { type: 'string', default: 'data/out' },
  },
});

const opts = {
  seed: values.seed ?? DEFAULTS.seed,
  asOf: values['as-of'] ?? DEFAULTS.asOf,
  months: values.months ? Number(values.months) : DEFAULTS.months,
  arrivalsPerMonth: values.arrivals ? Number(values.arrivals) : DEFAULTS.arrivalsPerMonth,
};

const t0 = Date.now();
const tables = generate(opts);
mkdirSync(values.out, { recursive: true });
let bytes = 0;
for (const [name, { columns, rows }] of Object.entries(tables)) {
  const csv = toCsv(columns, rows);
  bytes += Buffer.byteLength(csv);
  writeFileSync(join(values.out, `${name}.csv`), csv);
}

const count = (t) => tables[t].rows.length;
console.log(`seed=${opts.seed} as_of=${opts.asOf} months=${opts.months} → ${values.out}  (${((Date.now() - t0) / 1000).toFixed(1)}s, ${(bytes / 1e6).toFixed(1)} MB)`);
for (const t of Object.keys(tables)) console.log(`  ${t.padEnd(22)} ${String(count(t)).padStart(9)}`);

// Quick summary — for sanity checks only; the official numbers are in the mart.
const subs = tables.subscriptions.rows;
const canceled = subs.filter((r) => r[4] != null).length;
const open = tables.subscription_periods.rows.filter((r) => r[2] == null);
const mrr = open.reduce((s, r) => s + r[5], 0);
const reqOpen = tables.cancel_requests.rows.filter((r) => r[5] == null && r[3] > opts.asOf).length;
console.log(`  current MRR ≈ ¥${mrr.toLocaleString('ja-JP')} · ${open.filter((r) => r[5] > 0).length} paying subscriptions · ${canceled}/${subs.length} subscriptions ended · ${reqOpen} open cancel scheduled requests`);
