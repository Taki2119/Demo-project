// ─────────────────────────────────────────────────────────────────────────────
// BỘ SINH DỮ LIỆU TỔNG HỢP cho tầng `raw` — hàm THUẦN: cùng tham số ⇒ cùng bảng, từng dòng.
//
// Mô phỏng theo CÂU CHUYỆN, không rải số đều (docs/SCHEMA.md §8):
//   1. Công ty tới theo tháng (tăng trưởng + mùa vụ kiểu Nhật: tháng 4 cao, tháng 12/3 thấp).
//   2. Mỗi công ty có SỨC KHOẺ ẩn `h` trôi theo tháng. Nó quyết định mức dùng, khả năng
//      tăng ghế / nâng gói, xác suất trả chậm, và NGUY CƠ HUỶ.
//   3. Khi một công ty "quyết định đi", nó GIẢM DÙNG trước 35–90 ngày (tính năng chính giảm
//      mạnh hơn), thường hẹn huỷ trước 10–35 ngày, và có thể được chăm sóc giữ lại.
//      ⇒ trang dự án chống huỷ có tín hiệu THẬT để phát hiện.
//   4. Có nhiễu: công ty khoẻ cũng có đợt giảm ngắn, kỳ nghỉ dài làm hoạt động lõm xuống, có
//      người dùng mua ghế mà gần như không vào ⇒ điểm rủi ro không đúng 100%, như ngoài đời.
//   5. Một phần khách đã huỷ quay lại sau 2–8 tháng (subscription MỚI ⇒ `reactivation`).
//
// ⚠ Không có ngày nào sau `asOf`: tương lai chưa biết. Huỷ hẹn sau `asOf` ⇒ subscription
//   vẫn còn hiệu lực, chỉ có yêu cầu hẹn huỷ đang mở.
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, makeRng } from './rng.mjs';
import { dayOf, dow, isHoliday, isoOf, monthEndOf, monthStartOf, ymOf } from './days.mjs';
import { companyName, personName } from './names.mjs';

export const GENERATOR_VERSION = '1';

export const DEFAULTS = {
  seed: 'demo-2026',
  asOf: '2026-11-10',
  months: 24,
  arrivalsPerMonth: 8,
  monthlyGrowth: 0.03,
};

// Giá tính bằng YÊN (số nguyên). MRR = phí cơ bản + ghế vượt mức × đơn giá ghế.
export const PLANS = [
  { plan_id: 'starter', name: 'Starter', tier: 1, base_price: 9800, seat_price: 1200, included_seats: 3, currency: 'JPY', is_active: true },
  { plan_id: 'growth', name: 'Growth', tier: 2, base_price: 29800, seat_price: 1800, included_seats: 10, currency: 'JPY', is_active: true },
  { plan_id: 'scale', name: 'Scale', tier: 3, base_price: 98000, seat_price: 2400, included_seats: 30, currency: 'JPY', is_active: true },
];
const PLAN = Object.fromEntries(PLANS.map((p) => [p.plan_id, p]));
const PLAN_BY_TIER = Object.fromEntries(PLANS.map((p) => [p.tier, p]));

// `adoption` = tỉ lệ người dùng đang hoạt động có dùng tính năng; `rate` = lượt / người / ngày.
export const FEATURES = [
  { feature_id: 'dashboard', name: 'Dashboard', is_key: false, min_tier: 1, adoption: 0.95, rate: 4 },
  { feature_id: 'reports', name: 'Reports', is_key: true, min_tier: 1, adoption: 0.6, rate: 2 },
  { feature_id: 'automation', name: 'Automation', is_key: true, min_tier: 2, adoption: 0.45, rate: 3 },
  { feature_id: 'integrations', name: 'Integrations', is_key: true, min_tier: 2, adoption: 0.35, rate: 2 },
  { feature_id: 'export', name: 'Export', is_key: false, min_tier: 1, adoption: 0.3, rate: 1 },
  { feature_id: 'chat', name: 'Chat', is_key: false, min_tier: 1, adoption: 0.7, rate: 5 },
  { feature_id: 'mobile', name: 'Mobile', is_key: false, min_tier: 1, adoption: 0.4, rate: 2 },
  { feature_id: 'api', name: 'API', is_key: false, min_tier: 3, adoption: 0.25, rate: 6 },
];

