// Câu trả lời của bộ câu hỏi mẫu, chạy trên dữ liệu GIẢ nhỏ, tính tay được.
// Dữ liệu này chỉ nằm trong test (không vào bundle — §2.1).
import { describe, expect, it } from 'vitest';
import type { Row, SourceData } from '../data/api';
import type { SourceKey } from '../nav/catalog';
import type { Lang } from '../ui/i18n';
import { GROUPS, type Ctx } from './kit';
import { QUESTIONS, STARTERS, questionById, resolve, resolveId } from './questions';

// ── dữ liệu giả ──────────────────────────────────────────────────────────────
const PLANS = ['starter', 'growth', 'scale'] as const;
const MONTHS = Array.from({ length: 14 }, (_, i) => {
  const m = 10 + i; // 2025-10 … 2026-11
  return `${2025 + Math.floor((m - 1) / 12)}-${String(((m - 1) % 12) + 1).padStart(2, '0')}`;
});
const LAST = MONTHS.at(-1)!; // 2026-11, tháng đang chạy
const k = (p: string) => PLANS.indexOf(p as (typeof PLANS)[number]) + 1;

const revenue: Row[] = MONTHS.flatMap((ym, i) =>
  PLANS.map((p) => ({
    month: `${ym}-01`,
    measure_date: ym === LAST ? '2026-11-10' : `${ym}-28`,
    is_closed: ym !== LAST,
    plan_id: p,
    mrr_end: 100000 * k(p) + 10000 * i * k(p),
    paying_companies: 10 * k(p) + i,
    trial_companies: k(p),
    seats_end: 50 * k(p),
    new_mrr: 12000 * k(p),
    reactivation_mrr: 1000,
    expansion_mrr: 3000 * k(p),
    contraction_mrr: -2000,
    churned_mrr: -4000 * k(p),
    plan_in_mrr: 0,
    plan_out_mrr: 0,
    new_companies: 2,
    reactivated_companies: 0,
    churned_companies: 1,
    invoiced_amount: 100000 * k(p),
    paid_amount: 90000 * k(p),
    unpaid_amount: 10000 * k(p),
  })),
);

const users: Row[] = MONTHS.flatMap((ym, i) =>
  PLANS.map((p) => ({
    month: `${ym}-01`,
    measure_date: ym === LAST ? '2026-11-10' : `${ym}-30`,
    is_closed: ym !== LAST,
    days_in_period: ym === LAST ? 10 : 30,
    plan_id: p,
    seat_users_end: 100 * k(p) + i,
    new_users: 5 * k(p),
    deactivated_users: 1,
    mau: 60 * k(p),
    active_user_days: 600 * k(p),
    sessions: 900,
    active_minutes: 50000,
  })),
);

const companies: Row[] = Array.from({ length: 12 }, (_, i) => ({
  month: `${LAST}-01`,
  company_id: `c${i}`,
  company_name: `Co ${i}`,
  industry: ['it', 'retail', 'finance'][i % 3]!,
  region: ['kanto', 'kansai'][i % 2]!,
  size_band: ['1-10', '11-50', '51-200'][i % 3]!,
  plan_id: PLANS[i % 3]!,
  movement: 'flat',
  plan_change: i === 1 ? 'upgrade' : i === 2 ? 'downgrade' : null,
  plan_prev: i === 1 ? 'starter' : i === 2 ? 'scale' : PLANS[i % 3]!,
  mrr: i === 11 ? 0 : 10000 * (i + 1),
  mrr_prev: 10000 * (i + 1) - (i === 1 ? 5000 : 0),
  seats: 10,
  seat_users_end: 10,
  mau: i < 3 ? 1 : 8,
  active_user_days: 40,
  active_minutes: 1000 * (12 - i),
  feature_events: i === 4 ? 3 : 30,
  key_feature_events: i === 4 || i === 5 ? 0 : 10,
  last_active_date: '2026-11-09',
}));

