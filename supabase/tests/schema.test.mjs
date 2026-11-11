// Runs all the migrations on PGlite (Postgres compiled to WASM, no server to install) with a
// SMALL scenario whose answers were computed by hand, then compares every number in the mart.
//   npm run db:test
//
// Scenario (as_of = 2026-06-15):
//   A: starter 100 from 01-10 → upgrade to growth 300 from 03-05 → cancel scheduled 05-01, churn effective 05-20.
//      Stops using from 04-01 (risk signal).
//   B: growth 200 from 02-01 → downgrade to starter 80 from 04-01. Uses it every day.
//   C: starter 50 from 01-01, churns 02-15 → comes back on starter 60 from 04-10 (reactivation).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, '..', 'migrations');
let db;

const FIXTURE = `
insert into raw.dataset_meta values ('as_of_date', '2026-06-15'), ('seed', 'test');
insert into raw.plans (plan_id, name, tier, base_price, seat_price, included_seats) values
  ('starter', 'Starter', 1, 20, 10, 3), ('growth', 'Growth', 2, 100, 20, 5), ('scale', 'Scale', 3, 400, 30, 20);
insert into raw.features values ('reports', 'Reports', true, 1), ('chat', 'Chat', false, 1);
insert into raw.staff values ('ST1', 'Test Owner', 'cs');
insert into raw.companies values
  ('A', 'Alpha Test', 'retail', 'north', '11-50', 'inbound', 'ST1', '2026-01-10'),
  ('B', 'Beta Test', 'finance', 'south', '51-200', 'partner', 'ST1', '2026-02-01'),
  ('C', 'Gamma Test', 'education', 'central', '1-10', 'self_serve', 'ST1', '2026-01-01');
insert into raw.users values
  ('U1', 'A', 'User One', 'u1@example.com', 'owner', '2026-01-10', null),
  ('U2', 'A', 'User Two', 'u2@example.com', 'member', '2026-01-10', null),
  ('U3', 'B', 'User Three', 'u3@example.com', 'owner', '2026-02-01', null),
  ('U4', 'C', 'User Four', 'u4@example.com', 'owner', '2026-01-01', '2026-02-15');
insert into raw.subscriptions values
  ('SA', 'A', '2026-01-10', null, '2026-05-20'),
  ('SB', 'B', '2026-02-01', null, null),
  ('SC1', 'C', '2026-01-01', null, '2026-02-15'),
  ('SC2', 'C', '2026-04-10', null, null);
insert into raw.subscription_periods values
  ('SA', '2026-01-10', '2026-03-05', 'starter', 5, 100),
  ('SA', '2026-03-05', '2026-05-20', 'growth', 5, 300),
  ('SB', '2026-02-01', '2026-04-01', 'growth', 4, 200),
  ('SB', '2026-04-01', null, 'starter', 4, 80),
  ('SC1', '2026-01-01', '2026-02-15', 'starter', 2, 50),
  ('SC2', '2026-04-10', null, 'starter', 2, 60);
insert into raw.cancel_requests values ('R1', 'SA', '2026-05-01', '2026-05-20', 'low_usage', null);
insert into raw.invoices values
  ('I1', 'SB', 'B', 'growth', '2026-02-01', 200, 'paid', '2026-02-01', '2026-02-15', '2026-02-10');
insert into raw.user_activity_daily
  select d, 'U1', 'A', 1, 30 from generate_series('2026-01-10'::timestamp, '2026-03-31', '1 day') d
  union all select d, 'U3', 'B', 2, 45 from generate_series('2026-02-01'::timestamp, '2026-06-15', '1 day') d
  union all select d, 'U4', 'C', 1, 10 from generate_series('2026-01-01'::timestamp, '2026-02-14', '1 day') d;
insert into raw.feature_usage_daily
  select d, 'A', 'reports', 3, 1 from generate_series('2026-01-10'::timestamp, '2026-03-31', '1 day') d
  union all select d, 'B', 'reports', 5, 1 from generate_series('2026-02-01'::timestamp, '2026-06-15', '1 day') d;
insert into raw.interventions values ('IV1', 'A', 'ST1', '2026-05-02', 'cancel_request', 'call', 'churned', '2026-05-20');
select mart.refresh();
`;

async function rows(sql, params) {
  return (await db.query(sql, params)).rows;
}

before(async () => {
  db = new PGlite();
  await db.exec(`set timezone = 'UTC'`);
  for (const f of readdirSync(migrations).filter((n) => n.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrations, f), 'utf8'));
  }
  await db.exec(FIXTURE);
});

after(async () => db?.close());

test('every quality rule has 0 failed rows', async () => {
  const bad = await rows(`select check_name, failed_rows from mart.dq_checks where failed_rows <> 0`);
  assert.deepEqual(bad, []);
  const all = await rows(`select count(*)::int as n from mart.dq_checks`);
  assert.equal(all[0].n, 5);
});