const SEASON = { 1: 0.85, 2: 1, 3: 0.8, 4: 1.35, 5: 1.05, 6: 1, 7: 1, 8: 0.85, 9: 1.05, 10: 1.15, 11: 1, 12: 0.75 };

const INDUSTRIES = [
  ['it', 18], ['manufacturing', 14], ['retail', 12], ['healthcare', 10], ['finance', 7],
  ['education', 8], ['logistics', 8], ['construction', 9], ['hospitality', 7], ['professional_services', 7],
];
const REGIONS = [
  ['kanto', 40], ['kansai', 18], ['chubu', 13], ['kyushu', 9], ['tohoku', 6],
  ['chugoku', 5], ['hokkaido', 5], ['shikoku', 4],
];
const SIZES = [['1-10', 35], ['11-50', 35], ['51-200', 18], ['201-1000', 9], ['1000+', 3]];
const SEATS_BY_SIZE = { '1-10': [2, 6], '11-50': [4, 15], '51-200': [10, 40], '201-1000': [25, 80], '1000+': [60, 150] };
const PLAN_BY_SIZE = {
  '1-10': [['starter', 85], ['growth', 15]],
  '11-50': [['starter', 55], ['growth', 40], ['scale', 5]],
  '51-200': [['starter', 20], ['growth', 60], ['scale', 20]],
  '201-1000': [['starter', 5], ['growth', 45], ['scale', 50]],
  '1000+': [['growth', 30], ['scale', 70]],
};
const SMALL = new Set(['1-10', '11-50']);

export const TABLES = {
  dataset_meta: ['key', 'value'],
  plans: ['plan_id', 'name', 'tier', 'base_price', 'seat_price', 'included_seats', 'currency', 'is_active'],
  features: ['feature_id', 'name', 'is_key', 'min_tier'],
  staff: ['staff_id', 'full_name', 'team'],
  companies: ['company_id', 'name', 'industry', 'region', 'size_band', 'acquisition_channel', 'owner_staff_id', 'created_at'],
  users: ['user_id', 'company_id', 'full_name', 'email', 'role', 'created_at', 'deactivated_at'],
  subscriptions: ['subscription_id', 'company_id', 'started_at', 'trial_ends_at', 'canceled_at'],
  subscription_periods: ['subscription_id', 'valid_from', 'valid_to', 'plan_id', 'seats', 'mrr'],
  cancel_requests: ['request_id', 'subscription_id', 'requested_at', 'scheduled_effective_at', 'reason', 'withdrawn_at'],
  invoices: ['invoice_id', 'subscription_id', 'company_id', 'plan_id', 'period_month', 'amount', 'status', 'issued_at', 'due_at', 'paid_at'],
  user_activity_daily: ['activity_date', 'user_id', 'company_id', 'sessions', 'active_minutes'],
  feature_usage_daily: ['activity_date', 'company_id', 'feature_id', 'events', 'users'],
  interventions: ['intervention_id', 'company_id', 'staff_id', 'created_at', 'trigger', 'channel', 'outcome', 'outcome_at'],
};

const pad = (n, w) => String(n).padStart(w, '0');
const d = (day) => (day == null ? null : isoOf(day));

export function mrrOf(planId, seats, discount) {
  const p = PLAN[planId];
  return Math.round((p.base_price + Math.max(0, seats - p.included_seats) * p.seat_price) * (1 - discount));
}

