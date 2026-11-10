// Kết nối Postgres thật (Supabase) — CHỈ dùng trên Vercel. Một client mỗi instance, dùng lại
// giữa các lượt gọi.
//
// DATABASE_URL = chuỗi Transaction pooler của Supabase (cổng 6543), user
// `analytics_reader.<project-ref>` — xem server/README.md. `prepare: false` là BẮT BUỘC với
// transaction pooler (Supavisor không giữ prepared statement giữa các giao dịch).
import postgres from 'postgres';

let sql = null;

export function getQuery() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL chưa đặt');
    sql = postgres(url, {
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      types: {
        // numeric (yên, tỉ lệ) + bigint (count) ⇒ number; yên là số nguyên < 2^53 nên không mất số.
        num: { to: 1700, from: [1700, 20], serialize: String, parse: Number },
        // date ⇒ giữ nguyên chuỗi 'YYYY-MM-DD', không đi qua Date (tránh lệch múi giờ).
        day: { to: 1082, from: [1082], serialize: (x) => x, parse: (x) => x },
      },
    });
  }
  return (text, args) => sql.unsafe(text, args);
}