const userRows: Row[] = Array.from({ length: 15 }, (_, i) => ({
  month: `${LAST}-01`,
  user_id: `u${i}`,
  full_name: `User ${i}`,
  company_id: `c${i % 4}`,
  company_name: `Co ${i % 4}`,
  plan_id: PLANS[i % 3]!,
  is_seat: true,
  is_new: false,
  is_deactivated: false,
  active_days: i < 4 ? 0 : i,
  sessions: i,
  active_minutes: i < 4 ? 0 : 100 * i,
  last_active_date: i === 0 ? null : `2026-10-${String(10 + i).padStart(2, '0')}`,
}));

const BANDS = ['cancel_scheduled', 'high', 'high', 'medium', 'medium', 'low', 'low', 'low'];
const watchlist: Row[] = BANDS.map((b, i) => ({
  snapshot_date: '2026-11-08',
  company_id: `c${i}`,
  company_name: `Co ${i}`,
  plan_id: PLANS[i % 3]!,
  mrr: 10000 * (i + 1),
  risk_band: b,
  risk_score: b === 'high' ? 70 + i : b === 'medium' ? 40 : 5,
  top_reason: b === 'low' ? null : i % 2 ? 'usage_drop' : 'key_features',
  owner_name: i % 2 ? 'Staff A' : null,
  last_intervention_at: i === 0 ? '2026-11-01T09:00:00Z' : null,
}));

const interventions: Row[] = MONTHS.slice(-12).flatMap((ym) =>
  ['call', 'email'].map((ch) => ({
    month: `${ym}-01`,
    trigger: 'risk_score',
    channel: ch,
    interventions: 10,
    saved: ch === 'call' ? 6 : 3,
    churned: 2,
    no_response: ch === 'call' ? 1 : 4,
    pending: 1,
  })),
);

const history: Row[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ snapshot_date: '2026-05-03', company_id: `h${i}`, plan_id: 'growth', risk_band: 'high', risk_score: 70, churned_within_90d: i < 5 })),
  ...Array.from({ length: 20 }, (_, i) => ({ snapshot_date: '2026-05-03', company_id: `l${i}`, plan_id: 'starter', risk_band: 'low', risk_score: 0, churned_within_90d: i < 1 })),
  { snapshot_date: '2026-11-08', company_id: 'x', plan_id: 'scale', risk_band: 'high', risk_score: 80, churned_within_90d: null },
];

const DATA: Partial<Record<SourceKey, SourceData>> = {
  'revenue-monthly': { rows: revenue, updatedAt: '2026-11-10' },
  'users-monthly': { rows: users, updatedAt: '2026-11-10' },
  'company-monthly': { rows: companies, updatedAt: '2026-11-10' },
  'user-monthly': { rows: userRows, updatedAt: '2026-11-10' },
  'churn-watchlist': { rows: watchlist, updatedAt: '2026-11-10' },
  'interventions-monthly': { rows: interventions, updatedAt: '2026-11-10' },
  'churn-history': { rows: history, updatedAt: '2026-11-10' },
};

const ctx = (lang: Lang, over: Partial<Ctx> = {}): Ctx => ({
  lang,
  slots: { plan: null, topN: null },
  data: DATA,
  label: (d, c) => `${d}:${c}`,
  ...over,
});

const build = (id: string, c: Ctx) => questionById(id)!.build(c);

// ── bộ câu hỏi ──────────────────────────────────────────────────────────────
describe('bộ câu hỏi', () => {
  it('đủ nhiều, id không trùng, mỗi nhóm có câu, ≥ 2 cách hỏi mỗi ngôn ngữ', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(35);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const g of GROUPS) expect(QUESTIONS.some((q) => q.group === g)).toBe(true);
    for (const q of QUESTIONS) {
      expect(q.ask.ja.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.ask.vi.length, q.id).toBeGreaterThanOrEqual(2);
    }
  });
  it('related + STARTERS trỏ tới câu có thật', () => {
    for (const q of QUESTIONS) for (const r of q.related) expect(questionById(r), `${q.id} → ${r}`).toBeTruthy();
    for (const id of STARTERS) expect(questionById(id), id).toBeTruthy();
  });
  it('nguồn cần nạp chỉ là nguồn SẴN CÓ của API (không SQL mới)', () => {
    const known = new Set(['revenue-monthly', 'users-monthly', 'user-monthly', 'company-monthly', 'churn-watchlist', 'churn-history', 'interventions-monthly']);
    for (const q of QUESTIONS) for (const n of q.needs({ plan: 'growth', topN: 5 })) expect(known.has(n.source), `${q.id}: ${n.source}`).toBe(true);
  });
  it('tham số gói chỉ gửi lên API cho nguồn nhận nó', () => {
    for (const q of QUESTIONS)
      for (const n of q.needs({ plan: 'growth', topN: 5 })) {
        if (n.source === 'company-monthly' || n.source === 'user-monthly') expect(n.params).toEqual({ plan: 'growth' });
        else expect(n.params).toEqual({});
      }
  });
});

