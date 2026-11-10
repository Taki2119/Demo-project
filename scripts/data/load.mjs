// Nạp CSV (từ data:generate) vào Supabase: XOÁ SẠCH tầng raw rồi COPY lại, làm mới mart, in
// kết quả dq_checks. Toàn bộ phần raw chạy trong MỘT giao dịch — lỗi giữa chừng thì DB giữ
// nguyên bộ cũ.
//
//   DATABASE_URL=postgresql://postgres.<ref>:<mật khẩu>@<host>:5432/postgres npm run data:load
//
// ⚠ Dùng chuỗi kết nối SESSION (cổng 5432, user `postgres`) — cần quyền ghi raw + chạy
//   mart.refresh(). KHÔNG dùng `analytics_reader` (chỉ đọc) và KHÔNG commit chuỗi này.
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import postgres from 'postgres';
import { TABLES } from './generate.mjs';

const { values } = parseArgs({ options: { dir: { type: 'string', default: 'data/out' } } });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Thiếu DATABASE_URL (đặt trong .env hoặc biến môi trường — xem docs/SCHEMA.md §8).');
  process.exit(1);
}
for (const t of Object.keys(TABLES)) {
  if (!existsSync(join(values.dir, `${t}.csv`))) {
    console.error(`Không thấy ${t}.csv trong ${values.dir} — chạy npm run data:generate trước.`);
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
  await sql`select mart.refresh()`;
  const dq = await sql`select check_name, failed_rows::int as failed_rows from mart.dq_checks`;
  const bad = dq.filter((r) => r.failed_rows !== 0);
  console.log(`Nạp xong trong ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  for (const r of dq) console.log(`  ${r.failed_rows === 0 ? '✔' : '✖'} ${r.check_name}: ${r.failed_rows}`);
  if (bad.length) process.exitCode = 2;
} finally {
  await sql.end();
}
