// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY nguồn dữ liệu — hợp đồng ở docs/API.md. Mỗi `source` = MỘT câu SQL CỐ ĐỊNH trên
// `mart`; client không bao giờ gửi SQL. Tham số đi qua placeholder ($1, $2…), không ghép chuỗi.
// Hàng rào thứ hai là role `analytics_reader` (chỉ đọc, chỉ `mart`) — sai ở đây cũng không ghi
// được và không đọc được `raw`.
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_RE = /^[a-z][a-z0-9_]{0,31}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Bộ kiểm tham số: trả giá trị đã chuẩn hoá, `null` khi vắng, ném khi sai dạng. */
const PARAMS = {
  plan: (v) => {
    if (v == null || v === '' || v === 'all') return null;
    if (typeof v !== 'string' || !PLAN_RE.test(v)) throw new Error('plan');
    return v;
  },
  month: (v) => {
    if (v == null || v === '') return null;
    if (typeof v !== 'string' || !MONTH_RE.test(v)) throw new Error('month');
    return `${v}-01`;
  },
};

// Tháng mặc định của các nguồn lớn = tháng mới nhất (tháng đang chạy).
const LATEST_MONTH = '(select max(month) from mart.months)';

export const SOURCES = {
  'revenue-monthly': { params: [], sql: 'select * from mart.revenue_monthly order by month, plan_id' },
  'users-monthly': { params: [], sql: 'select * from mart.users_monthly order by month, plan_id' },
  'user-monthly': {
    params: ['plan', 'month'],
    sql: `select * from mart.user_monthly
          where month = coalesce($2::date, ${LATEST_MONTH})
            and plan_id is not null and ($1::text is null or plan_id = $1)
          order by active_minutes desc, user_id
          limit 5000`,
  },
  'company-monthly': {
    params: ['plan', 'month'],
    sql: `select * from mart.company_monthly
          where month = coalesce($2::date, ${LATEST_MONTH})
            and ($1::text is null or plan_id = $1)
          order by mrr desc, company_id
          limit 2000`,
  },
  'churn-watchlist': { params: [], sql: 'select * from mart.churn_watchlist order by risk_score desc, company_id' },
  'churn-history': {
    params: [],
    sql: `select snapshot_date, company_id, plan_id, risk_band, risk_score, churned_within_90d
          from mart.churn_risk_snapshot order by snapshot_date, company_id`,
  },
  'interventions-monthly': { params: [], sql: 'select * from mart.interventions_monthly order by month, trigger, channel' },
  labels: { params: [], sql: 'select domain, code, ja, vi, sort_order from mart.labels order by domain, sort_order, code' },
  'column-labels': { params: [], sql: 'select column_name, ja, vi, unit from mart.column_labels order by column_name' },
};

export const AS_OF_SQL = 'select mart.as_of()::text as as_of';

/**
 * Đọc body → { source, sql, args } hoặc ném `Error(code)`:
 *   'bad_source' khi mã nguồn lạ · 'bad_params' khi tham số sai dạng hoặc có khoá lạ.
 */
export function resolveRequest(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('bad_source');
  const { source, ...rest } = body;
  const def = typeof source === 'string' && Object.hasOwn(SOURCES, source) ? SOURCES[source] : null;
  if (!def) throw new Error('bad_source');
  for (const k of Object.keys(rest)) if (!def.params.includes(k)) throw new Error('bad_params');
  let args;
  try {
    args = def.params.map((p) => PARAMS[p](rest[p]));
  } catch {
    throw new Error('bad_params');
  }
  return { source, sql: def.sql, args };
}