export function generate(options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const asOf = dayOf(cfg.asOf);
  const start = monthStartOf(asOf, -(cfg.months - 1));
  const root = makeRng(cfg.seed);
  const rows = Object.fromEntries(Object.keys(TABLES).map((t) => [t, []]));
  const ids = { user: 0, sub: 0, inv: 0, req: 0, iv: 0 };

  rows.dataset_meta.push(
    ['as_of_date', cfg.asOf], ['seed', String(cfg.seed)], ['months', String(cfg.months)],
    ['generator_version', GENERATOR_VERSION], ['currency', 'JPY'], ['timezone', 'Asia/Ho_Chi_Minh'],
  );
  for (const p of PLANS) rows.plans.push(TABLES.plans.map((c) => p[c]));
  for (const f of FEATURES) rows.features.push(TABLES.features.map((c) => f[c]));

  // Nhân viên phụ trách: 3 sales · 4 CS · 1 support.
  const sr = root.fork('staff');
  const staff = ['sales', 'sales', 'sales', 'cs', 'cs', 'cs', 'cs', 'support'].map((team, i) => ({
    staff_id: `ST${pad(i + 1, 2)}`, full_name: personName(sr).fullName, team,
  }));
  for (const s of staff) rows.staff.push([s.staff_id, s.full_name, s.team]);
  const csStaff = staff.filter((s) => s.team === 'cs');

  // Ngày công ty tới.
  const ar = root.fork('arrivals');
  const arrivals = [];
  for (let i = 0; i < cfg.months; i++) {
    const m0 = monthStartOf(start, i);
    const lambda = cfg.arrivalsPerMonth * (1 + cfg.monthlyGrowth) ** i * SEASON[ymOf(m0).m];
    const last = Math.min(monthEndOf(m0), asOf - 15);
    const n = ar.poisson(lambda);
    for (let k = 0; k < n && last >= m0; k++) arrivals.push(ar.int(m0, last));
  }
  arrivals.sort((a, b) => a - b);

  arrivals.forEach((created, i) => {
    const companyId = `C${pad(i + 1, 4)}`;
    simulateCompany({ rows, ids, asOf, csStaff }, companyId, created, root.fork(companyId));
  });

  return Object.fromEntries(Object.entries(TABLES).map(([t, columns]) => [t, { columns, rows: rows[t] }]));
}

function simulateCompany(ctx, companyId, created, rng) {
  const industry = rng.weighted(INDUSTRIES);
  const size = rng.weighted(SIZES);
  const channel = rng.weighted(
    SMALL.has(size)
      ? [['self_serve', 45], ['inbound', 35], ['partner', 10], ['outbound', 10]]
      : [['outbound', 45], ['partner', 25], ['inbound', 25], ['self_serve', 5]],
  );
  const company = {
    company_id: companyId, name: companyName(rng, industry), industry, region: rng.weighted(REGIONS),
    size_band: size, acquisition_channel: channel, owner_staff_id: rng.pick(ctx.csStaff).staff_id, created_at: created,
  };
  ctx.rows.companies.push(TABLES.companies.map((c) => (c === 'created_at' ? d(created) : company[c])));

  let lifeStart = created;
  let health = clamp(rng.normal(0.66, 0.17), 0.08, 0.97);
  let firstLife = true;
  for (let life = 0; lifeStart <= ctx.asOf - 3; life++) {
    const res = simulateLife(ctx, company, lifeStart, health, firstLife, rng.fork(`life${life}`));
    if (res.canceledAt == null || res.closed || res.trialLost) break;
    if (!rng.chance(0.15)) break;                       // 15% khách đã huỷ quay lại
    lifeStart = res.canceledAt + rng.int(60, 240);
    health = clamp(rng.normal(0.6, 0.12), 0.2, 0.95);
    firstLife = false;
  }
}

