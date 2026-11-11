// Sample questions — COMPANIES group. Source: company-monthly (latest month, one row per company).
import type { Row } from '../../data/api';
import { ratio, seatUsage } from '../../data/metrics';
import {
  applied, count, groupSum, listText, n, pct, planParam, rowsOf, scopeOf, snapshotText, topOf, tx, ymRow, yen,
  type Ctx, type Question,
} from '../kit';

const CM = 'company-monthly' as const;
const needCm = (s: Parameters<Question['needs']>[0]) => [{ source: CM, params: planParam(s) }];

function cmSnapshot(ctx: Ctx): { rows: Row[]; paying: Row[]; period: string } | null {
  const rows = rowsOf(ctx, CM);
  if (!rows || rows.length === 0) return null;
  const ym = ymRow(rows[0]!);
  return { rows, paying: rows.filter((r) => n(r.mrr) > 0), period: snapshotText(ctx.lang, ym, ctx.data[CM]?.updatedAt) };
}

const basisCm = (ctx: Ctx, ja: string, vi: string) =>
  tx(ctx.lang, `企業別ボード（最新月）：${ja}`, `Bảng Theo công ty (tháng mới nhất): ${vi}`);

const companyCells = (ctx: Ctx, r: Row) => [String(r.company_name ?? ''), r.plan_id ? ctx.label('plan', String(r.plan_id)) : '—'];

