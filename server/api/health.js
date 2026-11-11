// GET /api/health — quick post-deploy check: can we reach the DB, and up to which date is the data computed.
// Does not return error details to the outside (only logs them).
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