function simulateLife(ctx, company, lifeStart, health0, firstLife, rng) {
  const { asOf } = ctx;
  const subId = `S${pad(++ctx.ids.sub, 5)}`;
  const [seatLo, seatHi] = SEATS_BY_SIZE[company.size_band];
  const discount = company.acquisition_channel === 'partner' ? 0.1 : 0;
  let h = health0;
  const monthHealth = new Map();
  const periods = [];
  const users = [];
  const episodes = [];      // đợt "muốn đi": { start, end, saved, savedAt }
  let canceledAt = null;
  let trialEnds = null;
  let closed = false;
  let trialLost = false;

  const newPeriod = (from, plan, seats, mrr) => {
    if (periods.length) periods[periods.length - 1].to = from;
    periods.push({ from, to: null, plan, seats, mrr });
  };
  const activeUsersAt = (day) => users.filter((u) => u.created <= day && (u.deactivated == null || u.deactivated > day));
  const addUser = (day, role) => {
    if (day > asOf) return;
    const p = personName(rng);
    const n = ++ctx.ids.user;
    users.push({
      user_id: `U${pad(n, 6)}`, full_name: p.fullName,
      email: `${p.local}.${n}@${company.company_id.toLowerCase()}.example.com`,
      role, created: day, deactivated: null,
      propensity: rng.chance(0.12) ? 0.06 : clamp(rng.normal(1, 0.28), 0.25, 1.5),   // 12% "ghế ma"
    });
  };
  const deactivate = (u, day) => {
    if (u.deactivated == null && day > u.created) u.deactivated = day;
  };

  let seats = rng.int(seatLo, seatHi);
  const plan0 = rng.weighted(PLAN_BY_SIZE[company.size_band]);
  const nInit = Math.max(1, Math.round(seats * rng.uniform(0.7, 1)));
  for (let i = 0; i < nInit; i++) addUser(lifeStart + (i === 0 ? 0 : rng.int(0, 7)), i === 0 ? 'owner' : i < 3 ? 'admin' : 'member');

  // ── Dùng thử 14 ngày (chỉ lần đầu, kênh tự phục vụ) ──
  let paidFrom = lifeStart;
  const hasTrial = firstLife && (company.acquisition_channel === 'self_serve' || company.acquisition_channel === 'inbound') && rng.chance(0.75);
  if (hasTrial) {
    trialEnds = lifeStart + 14;
    newPeriod(lifeStart, plan0, seats, 0);
    if (trialEnds <= asOf) {
      if (rng.chance(0.45 + 0.4 * h)) {
        paidFrom = trialEnds;
      } else {
        canceledAt = trialEnds;
        trialLost = true;
      }
    } else {
      paidFrom = null;     // vẫn đang dùng thử ở ngày as_of
    }
  }
  if (paidFrom != null && !trialLost) newPeriod(paidFrom, plan0, seats, mrrOf(plan0, seats, discount));

  // ── Từng tháng sau tháng bắt đầu trả tiền ──
  let pendingUntil = null;   // trong đợt "muốn đi" đang mở: không đổi gói / ghế
  let bump = 0;
  if (paidFrom != null && !trialLost) {
    for (let M = monthStartOf(paidFrom, 1); M <= asOf; M = monthStartOf(M, 1)) {
      h = clamp(h + rng.normal(0, 0.06) + 0.08 * (0.66 - h) + bump, 0.03, 0.99);
      bump = 0;
      monthHealth.set(M, h);

      // Người dùng rời / được thay mỗi tháng.
      for (const u of activeUsersAt(M)) {
        if (u.role !== 'owner' && rng.chance(0.012)) {
          const out = M + rng.int(1, 27);
          if (out <= asOf) {
            deactivate(u, out);
            if (rng.chance(0.7)) addUser(out + rng.int(3, 20), 'member');
          }
        }
      }
      if (pendingUntil != null && M <= pendingUntil) continue;
      pendingUntil = null;

      // Chăm sóc chủ động ngẫu nhiên (khách không có vấn đề gì) — nhiễu cho bảng hiệu quả.
      if (rng.chance(0.01)) {
        const T = M + rng.int(0, 20);
        if (T <= asOf) pushIntervention(ctx, company, T, 'manual', rng.weighted([['call', 50], ['email', 40], ['meeting', 10]]), 'saved', T + rng.int(3, 10));
      }

      const monthsPaid = (ymOf(M).y - ymOf(paidFrom).y) * 12 + ymOf(M).m - ymOf(paidFrom).m;
      const hazard = 0.006 + 0.25 * (1 - h) ** 3;          // h=0,66 ⇒ ~1,6%/tháng · h=0,4 ⇒ ~6%
      const closing = rng.chance(0.0015);
      if (monthsPaid >= 2 && (closing || rng.chance(hazard))) {
        const D = monthStartOf(M, rng.int(1, 2));                       // huỷ có hiệu lực vào ngày 1
        const start = Math.max(paidFrom + 14, D - (closing ? rng.int(20, 40) : rng.int(35, 90)));
        const ep = runEpisode(ctx, company, subId, rng, start, D, closing);
        episodes.push(ep);
        if (ep.saved) {
          pendingUntil = ep.savedAt;
          bump = 0.25;
          continue;
        }
        if (D <= asOf) {
          canceledAt = D;
          closed = closing;
        }
        break;   // huỷ (hoặc sẽ huỷ sau as_of): không còn biến động nào nữa
      }

      // Tăng / giảm ghế, nâng / hạ gói — hiệu lực ngày 1 của tháng.
      const cur = periods[periods.length - 1];
      let nextSeats = cur.seats;
      let nextPlan = cur.plan;
      if (h > 0.6 && rng.chance(0.12)) nextSeats += Math.max(1, Math.ceil(cur.seats * rng.uniform(0.05, 0.25)));
      else if (h < 0.4 && rng.chance(0.08)) nextSeats = Math.max(1, cur.seats - Math.max(1, Math.ceil(cur.seats * rng.uniform(0.1, 0.3))));
      const tier = PLAN[nextPlan].tier;
      const crowded = nextSeats > (tier === 1 ? 12 : 45);
      if (tier < 3 && (crowded ? rng.chance(0.5) : h > 0.75 && rng.chance(0.015))) nextPlan = PLAN_BY_TIER[tier + 1].plan_id;
      else if (tier > 1 && h < 0.35 && rng.chance(0.03)) nextPlan = PLAN_BY_TIER[tier - 1].plan_id;
      if (nextSeats !== cur.seats || nextPlan !== cur.plan) {
        newPeriod(M, nextPlan, nextSeats, mrrOf(nextPlan, nextSeats, discount));
        const active = activeUsersAt(M);
        if (nextSeats > active.length) {
          const add = Math.round((nextSeats - active.length) * rng.uniform(0.6, 1));
          for (let i = 0; i < add; i++) addUser(M + rng.int(0, 10), 'member');
        } else {
          for (const u of active.filter((x) => x.role !== 'owner').slice(0, active.length - nextSeats)) deactivate(u, M);
        }
      }
      seats = nextSeats;
    }
  }

  // ── Chốt vòng đời ──
  const end = canceledAt;   // null = còn hiệu lực ở as_of
  if (end != null) {
    if (periods.length) periods[periods.length - 1].to = end;
    for (const u of users) if (u.created < end) deactivate(u, end);
  }
  const keptUsers = users.filter((u) => u.created <= asOf && (end == null || u.created < end));
  for (const u of keptUsers) if (u.deactivated != null && u.deactivated > asOf) u.deactivated = null;

  ctx.rows.subscriptions.push([subId, company.company_id, d(lifeStart), d(trialEnds), d(end)]);
  for (const p of periods) ctx.rows.subscription_periods.push([subId, d(p.from), d(p.to), p.plan, p.seats, p.mrr]);
  for (const u of keptUsers) {
    ctx.rows.users.push([u.user_id, company.company_id, u.full_name, u.email, u.role, d(u.created), d(u.deactivated)]);
  }

  emitInvoices(ctx, company, subId, periods, paidFrom, end, monthHealth, health0, rng.fork('invoices'));
  emitActivity(ctx, company, keptUsers, periods, episodes, lifeStart, end, monthHealth, health0, rng.fork('activity'));
  return { canceledAt: end, closed, trialLost };
}

