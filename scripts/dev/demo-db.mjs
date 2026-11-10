// DB demo trong bộ nhớ: PGlite + mọi migration + dữ liệu từ bộ sinh + mart.refresh().
// Dùng cho test API và cho `npm run api:dev` (chạy app end-to-end khi chưa có Supabase).
// ⚠ Chỉ dành cho máy dev — không đi vào server/ (Vercel không cần PGlite).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { toCsv } from '../data/csv.mjs';
import { generate, TABLES } from '../data/generate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function createDemoDb(options = {}) {
  const db = new PGlite();
  await db.exec(`set timezone = 'UTC'`);
  const dir = join(root, 'supabase', 'migrations');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'));
  const data = generate(options);
  for (const [t, cols] of Object.entries(TABLES)) {
    const blob = new Blob([toCsv(cols, data[t].rows)]);
    await db.query(`copy raw.${t} (${cols.join(', ')}) from '/dev/blob' with (format csv, header true)`, [], { blob });
  }
  await db.exec('select mart.refresh()');
  return db;
}

/** Hàm query cùng hình với server/lib/db.js — chạy bằng role analytics_reader như production. */
export async function readerQuery(db) {
  await db.exec('set role analytics_reader');
  return async (text, args) => (await db.query(text, args)).rows;
}