const topCompanies: Question = {
  id: 'top_companies_mrr',
  group: 'companies',
  ask: {
    ja: ['MRRが大きい企業トップ10は？', '一番売上の大きい顧客はどこ？', '大口顧客を教えて'],
    vi: ['Top 10 công ty có MRR lớn nhất?', 'Khách hàng mang lại doanh thu lớn nhất là ai?', 'Danh sách khách hàng lớn'],
  },
  keywords: ['大口', 'トップ', '上位', 'khach hang lon', 'top', 'lon nhat', 'cong ty'],
  uses: { plan: true, topN: true },
  related: ['revenue_by_industry', 'top_active_companies', 'mrr_by_plan'],
  needs: needCm,
  build(ctx) {
    const snap = cmSnapshot(ctx);
    if (!snap) return null;
    const k = topOf(ctx);
    const list = [...snap.paying].sort((a, b) => n(b.mrr) - n(a.mrr)).slice(0, k);
    const total = snap.paying.reduce((s, r) => s + n(r.mrr), 0);
    const topSum = list.reduce((s, r) => s + n(r.mrr), 0);
    const top = list[0];
    if (!top) return null;
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${snap.period}${s}のMRR最大は ${top.company_name}（${yen(n(top.mrr), 'ja')}）です。上位 ${list.length} 社で全体の ${pct(ratio(topSum, total), 'ja')} を占めます。`,
        `${snap.period}${s}: công ty có MRR lớn nhất là ${top.company_name} (${yen(n(top.mrr), 'vi')}). Top ${list.length} chiếm ${pct(ratio(topSum, total), 'vi')} tổng MRR.`,
      ),
      figures: [{ label: tx(ctx.lang, `上位${list.length}社の構成比`, `Tỉ trọng top ${list.length}`), value: pct(ratio(topSum, total), ctx.lang) }],
      table: {
        head: [tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, 'プラン', 'Gói'), tx(ctx.lang, '業種', 'Ngành'), 'MRR', tx(ctx.lang, 'シート', 'Ghế')],
        numeric: [false, false, false, true, true],
        rows: list.map((r) => [...companyCells(ctx, r), r.industry ? ctx.label('industry', String(r.industry)) : '—', yen(n(r.mrr), ctx.lang), count(n(r.seats), ctx.lang)]),
      },
      basis: basisCm(ctx, 'MRR＞0 の企業をMRRの大きい順に。構成比＝上位企業のMRR合計÷全有料企業のMRR。', 'công ty có MRR > 0, xếp theo MRR giảm dần. Tỉ trọng = tổng MRR của top ÷ tổng MRR mọi công ty trả tiền.'),
      period: snap.period,
      applied: applied(ctx, this),
    };
  },
};

/** "MRR by <company attribute>" questions — industry / region / size share one template. */
function byAttr(id: string, attr: 'industry' | 'region' | 'size_band', ask: Question['ask'], keywords: string[], related: string[], name: { ja: string; vi: string }): Question {
  return {
    id,
    group: 'companies',
    ask,
    keywords,
    uses: { plan: true },
    related,
    needs: needCm,
    build(ctx) {
      const snap = cmSnapshot(ctx);
      if (!snap || snap.paying.length === 0) return null;
      const g = groupSum(snap.paying, attr, 'mrr');
      const total = g.reduce((s, x) => s + x.sum, 0);
      const lab = (code: string) => (code ? ctx.label(attr, code) : '—');
      const top = g[0]!;
      const s = scopeOf(ctx);
      return {
        text: tx(
          ctx.lang,
          `${snap.period}${s}、MRRが最も大きい${name.ja}は「${lab(top.code)}」で ${yen(top.sum, 'ja')}（${count(top.n, 'ja')} 社、全体の ${pct(ratio(top.sum, total), 'ja')}）です。次いで ${listText('ja', g.slice(1, 3).map((x) => lab(x.code)))}。`,
          `${snap.period}${s}: ${name.vi} có MRR lớn nhất là "${lab(top.code)}" với ${yen(top.sum, 'vi')} (${count(top.n, 'vi')} công ty, ${pct(ratio(top.sum, total), 'vi')} tổng). Tiếp theo: ${listText('vi', g.slice(1, 3).map((x) => lab(x.code)))}.`,
        ),
        figures: [],
        table: {
          head: [tx(ctx.lang, name.ja, name.vi.charAt(0).toUpperCase() + name.vi.slice(1)), 'MRR', tx(ctx.lang, '構成比', 'Tỉ trọng'), tx(ctx.lang, '企業数', 'Số công ty'), 'ARPA'],
          numeric: [false, true, true, true, true],
          rows: g.map((x) => [lab(x.code), yen(x.sum, ctx.lang), pct(ratio(x.sum, total), ctx.lang), count(x.n, ctx.lang), yen(ratio(x.sum, x.n), ctx.lang)]),
        },
        chart: { kind: 'bar', unit: 'yen', points: g.map((x) => ({ x: lab(x.code), y: x.sum })) },
        basis: basisCm(ctx, `有料企業のMRRを${name.ja}ごとに合計。`, `cộng MRR của công ty trả tiền theo ${name.vi}.`),
        period: snap.period,
        applied: applied(ctx, this),
      };
    },
  };
}

const byIndustry = byAttr(
  'revenue_by_industry',
  'industry',
  {
    ja: ['どの業種の売上が一番大きい？', '業種別のMRRは？', '業界ごとの顧客数と売上'],
    vi: ['Ngành nào mang lại doanh thu cao nhất?', 'MRR theo ngành?', 'Số khách hàng và doanh thu theo ngành'],
  },
  ['業種', '業界', 'nganh', 'linh vuc', 'industry'],
  ['revenue_by_region', 'revenue_by_size', 'top_companies_mrr'],
  { ja: '業種', vi: 'ngành' },
);

const byRegion = byAttr(
  'revenue_by_region',
  'region',
  {
    ja: ['地域別のMRRは？', 'どの地域の顧客が多い？', 'エリアごとの売上'],
    vi: ['MRR theo khu vực?', 'Khu vực nào có nhiều khách hàng nhất?', 'Doanh thu theo vùng'],
  },
  ['地域', 'エリア', 'khu vuc', 'vung', 'region'],
  ['revenue_by_industry', 'revenue_by_size', 'top_companies_mrr'],
  { ja: '地域', vi: 'khu vực' },
);

const bySize = byAttr(
  'revenue_by_size',
  'size_band',
  {
    ja: ['企業規模別のMRRは？', '大企業と中小企業どちらの売上が大きい？', '従業員規模ごとの売上'],
    vi: ['MRR theo quy mô công ty?', 'Doanh nghiệp lớn hay nhỏ mang lại doanh thu nhiều hơn?', 'Doanh thu theo số nhân viên của khách hàng'],
  },
  ['規模', '従業員', '大企業', '中小', 'quy mo', 'nhan vien', 'doanh nghiep lon'],
  ['revenue_by_industry', 'revenue_by_region', 'arpa'],
  { ja: '企業規模', vi: 'quy mô' },
);

const planChanges: Question = {
  id: 'plan_changes',
  group: 'companies',
  ask: {
    ja: ['今月プランをアップグレードした企業は？', 'ダウングレードした企業はある？', 'プラン変更した顧客を教えて'],
    vi: ['Công ty nào nâng gói tháng này?', 'Có công ty nào hạ gói không?', 'Danh sách khách hàng đổi gói'],
  },
  keywords: ['アップグレード', 'ダウングレード', 'プラン変更', 'nang goi', 'ha goi', 'doi goi', 'upgrade', 'downgrade'],
  uses: { plan: true, topN: true },
  related: ['expansion', 'fastest_plan', 'top_companies_mrr'],
  needs: needCm,
  build(ctx) {
    const snap = cmSnapshot(ctx);
    if (!snap) return null;
    const changed = snap.rows.filter((r) => r.plan_change === 'upgrade' || r.plan_change === 'downgrade');
    const up = changed.filter((r) => r.plan_change === 'upgrade').length;
    const down = changed.length - up;
    const list = [...changed].sort((a, b) => Math.abs(n(b.mrr) - n(b.mrr_prev)) - Math.abs(n(a.mrr) - n(a.mrr_prev))).slice(0, topOf(ctx));
    const s = scopeOf(ctx);
    return {
      text:
        changed.length === 0
          ? tx(ctx.lang, `${snap.period}${s}にプランを変更した企業はありません。`, `${snap.period}${s}: không có công ty nào đổi gói.`)
          : tx(
              ctx.lang,
              `${snap.period}${s}はアップグレード ${count(up, 'ja')} 社、ダウングレード ${count(down, 'ja')} 社でした。`,
              `${snap.period}${s}: ${count(up, 'vi')} công ty nâng gói, ${count(down, 'vi')} công ty hạ gói.`,
            ),
      figures: [
        { label: ctx.label('plan_change', 'upgrade'), value: count(up, ctx.lang) },
        { label: ctx.label('plan_change', 'downgrade'), value: count(down, ctx.lang) },
      ],
      table: changed.length
        ? {
            head: [tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, '変更', 'Thay đổi'), tx(ctx.lang, '旧プラン → 新プラン', 'Gói cũ → mới'), tx(ctx.lang, 'MRR増減', 'MRR thay đổi')],
            numeric: [false, false, false, true],
            rows: list.map((r) => [
              String(r.company_name ?? ''),
              ctx.label('plan_change', String(r.plan_change)),
              `${r.plan_prev ? ctx.label('plan', String(r.plan_prev)) : '—'} → ${r.plan_id ? ctx.label('plan', String(r.plan_id)) : '—'}`,
              yen(n(r.mrr) - n(r.mrr_prev), ctx.lang),
            ]),
          }
        : undefined,
      basis: basisCm(ctx, '前月と今月でプランが変わった有料企業。MRR増減＝今月MRR−前月MRR。', 'công ty trả tiền có gói tháng này khác tháng trước. MRR thay đổi = MRR tháng này − tháng trước.'),
      period: snap.period,
      applied: applied(ctx, this),
    };
  },
};

const lowSeat: Question = {
  id: 'low_seat_companies',
  group: 'companies',
  ask: {
    ja: ['シートがあまり使われていない企業は？', 'シート利用率が低い顧客を教えて', '契約したのに使っていない会社は？'],
    vi: ['Công ty nào mua ghế nhưng ít dùng?', 'Khách hàng có tỉ lệ dùng ghế thấp?', 'Công ty nào ký hợp đồng mà không dùng?'],
  },
  keywords: ['シート', '利用率', '使われていない', 'it dung', 'ghe', 'khong dung'],
  uses: { plan: true, topN: true },
  related: ['seat_usage', 'no_key_feature', 'high_risk_list'],
  needs: needCm,
  build(ctx) {
    const snap = cmSnapshot(ctx);
    if (!snap) return null;
    const rated = snap.paying
      .map((r) => ({ r, u: seatUsage(n(r.mau), n(r.seat_users_end)) }))
      .filter((x): x is { r: Row; u: number } => x.u != null);
    const low = rated.filter((x) => x.u < 0.4);
    const list = [...rated].sort((a, b) => a.u - b.u || n(b.r.mrr) - n(a.r.mrr)).slice(0, topOf(ctx));
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${snap.period}${s}、有料企業 ${count(rated.length, 'ja')} 社のうち ${count(low.length, 'ja')} 社はシート利用率が40%未満です。利用率の低い順に表示します。`,
        `${snap.period}${s}: ${count(low.length, 'vi')} / ${count(rated.length, 'vi')} công ty trả tiền có tỉ lệ dùng ghế dưới 40%. Bảng xếp từ thấp nhất.`,
      ),
      figures: [{ label: tx(ctx.lang, '利用率40%未満', 'Dùng ghế < 40%'), value: count(low.length, ctx.lang) }],
      table: {
        head: [tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, 'プラン', 'Gói'), tx(ctx.lang, 'ユーザー数', 'Người dùng'), 'MAU', tx(ctx.lang, '利用率', 'Tỉ lệ'), 'MRR'],
        numeric: [false, false, true, true, true, true],
        rows: list.map(({ r, u }) => [...companyCells(ctx, r), count(n(r.seat_users_end), ctx.lang), count(n(r.mau), ctx.lang), pct(u, ctx.lang), yen(n(r.mrr), ctx.lang)]),
      },
      basis: basisCm(ctx, 'シート利用率＝MAU÷ユーザー数（シート）。有料企業のみ。月の途中は低めに出ます。', 'tỉ lệ dùng ghế = MAU ÷ số người dùng (ghế). Chỉ công ty trả tiền. Giữa tháng thì tỉ lệ thấp hơn thực tế.'),
      period: snap.period,
      applied: applied(ctx, this),
    };
  },
};