// Một đợt "muốn đi": hẹn huỷ (có thể), chăm sóc (có thể), giữ được hay không.
function runEpisode(ctx, company, subId, rng, start, D, closing) {
  const { asOf } = ctx;
  const ep = { start, end: D, saved: false, savedAt: null };
  let request = null;
  if (rng.chance(closing ? 0.9 : 0.65)) {
    const R = D - rng.int(10, 35);
    if (R <= asOf && R > start) request = { R, withdrawn: null };
  }
  let iv = null;
  if (!closing && rng.chance(0.55)) {
    const T = start + rng.int(14, 30);
    if (T < D && T <= asOf && (!request || T < request.R)) iv = { T, trigger: 'risk_score' };
  }
  if (!iv && request && !closing && rng.chance(0.7)) {
    const T = request.R + rng.int(1, 5);
    if (T < D && T <= asOf) iv = { T, trigger: 'cancel_request' };
  }
  if (iv) {
    const channel = rng.weighted([['call', 50], ['email', 35], ['meeting', 15]]);
    const pSave = (iv.trigger === 'risk_score' ? 0.35 : 0.28) * (channel === 'meeting' ? 1.3 : channel === 'email' ? 0.7 : 1);
    let outcome;
    let O;
    if (rng.chance(pSave)) {
      outcome = 'saved';
      O = Math.min(iv.T + rng.int(3, 14), D - 1);
    } else if (rng.chance(0.25)) {
      outcome = 'no_response';
      O = iv.T + 14;
    } else {
      outcome = 'churned';
      O = D;
    }
    if (O > asOf) {
      outcome = 'pending';   // kết quả chưa biết ở as_of
      O = null;
    }
    if (outcome === 'saved') {
      ep.saved = true;
      ep.savedAt = O;
      ep.end = O;
      if (request && O >= request.R) request.withdrawn = O;
      else request = null;   // được giữ trước khi kịp bấm huỷ
    }
    pushIntervention(ctx, company, iv.T, iv.trigger, channel, outcome, O);
  }
  if (request) {
    const reason = closing
      ? 'business_closed'
      : rng.weighted([['low_usage', 35], ['price', 25], ['missing_feature', 15], ['switched_competitor', 15], ['other', 10]]);
    ctx.rows.cancel_requests.push([`CR${pad(++ctx.ids.req, 5)}`, subId, d(request.R), d(D), reason, d(request.withdrawn)]);
  }
  return ep;
}

