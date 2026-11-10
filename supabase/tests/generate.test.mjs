// Bộ sinh dữ liệu → CSV → COPY vào PGlite → mart.refresh() → kiểm:
//   · mọi luật dq_checks = 0, mọi ngày ≤ as_of, sinh lại cùng seed ra đúng từng byte;
//   · mọi cột của các view người dùng thấy + mọi mã giá trị trong dữ liệu đều có nhãn ja/vi;
//   · tín hiệu huỷ là THẬT: công ty band cao huỷ trong 90 ngày nhiều hơn hẳn band thấp.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { toCsv } from '../../scripts/data/csv.mjs';
import { generate, TABLES } from '../../scripts/data/generate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OPTS = { seed: 'test-seed', asOf: '2026-11-10', months: 18, arrivalsPerMonth: 7 };
let db;
let data;

const hashOf = (tables) => {
  const h = createHash('sha256');
  for (const [t, { columns, rows }] of Object.entries(tables)) h.update(t).update(toCsv(columns, rows));
  return h.digest('hex');
};
const q = async (sql) => (await db.query(sql)).rows;

before(async () => {
  data = generate(OPTS);
  db = new PGlite();
  await db.exec(`set timezone = 'UTC'`);
  const dir = join(here, '..', 'migrations');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'));
  for (const [t, cols] of Object.entries(TABLES)) {
    const blob = new Blob([toCsv(cols, data[t].rows)]);
    await db.query(`copy raw.${t} (${cols.join(', ')}) from '/dev/blob' with (format csv, header true)`, [], { blob });
  }
  await db.exec(`select mart.refresh()`);
});

after(async () => db?.close());

test('cùng seed ⇒ cùng dữ liệu, từng byte; khác seed ⇒ khác', () => {
  assert.equal(hashOf(generate(OPTS)), hashOf(data));
  assert.notEqual(hashOf(generate({ ...OPTS, seed: 'other' })), hashOf(data));
});

test('dữ liệu đủ dày để biểu đồ có hình', () => {
  const n = (t) => data[t].rows.length;
  assert.ok(n('companies') >= 120, `companies = ${n('companies')}`);
  assert.ok(n('user_activity_daily') >= 100000, `activity = ${n('user_activity_daily')}`);
  assert.ok(n('cancel_requests') >= 5, `cancel_requests = ${n('cancel_requests')}`);
  assert.ok(n('interventions') >= 10, `interventions = ${n('interventions')}`);
});

test('mọi luật chất lượng = 0 dòng hỏng', async () => {
  assert.deepEqual(await q(`select check_name, failed_rows from mart.dq_checks where failed_rows <> 0`), []);
});

test('không có ngày nào sau as_of', async () => {
  const r = await q(`
    select 'activity' t, max(activity_date) m from raw.user_activity_daily
    union all select 'feature', max(activity_date) from raw.feature_usage_daily
    union all select 'invoice_paid', max(paid_at) from raw.invoices
    union all select 'user_deact', max(deactivated_at) from raw.users
    union all select 'canceled', max(canceled_at) from raw.subscriptions
    union all select 'iv_outcome', max(outcome_at) from raw.interventions
    union all select 'withdrawn', max(withdrawn_at) from raw.cancel_requests`);
  for (const { t, m } of r) if (m) assert.ok(m.toISOString().slice(0, 10) <= OPTS.asOf, `${t}: ${m.toISOString()}`);
});

test('tiền là số nguyên yên', async () => {
  const [r] = await q(`select count(*)::int n from raw.subscription_periods where mrr <> round(mrr)`);
  assert.equal(r.n, 0);
  const [c] = await q(`select string_agg(distinct currency, ',') c from raw.plans`);
  assert.equal(c.c, 'JPY');
});

test('mọi cột người dùng thấy đều có nhãn ja + vi', async () => {
  const missing = await q(`
    select c.relname || '.' || a.attname as col
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    left join mart.column_labels l on l.column_name = a.attname
    where n.nspname = 'mart' and c.relkind in ('v', 'm')
      and c.relname not in ('column_labels', 'labels')
      and l.column_name is null`);
  assert.deepEqual(missing, []);
  const [blank] = await q(`select count(*)::int n from mart.column_labels where ja = '' or vi = ''`);
  assert.equal(blank.n, 0);
});

test('mọi mã giá trị xuất hiện trong dữ liệu đều có nhãn', async () => {
  const missing = await q(`
    with used(domain, code) as (
      select 'plan', plan_id from raw.plans
      union select 'feature', feature_id from raw.features
      union select 'industry', industry from raw.companies
      union select 'region', region from raw.companies
      union select 'size_band', size_band from raw.companies
      union select 'acquisition_channel', acquisition_channel from raw.companies
      union select 'team', team from raw.staff
      union select 'user_role', role from raw.users
      union select 'cancel_reason', reason from raw.cancel_requests
      union select 'invoice_status', status from raw.invoices
      union select 'movement', movement from mart.mrr_movements
      union select 'movement', movement from mart.company_mrr_monthly
      union select 'plan_change', plan_change from mart.company_mrr_monthly where plan_change is not null
      union select 'risk_band', risk_band from mart.churn_risk_snapshot
      union select 'top_reason', top_reason from mart.churn_risk_snapshot where top_reason is not null
      union select 'intervention_trigger', trigger from raw.interventions
      union select 'intervention_channel', channel from raw.interventions
      union select 'intervention_outcome', outcome from raw.interventions)
    select u.domain, u.code from used u
    left join mart.labels l on l.domain = u.domain and l.code = u.code
    where l.code is null`);
  assert.deepEqual(missing, []);
});

test('tín hiệu huỷ là thật: band cao huỷ trong 90 ngày nhiều hơn hẳn band thấp', async () => {
  const r = await q(`
    select case when risk_band in ('high', 'cancel_scheduled') then 'risky' else risk_band end as band,
           count(*)::int as n,
           avg(case when churned_within_90d then 1.0 else 0.0 end)::float as churn_rate
    from mart.churn_risk_snapshot
    where churned_within_90d is not null
    group by 1`);
  const by = Object.fromEntries(r.map((x) => [x.band, x]));
  console.log('  churn trong 90 ngày theo band:', r.map((x) => `${x.band}=${(x.churn_rate * 100).toFixed(1)}% (n=${x.n})`).join(' · '));
  assert.ok(by.risky && by.low, 'phải có cả band rủi ro lẫn band thấp');
  assert.ok(by.risky.churn_rate > 3 * by.low.churn_rate, 'band rủi ro phải huỷ nhiều hơn ít nhất 3 lần');
});

test('analytics_reader đọc được nhãn', async () => {
  await db.exec(`set role analytics_reader`);
  try {
    const r = await q(`select ja, vi from mart.labels where domain = 'plan' and code = 'growth'`);
    assert.deepEqual(r, [{ ja: 'グロース', vi: 'Tăng trưởng' }]);
  } finally {
    await db.exec(`reset role`);
  }
});