test('revenue_monthly: stock + movements per plan match the hand-computed answers', async () => {
  const r = await rows(`
    select to_char(month, 'YYYY-MM') as m, plan_id,
           mrr_end::float as mrr, new_mrr::float as new, reactivation_mrr::float as react,
           churned_mrr::float as churn, plan_in_mrr::float as pin, plan_out_mrr::float as pout,
           paying_companies::int as paying
    from mart.revenue_monthly where plan_id <> 'scale' order by month, plan_id`);
  const at = (m, p) => r.find((x) => x.m === m && x.plan_id === p);
  assert.equal(r.length, 12, '6 months × 2 plans (DENSE table)');
  assert.deepEqual(at('2026-01', 'starter'), { m: '2026-01', plan_id: 'starter', mrr: 150, new: 150, react: 0, churn: 0, pin: 0, pout: 0, paying: 2 });
  assert.equal(at('2026-02', 'starter').churn, -50);
  assert.equal(at('2026-02', 'growth').new, 200);
  // Upgrade in March: leaves starter, enters growth — not churn + new.
  assert.equal(at('2026-03', 'starter').pout, -100);
  assert.equal(at('2026-03', 'starter').mrr, 0);
  assert.equal(at('2026-03', 'growth').pin, 300);
  assert.equal(at('2026-03', 'growth').mrr, 500);
  // April: B downgrades (enters starter 80), C comes back (reactivation 60, NOT new).
  assert.equal(at('2026-04', 'starter').pin, 80);
  assert.equal(at('2026-04', 'starter').react, 60);
  assert.equal(at('2026-04', 'starter').new, 0);
  assert.equal(at('2026-04', 'starter').mrr, 140);
  assert.equal(at('2026-04', 'growth').pout, -200);
  assert.equal(at('2026-05', 'growth').churn, -300);
  assert.equal(at('2026-05', 'growth').mrr, 0);
  assert.equal(at('2026-06', 'starter').mrr, 140);
});

test('the running month is measured up to as_of and is not closed', async () => {
  const [jun] = await rows(`select measure_date::text as d, is_closed from mart.months where month = '2026-06-01'`);
  assert.deepEqual(jun, { d: '2026-06-15', is_closed: false });
});

test('users_monthly: seats, deactivated seats, MAU per plan', async () => {
  const r = await rows(`
    select plan_id, seat_users_end::int as seats, new_users::int as new,
           deactivated_users::int as deact, mau::int as mau, days_in_period::int as days
    from mart.users_monthly where month = '2026-02-01' and plan_id in ('starter', 'growth') order by plan_id`);
  assert.deepEqual(r, [
    { plan_id: 'growth', seats: 1, new: 1, deact: 0, mau: 1, days: 28 },
    // starter in February = A (U1 active, U2 not) + C (U4 deactivated 02-15, still active during the month).
    { plan_id: 'starter', seats: 2, new: 0, deact: 1, mau: 2, days: 28 },
  ]);
});

test('churn_risk_snapshot: A stops using → high, then cancel scheduled → cancel_scheduled', async () => {
  const a = await rows(`
    select snapshot_date::text as d, risk_score::int as score, risk_band as band, top_reason,
           churned_within_90d as label
    from mart.churn_risk_snapshot where company_id = 'A' order by snapshot_date`);
  const on = (d) => a.find((x) => x.d === d);
  assert.equal(on('2026-04-26').band, 'high');
  // 40 (26 days with nobody logged in) + 20 (WAU 0/5 seats) + 30 (key features down 93%) = 90
  assert.equal(on('2026-04-26').score, 90);
  assert.equal(on('2026-04-26').top_reason, 'usage_drop');
  // 03-01 still in regular use: only 10 points because WAU 1/5 seats (< 40%).
  assert.equal(on('2026-03-01').score, 10);
  assert.equal(on('2026-05-03').band, 'cancel_scheduled');
  assert.equal(on('2026-03-01').label, true); // churn on 05-20 falls within 90 days after 03-01
  assert.equal(on('2026-03-01').band, 'low');
  assert.equal(on('2026-05-24'), undefined, 'once churned, no longer in the snapshot');
  const [b] = await rows(`select risk_band, risk_score::int as score, churned_within_90d as label
                          from mart.churn_risk_snapshot where company_id = 'B' and snapshot_date = '2026-06-14'`);
  assert.deepEqual(b, { risk_band: 'low', score: 10, label: null }); // WAU 1/4 seats
});

test('churn_watchlist takes only the latest snapshot', async () => {
  const r = await rows(`select distinct snapshot_date::text as d from mart.churn_watchlist`);
  assert.deepEqual(r, [{ d: '2026-06-14' }]);
});

test('analytics_reader: can read mart, CANNOT read raw, CANNOT write', async () => {
  await db.exec(`set role analytics_reader; set default_transaction_read_only = on;`);
  try {
    const r = await rows(`select count(*)::int as n from mart.revenue_monthly`);
    assert.ok(r[0].n > 0);
    await assert.rejects(db.query(`select * from raw.users`), /permission denied/);
    await assert.rejects(db.query(`create table mart.x (a int)`), /read-only|permission denied/);
  } finally {
    await db.exec(`reset role; set default_transaction_read_only = off;`);
  }
});
