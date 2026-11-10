// API chạy CỤC BỘ, cùng handler với Vercel:
//   npm run api:dev                  → DB demo trong bộ nhớ (PGlite + dữ liệu sinh), không cần Supabase
//   npm run api:dev -- --supabase    → nối DATABASE_URL thật (đọc từ .env)
// Rồi chạy web app với:  VITE_API_URL=http://localhost:3001 npm run dev
import { createServer } from 'node:http';
import { parseArgs } from 'node:util';
import { createHandler } from '../../server/lib/handler.js';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '3001' },
    supabase: { type: 'boolean', default: false },
    months: { type: 'string', default: '24' },
  },
});

let query;
if (values.supabase) {
  const { getQuery } = await import('../../server/lib/db.js');
  query = getQuery();
  console.log('API dev → Supabase (DATABASE_URL)');
} else {
  const { createDemoDb, readerQuery } = await import('./demo-db.mjs');
  const t0 = Date.now();
  console.log('Đang dựng DB demo trong bộ nhớ (PGlite)…');
  const db = await createDemoDb({ months: Number(values.months) });
  query = await readerQuery(db);
  console.log(`DB demo sẵn sàng sau ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

const boardData = createHandler({ query });

createServer((req, res) => {
  if (req.url !== '/api/board-data') {
    res.statusCode = 404;
    return res.end();
  }
  let raw = '';
  req.on('data', (c) => {
    raw += c;
    if (raw.length > 64_000) req.destroy();
  });
  req.on('end', () => {
    req.body = raw;
    boardData(req, res);
  });
}).listen(Number(values.port), () => console.log(`API dev: http://localhost:${values.port}/api/board-data`));
