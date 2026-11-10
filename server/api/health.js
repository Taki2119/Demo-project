// GET /api/health — kiểm nhanh sau deploy: kết nối được DB chưa, dữ liệu tính tới ngày nào.
// Không trả chi tiết lỗi ra ngoài (chỉ ghi log).
import { getQuery } from '../lib/db.js';

export default async function health(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const rows = await getQuery()('select mart.as_of()::text as as_of', []);
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, asOf: rows[0]?.as_of ?? null }));
  } catch (e) {
    console.error('health', e instanceof Error ? e.message : e);
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false }));
  }
}