const noKey: Question = {
  id: 'no_key_feature',
  group: 'companies',
  ask: {
    ja: ['主要機能を使っていない企業は？', '重要機能の利用がゼロの顧客は何社？', 'コア機能を使っていない会社'],
    vi: ['Công ty nào không dùng tính năng chính?', 'Bao nhiêu khách hàng chưa dùng tính năng quan trọng?', 'Công ty không dùng tính năng cốt lõi'],
  },
  keywords: ['主要機能', '重要機能', 'コア機能', 'tinh nang chinh', 'tinh nang quan trong', 'cot loi', 'feature'],
  uses: { plan: true, topN: true },
  related: ['low_seat_companies', 'risk_reasons', 'high_risk_list'],
  needs: needCm,
  build(ctx) {
    const snap = cmSnapshot(ctx);
    if (!snap) return null;
    const zero = snap.paying.filter((r) => n(r.key_feature_events) === 0);
    const mrrZero = zero.reduce((s, r) => s + n(r.mrr), 0);
    const list = [...zero].sort((a, b) => n(b.mrr) - n(a.mrr)).slice(0, topOf(ctx));
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${snap.period}${s}、主要機能の利用が0の有料企業は ${count(zero.length, 'ja')} 社（MRR合計 ${yen(mrrZero, 'ja')}）です。MRRの大きい順に表示します。`,
        `${snap.period}${s}: ${count(zero.length, 'vi')} công ty trả tiền chưa dùng tính năng chính lần nào (tổng MRR ${yen(mrrZero, 'vi')}). Bảng xếp theo MRR.`,
      ),
      figures: [
        { label: tx(ctx.lang, '該当企業', 'Số công ty'), value: count(zero.length, ctx.lang) },
        { label: 'MRR', value: yen(mrrZero, ctx.lang) },
      ],
      table: zero.length
        ? {
            head: [tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, 'プラン', 'Gói'), 'MAU', tx(ctx.lang, '機能利用回数', 'Lượt dùng tính năng'), 'MRR'],
            numeric: [false, false, true, true, true],
            rows: list.map((r) => [...companyCells(ctx, r), count(n(r.mau), ctx.lang), count(n(r.feature_events), ctx.lang), yen(n(r.mrr), ctx.lang)]),
          }
        : undefined,
      basis: basisCm(ctx, '主要機能（is_key）の利用回数が今月0の有料企業。', 'công ty trả tiền có 0 lượt dùng tính năng chính trong tháng.'),
      period: snap.period,
      applied: applied(ctx, this),
    };
  },
};

const topActive: Question = {
  id: 'top_active_companies',
  group: 'companies',
  ask: {
    ja: ['一番よく使っている企業はどこ？', '利用時間が長い企業トップ10', 'アクティブな顧客企業を教えて'],
    vi: ['Công ty nào dùng sản phẩm nhiều nhất?', 'Công ty nào hoạt động nhiều nhất?', 'Top 10 công ty có thời gian sử dụng dài nhất', 'Khách hàng nào hoạt động tích cực nhất?'],
  },
  keywords: ['よく使って', 'アクティブ', '利用時間', 'dung nhieu', 'tich cuc', 'hoat dong'],
  uses: { plan: true, topN: true },
  related: ['top_users', 'top_companies_mrr', 'low_seat_companies'],
  needs: needCm,
  build(ctx) {
    const snap = cmSnapshot(ctx);
    if (!snap) return null;
    const list = [...snap.rows].sort((a, b) => n(b.active_minutes) - n(a.active_minutes)).slice(0, topOf(ctx));
    const top = list[0];
    if (!top) return null;
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${snap.period}${s}の利用時間トップは ${top.company_name}（${count(n(top.active_minutes), 'ja')} 分、MAU ${count(n(top.mau), 'ja')} 人）です。`,
        `${snap.period}${s}: công ty dùng nhiều nhất là ${top.company_name} (${count(n(top.active_minutes), 'vi')} phút, MAU ${count(n(top.mau), 'vi')} người).`,
      ),
      figures: [],
      table: {
        head: [tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, 'プラン', 'Gói'), 'MAU', tx(ctx.lang, '利用時間（分）', 'Phút dùng'), 'MRR'],
        numeric: [false, false, true, true, true],
        rows: list.map((r) => [...companyCells(ctx, r), count(n(r.mau), ctx.lang), count(n(r.active_minutes), ctx.lang), yen(n(r.mrr), ctx.lang)]),
      },
      basis: basisCm(ctx, '所属ユーザーの利用時間（分）の合計が大きい順。', 'xếp theo tổng số phút sử dụng của người dùng trong công ty.'),
      period: snap.period,
      applied: applied(ctx, this),
    };
  },
};

export const COMPANY_QUESTIONS: readonly Question[] = [topCompanies, byIndustry, byRegion, bySize, planChanges, lowSeat, noKey, topActive];
