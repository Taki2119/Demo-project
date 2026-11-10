// POST /api/board-data — đường đọc dữ liệu duy nhất của web app. Hợp đồng: docs/API.md.
import { getQuery } from '../lib/db.js';
import { createHandler, originsFromEnv } from '../lib/handler.js';

export default createHandler({
  query: (text, args) => getQuery()(text, args),
  allowedOrigins: originsFromEnv(process.env.ALLOWED_ORIGINS),
  maxBytes: Number(process.env.MAX_RESPONSE_BYTES) || 4_000_000,
});
