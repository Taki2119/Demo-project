// The whole POST /api/board-data path on PGlite with generated data, run as the
// analytics_reader role (same rights as production): every source runs, parameters are validated, CORS, errors.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoDb, readerQuery } from '../../scripts/dev/demo-db.mjs';
import { createHandler, originsFromEnv } from '../lib/handler.js';
import { resolveRequest, SOURCES } from '../lib/sources.js';

let db;
let handler;
const ORIGIN = 'http://localhost:5180';

function call(body, { method = 'POST', origin = ORIGIN, h = handler } = {}) {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      statusCode: 0,
      setHeader: (k, v) => (headers[k.toLowerCase()] = v),
      end: (b) => resolve({ status: res.statusCode, headers, json: b ? JSON.parse(b) : null }),
    };
    h({ method, headers: origin ? { origin } : {}, body, socket: { remoteAddress: '127.0.0.1' } }, res);
  });
}

before(async () => {
  db = await createDemoDb({ seed: 'api-test', asOf: '2026-11-10', months: 8, arrivalsPerMonth: 6 });
  handler = createHandler({ query: await readerQuery(db), allowedOrigins: [ORIGIN], log: () => {} });
});
after(async () => db?.close());

test('every source in the registry runs as analytics_reader and returns the right shape', async () => {
  for (const source of Object.keys(SOURCES)) {
    const r = await call({ source });
    assert.equal(r.status, 200, `${source}: ${JSON.stringify(r.json)}`);
    assert.equal(r.json.source, source);
    assert.equal(r.json.updatedAt, '2026-11-10');
    assert.ok(Array.isArray(r.json.rows) && r.json.rows.length > 0, `${source} is empty`);
    assert.equal(r.json.rowCount, r.json.rows.length);
  }
});

test('dates come out as YYYY-MM-DD strings, contract columns are present', async () => {
  const r = await call({ source: 'revenue-monthly' });
  const row = r.json.rows[0];
  assert.match(row.month, /^\d{4}-\d{2}-01$/);
  for (const c of ['plan_id', 'mrr_end', 'paying_companies', 'new_mrr', 'churned_mrr', 'is_closed']) assert.ok(c in row, c);
  const u = await call({ source: 'user-monthly' });
  for (const c of ['full_name', 'company_name', 'plan_id', 'active_days']) assert.ok(c in u.json.rows[0], c);
});

test('plan + month parameters filter correctly; default is the latest month', async () => {
  const all = await call({ source: 'company-monthly' });
  const months = new Set(all.json.rows.map((r) => r.month));
  assert.deepEqual([...months], ['2026-11-01']);
  const growth = await call({ source: 'company-monthly', plan: 'growth', month: '2026-08' });
  assert.equal(growth.status, 200);
  assert.ok(growth.json.rows.length > 0);
  assert.ok(growth.json.rows.every((r) => r.plan_id === 'growth' && r.month === '2026-08-01'));
});

test('bad parameters / unknown source / unknown key ⇒ 400, DB not touched', async () => {
  assert.equal((await call({ source: 'nope' })).json.error, 'bad_source');
  assert.equal((await call({ source: 'company-monthly', month: '2026-13' })).json.error, 'bad_params');
  assert.equal((await call({ source: 'company-monthly', plan: "x'; drop table" })).json.error, 'bad_params');
  assert.equal((await call({ source: 'revenue-monthly', sql: 'select 1' })).json.error, 'bad_params');
  assert.equal((await call('{not json')).json.error, 'bad_json');
  assert.throws(() => resolveRequest(null), /bad_source/);
});

test('CORS: allowed origin is echoed; unknown origin ⇒ 403; preflight 204; GET ⇒ 405', async () => {
  const ok = await call({ source: 'labels' });
  assert.equal(ok.headers['access-control-allow-origin'], ORIGIN);
  const bad = await call({ source: 'labels' }, { origin: 'https://evil.example' });
  assert.equal(bad.status, 403);
  assert.equal(bad.headers['access-control-allow-origin'], undefined);
  assert.equal((await call(undefined, { method: 'OPTIONS' })).status, 204);
  assert.equal((await call(undefined, { method: 'GET' })).status, 405);
  const noOrigin = await call({ source: 'labels' }, { origin: null });
  assert.equal(noOrigin.status, 200);
});

test('response too large ⇒ 413; DB error ⇒ 502 without leaking details', async () => {
  const tiny = createHandler({ query: await readerQuery(db), allowedOrigins: [ORIGIN], maxBytes: 100, log: () => {} });
  assert.equal((await call({ source: 'labels' }, { h: tiny })).status, 413);
  const broken = createHandler({ query: async () => { throw new Error('secret detail'); }, allowedOrigins: [ORIGIN], log: () => {} });
  const r = await call({ source: 'labels' }, { h: broken });
  assert.deepEqual([r.status, r.json], [502, { error: 'db_error' }]);
});

test('originsFromEnv drops the trailing "/", empty ⇒ default', () => {
  assert.deepEqual(originsFromEnv(' https://a.example/ , http://localhost:5180 '), ['https://a.example', 'http://localhost:5180']);
  assert.ok(originsFromEnv('').includes('https://taki2119.github.io'));
});