function pushIntervention(ctx, company, T, trigger, channel, outcome, O) {
  let out = outcome;
  let at = O;
  if (at != null && at > ctx.asOf) {
    out = 'pending';
    at = null;
  }
  ctx.rows.interventions.push([`IV${pad(++ctx.ids.iv, 5)}`, company.company_id, company.owner_staff_id, d(T), trigger, channel, out, d(at)]);
}

function periodAt(periods, day) {
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i];
    if (p.from <= day && (p.to == null || p.to > day)) return p;
  }
  return null;
}

function emitInvoices(ctx, company, subId, periods, paidFrom, end, monthHealth, health0, rng) {
  if (paidFrom == null) return;
  const { asOf } = ctx;
  for (let M = monthStartOf(paidFrom); M <= asOf; M = monthStartOf(M, 1)) {
    const issued = Math.max(M, paidFrom);
    if (issued > asOf || (end != null && issued >= end)) break;
    const p = periodAt(periods, issued);
    if (!p || p.mrr <= 0) continue;
    const due = monthEndOf(monthStartOf(issued, 1));          // hạn: cuối tháng sau
    const h = monthHealth.get(M) ?? health0;
    const pLate = 0.03 + 0.2 * (1 - h) ** 2;
    const r = rng.float();
    let status = 'paid';
    let paid = null;
    if (r < 0.003) status = 'void';
    else if (r < 0.007) status = 'uncollectible';
    else paid = r < 0.007 + pLate ? due + rng.int(5, 45) : issued + rng.int(3, 25);
    if (status === 'paid' && paid > asOf) {
      status = 'open';
      paid = null;
    }
    ctx.rows.invoices.push([
      `INV${pad(++ctx.ids.inv, 7)}`, subId, company.company_id, p.plan, isoOf(M), p.mrr, status,
      isoOf(issued), isoOf(due), paid == null ? null : isoOf(paid),
    ]);
  }
}

