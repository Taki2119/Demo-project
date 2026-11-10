// ─────────────────────────────────────────────────────────────────────────────
// Handler của POST /api/board-data — KHÔNG biết DB thật là gì: nhận một hàm `query(sql, args)`
// (postgres.js trên Vercel, PGlite trong test / dev) nên toàn bộ đường đi test được cục bộ.
// Chỉ dùng res.statusCode / setHeader / end ⇒ chạy được cả trên Vercel lẫn node:http.
// ─────────────────────────────────────────────────────────────────────────────
import { AS_OF_SQL, resolveRequest } from './sources.js';

export const DEFAULT_ORIGINS = ['https://taki2119.github.io', 'http://localhost:5180', 'http://localhost:5173'];

/** 'a,b' → ['a','b']. Origin = scheme + host (+ cổng), KHÔNG có path, KHÔNG có '/' cuối. */
export function originsFromEnv(value) {
  const list = (value ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  return list.length ? list : DEFAULT_ORIGINS;
}

/** Date → 'YYYY-MM-DD' (mart chỉ có kiểu date), bigint → number. */
export function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) out[k] = v.toISOString().slice(0, 10);
    else if (typeof v === 'bigint') out[k] = Number(v);
    else out[k] = v;
  }
  return out;
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  if (payload === undefined) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  return (typeof xff === 'string' ? xff.split(',')[0].trim() : '') || req.socket?.remoteAddress || 'unknown';
}

export function createHandler({ query, allowedOrigins = DEFAULT_ORIGINS, maxBytes = 4_000_000, rateLimitPerMin = 120, log = console.error }) {
  // Giới hạn nhịp THEO INSTANCE (bộ nhớ của một function) — chặn vòng lặp lỡ tay, không phải hàng
  // rào chống tấn công; hàng rào thật là statement_timeout + quyền chỉ đọc ở DB.
  const hits = new Map();
  const limited = (ip) => {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > rateLimitPerMin;
  };

  return async function handler(req, res) {
    const origin = req.headers.origin;
    const allowed = typeof origin === 'string' && allowedOrigins.includes(origin);
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'content-type');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    res.setHeader('Vary', 'Origin');

    // Trình duyệt từ origin lạ ⇒ chặn. Không có Origin (curl, health check) ⇒ cho qua: CORS chỉ là
    // rào của trình duyệt; dữ liệu là dữ liệu tổng hợp và đường này chỉ đọc.
    if (origin && !allowed) return send(res, 403, { error: 'forbidden_origin' });
    if (req.method === 'OPTIONS') return send(res, 204);
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
    if (limited(clientIp(req))) return send(res, 429, { error: 'rate_limited' });

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return send(res, 400, { error: 'bad_json' });
      }
    }

    let reqDef;
    try {
      reqDef = resolveRequest(body);
    } catch (e) {
      return send(res, 400, { error: e instanceof Error ? e.message : 'bad_source' });
    }

    let rows;
    let asOf;
    try {
      const [r, meta] = await Promise.all([query(reqDef.sql, reqDef.args), query(AS_OF_SQL, [])]);
      rows = r;
      asOf = meta[0]?.as_of ?? null;
    } catch (e) {
      log('board-data', reqDef.source, e instanceof Error ? e.message : e);
      return send(res, 502, { error: 'db_error' });
    }

    const payload = JSON.stringify({ source: reqDef.source, updatedAt: asOf, rowCount: rows.length, rows: rows.map(normalizeRow) });
    if (Buffer.byteLength(payload) > maxBytes) return send(res, 413, { error: 'too_large' });
    return send(res, 200, payload);
  };
}