describe('mọi câu trả lời dựng được ở cả ja và vi', () => {
  for (const q of QUESTIONS) {
    it.each(['ja', 'vi'] as const)(`${q.id} (%s)`, (lang) => {
      const a = q.build(ctx(lang));
      expect(a, q.id).not.toBeNull();
      const all = [a!.text, a!.basis, a!.period, ...a!.figures.flatMap((f) => [f.label, f.value, f.sub ?? '']), ...(a!.table?.head ?? []), ...(a!.table?.rows.flat() ?? [])].join(' | ');
      expect(all).not.toMatch(/undefined|NaN|\bnull\b|\[object/);
      expect(a!.text.length).toBeGreaterThan(10);
      // Tên chuỗi của biểu đồ đường hiện trong tooltip ⇒ phải NGẮN (không phải nguyên câu hỏi).
      if (a!.chart?.kind === 'line') expect(a!.chart.label.length, q.id).toBeLessThanOrEqual(20);
      if (a!.table) {
        expect(a!.table.numeric).toHaveLength(a!.table.head.length);
        for (const r of a!.table.rows) expect(r).toHaveLength(a!.table.head.length);
      }
      // Câu trả lời tiếng Nhật không lẫn chữ tiếng Việt có dấu, và ngược lại
      if (lang === 'ja') expect(a!.text).not.toMatch(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i);
      else expect(a!.text).not.toMatch(/[぀-ヿ]/);
    });
  }
});

describe('không có dữ liệu ⇒ null, không vỡ', () => {
  it.each(QUESTIONS.map((q) => q.id))('%s', (id) => {
    expect(build(id, ctx('vi', { data: {} }))).toBeNull();
    const empty = Object.fromEntries(Object.keys(DATA).map((s) => [s, { rows: [], updatedAt: null }]));
    expect(build(id, ctx('vi', { data: empty }))).toBeNull();
  });
});

describe('số tính đúng (tính tay trên dữ liệu giả)', () => {
  // tháng cuối i = 13: MRR = Σ_k (100000k + 130000k) = 230000 × 6 = 1.380.000; tháng trước i = 12: 220000 × 6
  it('MRR hiện tại + so tháng trước; tháng chưa trọn ghi ngày chốt', () => {
    const a = build('mrr_now', ctx('vi'))!;
    expect(a.figures[0]!.value).toBe('¥1.380.000');
    expect(a.figures[1]!.value).toBe('+¥60.000 (+4,5%)');
    expect(a.period).toBe('Tháng 11/2026 (tính đến 10/11/2026)');
  });
  it('gói đã chọn ⇒ chỉ gói đó, có chip đã áp', () => {
    const a = build('mrr_now', ctx('vi', { slots: { plan: 'growth', topN: null } }))!;
    expect(a.figures[0]!.value).toBe('¥460.000'); // k = 2
    expect(a.applied.plan).toBe('growth');
    expect(a.text).toContain('gói plan:growth');
  });
  it('huỷ đọc trên tháng ĐÃ CHỐT gần nhất (10/2026), không phải tháng đang chạy', () => {
    const a = build('churn_mrr', ctx('vi'))!;
    expect(a.period).toBe('Tháng 10/2026');
    // churned = 4000 × (1+2+3) = 24.000; contraction 2.000 × 3 = 6.000; MRR đầu = tháng 9 (i = 11): 210000 × 6
    expect(a.figures[0]!.value).toBe('¥24.000');
    expect(a.figures[2]!.value).toBe('2,4%'); // 30.000 / 1.260.000
  });
  it('NRR 12 tháng = (đầu kỳ + mở rộng + thu hẹp + huỷ) ÷ đầu kỳ', () => {
    const a = build('nrr_12m', ctx('vi'))!;
    // 12 tháng chốt: 11/2025 … 10/2026; đầu kỳ = 10/2025 (i = 0): 100000 × 6 = 600.000
    // mỗi tháng: +18.000 −6.000 −24.000 = −12.000 ⇒ 12 tháng −144.000 ⇒ 456.000 / 600.000 = 76%
    expect(a.figures[0]!.value).toBe('76,0%');
  });
  it('NRR không đủ 12 tháng chốt ⇒ "—", không bịa', () => {
    const short = { ...DATA, 'revenue-monthly': { rows: revenue.filter((r) => String(r.month) >= '2026-06'), updatedAt: '2026-11-10' } };
    expect(build('nrr_12m', ctx('vi', { data: short }))!.figures[0]!.value).toBe('—');
  });
  it('top N theo tham số; công ty MRR = 0 không vào danh sách MRR', () => {
    const a = build('top_companies_mrr', ctx('vi', { slots: { plan: null, topN: 3 } }))!;
    expect(a.table!.rows.map((r) => r[0])).toEqual(['Co 10', 'Co 9', 'Co 8']);
    expect(a.applied.topN).toBe(3);
  });
  it('đổi gói: đếm nâng / hạ', () => {
    const a = build('plan_changes', ctx('ja'))!;
    expect(a.figures.map((f) => f.value)).toEqual(['1', '1']);
  });
  it('người dùng chưa hoạt động: 4 / 15, người chưa từng dùng lên đầu', () => {
    const a = build('inactive_users', ctx('vi'))!;
    expect(a.figures[0]!.value).toBe('4');
    expect(a.table!.rows[0]![2]).toBe('Chưa từng dùng');
  });
  it('rủi ro: đếm theo band, MRR có nguy cơ', () => {
    const b = build('risk_bands', ctx('vi'))!;
    expect(b.figures.map((f) => f.value)).toEqual(['1', '2']);
    const m = build('mrr_at_risk', ctx('vi'))!;
    // hẹn huỷ + cao = 10.000 + 20.000 + 30.000 = 60.000 / tổng 360.000
    expect(m.figures[0]!.value).toBe('¥60.000');
    expect(m.figures[0]!.sub).toBe('16,7%');
  });
  it('chăm sóc: tỉ lệ giữ được bỏ lượt đang xử lý', () => {
    const a = build('intervention_channel', ctx('vi'))!;
    // gọi điện: 6 / (6 + 2 + 1) = 66,7%
    expect(a.table!.rows[0]![0]).toBe('intervention_channel:call');
    expect(a.table!.rows[0]![5]).toBe('66,7%');
  });
  it('độ chính xác: chỉ lần chấm đã có kết quả 90 ngày', () => {
    const a = build('risk_accuracy', ctx('vi'))!;
    const high = a.table!.rows.find((r) => r[0] === 'risk_band:high')!;
    expect(high[1]).toBe('10');
    expect(high[2]).toBe('50,0%');
  });
});

describe('đường đi đầu-cuối: câu gõ → câu trả lời', () => {
  it('câu gõ tiếng Nhật khi giao diện là tiếng Việt vẫn trả lời (bằng tiếng Việt)', () => {
    const r = resolve('業種別の売上');
    expect(r.kind).toBe('answer');
    if (r.kind !== 'answer') return;
    const a = r.question.build(ctx('vi', { slots: r.slots }));
    expect(a!.text).toContain('ngành');
  });
  it('bấm nút gợi ý ⇒ trả lời đúng câu đó', () => {
    const r = resolveId('arpa');
    expect(r?.kind).toBe('answer');
    expect(resolveId('khong-co')).toBeNull();
  });
});