// Hệ số "muốn đi" tại một ngày: 1 bình thường → giảm dần về ~0,12 khi tới ngày huỷ; được giữ
// thì hồi lại trong 21 ngày.
function episodeFactor(episodes, day) {
  let f = 1;
  for (const ep of episodes) {
    const span = Math.max(1, ep.end - ep.start);
    const D = ep.saved ? ep.start + span : ep.end;
    if (day >= ep.start && day < D) {
      f = Math.min(f, 1 - 0.88 * ((day - ep.start) / (ep.saved ? Math.max(span, 30) : span)) ** 0.8);
    } else if (ep.saved && day >= D && day < D + 21) {
      const atSave = 1 - 0.88 * (span / Math.max(span, 30)) ** 0.8;
      f = Math.min(f, atSave + (1 - atSave) * ((day - D) / 21));
    }
  }
  return f;
}

function emitActivity(ctx, company, users, periods, episodes, lifeStart, end, monthHealth, health0, rng) {
  const { asOf } = ctx;
  const last = Math.min(asOf, (end ?? asOf + 1) - 1);
  if (last < lifeStart) return;
  const days = last - lifeStart + 1;

  // Đợt giảm ngắn của công ty khoẻ (nhiễu): mỗi tháng 4% có một đợt 14–28 ngày.
  const dips = [];
  for (let M = monthStartOf(lifeStart); M <= last; M = monthStartOf(M, 1)) {
    if (rng.chance(0.04)) {
      const s = M + rng.int(0, 27);
      dips.push([s, s + rng.int(14, 28)]);
    }
  }
  const factor = new Float64Array(days);
  const epf = new Float64Array(days);
  for (let i = 0; i < days; i++) {
    const day = lifeStart + i;
    const h = monthHealth.get(monthStartOf(day)) ?? health0;
    const e = episodeFactor(episodes, day);
    epf[i] = e;
    let f = (0.22 + 0.68 * h) * e;
    if (dips.some(([a, b]) => day >= a && day < b)) f *= 0.45;
    const w = dow(day);
    if (w === 0 || w === 6) f *= 0.1;
    else if (isHoliday(day)) f *= 0.2;
    factor[i] = f;
  }

  const activeCount = new Int32Array(days);
  for (const u of users) {
    const from = Math.max(u.created, lifeStart);
    const to = Math.min(last, (u.deactivated ?? last + 1) - 1);
    for (let day = from; day <= to; day++) {
      const i = day - lifeStart;
      if (!rng.chance(Math.min(0.95, factor[i] * u.propensity))) continue;
      const sessions = 1 + rng.poisson(0.9 * u.propensity);
      const minutes = Math.max(1, Math.round(sessions * rng.uniform(6, 22)));
      ctx.rows.user_activity_daily.push([isoOf(day), u.user_id, company.company_id, sessions, minutes]);
      activeCount[i]++;
    }
  }

  // Mức dùng tính năng của công ty: tính năng chính phụ thuộc sức khoẻ ban đầu.
  const adoption = FEATURES.map((f) => clamp(f.adoption * (f.is_key ? 0.5 + 0.7 * health0 : 1) * rng.uniform(0.8, 1.2), 0.05, 0.98));
  for (let i = 0; i < days; i++) {
    const n = activeCount[i];
    if (n === 0) continue;
    const day = lifeStart + i;
    const p = periodAt(periods, day);
    if (!p) continue;
    const tier = PLAN[p.plan].tier;
    FEATURES.forEach((f, k) => {
      if (f.min_tier > tier) return;
      // Đang "muốn đi": tính năng chính rơi NHANH hơn số người vào (thêm một lần √ hệ số).
      const keyDrop = f.is_key ? Math.sqrt(epf[i]) : 1;
      const used = Math.min(n, Math.round(n * adoption[k] * keyDrop * rng.uniform(0.8, 1.2)));
      if (used < 1) return;
      const events = Math.round(used * f.rate * keyDrop * rng.uniform(0.6, 1.4));
      if (events < 1) return;
      ctx.rows.feature_usage_daily.push([isoOf(day), company.company_id, f.feature_id, events, used]);
    });
  }
}
