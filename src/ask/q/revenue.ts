// Câu hỏi mẫu — nhóm DOANH THU. Nguồn duy nhất: revenue-monthly (bảng tháng × gói).
import { arpa, collectionRate, grossMrrChurn, logoChurn, nrr, ratio } from '../../data/metrics';
import type { Row } from '../../data/api';
import {
  addMonths, applied, count, deltaText, lastClosed, lastN, monthly, monthLabel, monthText, n, pct, rangeText, rowAtYm,
  rowsOf, scopeOf, series, tx, ymRow, yen, type Answer, type Ctx, type Question,
} from '../kit';

const REV = 'revenue-monthly' as const;
const needRev = () => [{ source: REV, params: {} }];
const PLANS = ['starter', 'growth', 'scale'] as const;

const basisRev = (ctx: Ctx, ja: string, vi: string) =>
  tx(ctx.lang, `売上ボード：${ja}${ctx.slots.plan ? '' : '全プラン合計。'}`, `Bảng Doanh thu: ${vi}${ctx.slots.plan ? '' : ' Cộng mọi gói.'}`);

/** Dòng tháng mới nhất của từng gói (cho các câu so sánh giữa các gói). */
function latestByPlan(ctx: Ctx): { plan: string; row: Row }[] | null {
  const rows = rowsOf(ctx, REV);
  if (!rows || rows.length === 0) return null;
  const latest = rows.map(ymRow).sort().at(-1)!;
  return PLANS.map((plan) => ({ plan, row: rows.find((r) => r.plan_id === plan && ymRow(r) === latest) })).filter(
    (x): x is { plan: (typeof PLANS)[number]; row: Row } => x.row != null,
  );
}

const mrrNow: Question = {
  id: 'mrr_now',
  group: 'revenue',
  ask: {
    ja: ['今のMRRはいくら？先月と比べてどう？', '現在の月次売上（MRR）を教えて', 'MRRは前月比で増えた？減った？', 'MRRはいくら？'],
    vi: ['MRR hiện tại là bao nhiêu, so với tháng trước thế nào?', 'Doanh thu định kỳ tháng này là bao nhiêu?', 'MRR tăng hay giảm so với tháng trước?'],
  },
  keywords: ['mrr', '月次売上', '売上', '今', '現在', 'doanh thu', 'doanh thu dinh ky', 'hien tai', 'bay gio'],
  uses: { plan: true },
  related: ['mrr_trend', 'mrr_by_plan', 'mrr_breakdown'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const L = rows.at(-1)!;
    const P = rows.at(-2) ?? null;
    const now = n(L.mrr_end);
    const before = P ? n(P.mrr_end) : null;
    const d = deltaText(ctx.lang, now, before, 'yen');
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}${s}のMRRは ${yen(now, 'ja')} です。${P ? `前月（${monthLabel(ymRow(P), 'ja')}）比 ${d}。` : ''}`,
        `MRR${s} ${monthText('vi', L)} là ${yen(now, 'vi')}.${P ? ` So với ${monthLabel(ymRow(P), 'vi')}: ${d}.` : ''}`,
      ),
      figures: [
        { label: 'MRR', value: yen(now, ctx.lang) },
        { label: tx(ctx.lang, '前月比', 'So với tháng trước'), value: d },
        { label: tx(ctx.lang, '有料企業数', 'Công ty trả tiền'), value: count(n(L.paying_companies), ctx.lang) },
      ],
      chart: { kind: 'line', unit: 'yen', goodWhen: 'up', label: 'MRR', points: series(ctx.lang, lastN(rows, 12), (r) => n(r.mrr_end)) },
      basis: basisRev(ctx, '月末MRR＝各月の測定日時点で有効な契約のMRR合計。', 'MRR cuối tháng = tổng MRR của các hợp đồng còn hiệu lực tại ngày chốt số của tháng.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const mrrByPlan: Question = {
  id: 'mrr_by_plan',
  group: 'revenue',
  ask: {
    ja: ['プラン別のMRRと構成比は？', 'どのプランが一番売上が大きい？', 'プランごとの売上を比較して'],
    vi: ['MRR theo từng gói và tỉ trọng?', 'Gói nào mang lại doanh thu lớn nhất?', 'So sánh doanh thu giữa các gói'],
  },
  keywords: ['プラン別', 'theo goi', 'ti trong', '構成比'],
  uses: {},
  related: ['fastest_plan', 'arpa', 'mrr_now'],
  needs: needRev,
  build(ctx) {
    const by = latestByPlan(ctx);
    if (!by || by.length === 0) return null;
    const total = by.reduce((s, x) => s + n(x.row.mrr_end), 0);
    const sorted = [...by].sort((a, b) => n(b.row.mrr_end) - n(a.row.mrr_end));
    const top = sorted[0]!;
    const L = top.row;
    const share = ratio(n(top.row.mrr_end), total);
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}は「${ctx.label('plan', top.plan)}」が最大で、MRR ${yen(n(top.row.mrr_end), 'ja')}（全体の ${pct(share, 'ja')}）です。全プラン合計は ${yen(total, 'ja')}。`,
        `${monthText('vi', L)}, gói "${ctx.label('plan', top.plan)}" lớn nhất với MRR ${yen(n(top.row.mrr_end), 'vi')} (${pct(share, 'vi')} tổng). Tổng mọi gói: ${yen(total, 'vi')}.`,
      ),
      figures: [{ label: tx(ctx.lang, '全プラン合計MRR', 'Tổng MRR mọi gói'), value: yen(total, ctx.lang) }],
      table: {
        head: [tx(ctx.lang, 'プラン', 'Gói'), 'MRR', tx(ctx.lang, '構成比', 'Tỉ trọng'), tx(ctx.lang, '有料企業数', 'Công ty trả tiền'), 'ARPA'],
        numeric: [false, true, true, true, true],
        rows: sorted.map(({ plan, row }) => [
          ctx.label('plan', plan),
          yen(n(row.mrr_end), ctx.lang),
          pct(ratio(n(row.mrr_end), total), ctx.lang),
          count(n(row.paying_companies), ctx.lang),
          yen(arpa(n(row.mrr_end), n(row.paying_companies)), ctx.lang),
        ]),
      },
      chart: { kind: 'bar', unit: 'yen', points: sorted.map(({ plan, row }) => ({ x: ctx.label('plan', plan), y: n(row.mrr_end) })) },
      basis: tx(ctx.lang, '売上ボード：最新月のプラン別月末MRR。構成比＝プランMRR÷全プラン合計。', 'Bảng Doanh thu: MRR cuối tháng mới nhất theo gói. Tỉ trọng = MRR gói ÷ tổng mọi gói.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const mrrTrend: Question = {
  id: 'mrr_trend',
  group: 'revenue',
  ask: {
    ja: ['過去12か月のMRRの推移は？', 'MRRはこの1年でどれくらい伸びた？', '売上のトレンドを見せて'],
    vi: ['Xu hướng MRR 12 tháng qua?', 'MRR tăng bao nhiêu trong một năm qua?', 'Cho xem diễn biến doanh thu theo tháng', 'MRR thay đổi thế nào trong một năm?'],
  },
  keywords: ['推移', 'トレンド', '1年', 'xu huong', 'dien bien', 'thay doi', 'nam qua', 'tang truong'],
  uses: { plan: true },
  related: ['mrr_now', 'fastest_plan', 'nrr_12m'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const win = lastN(rows, 12);
    const first = win[0]!;
    const L = win.at(-1)!;
    const peak = win.reduce((a, b) => (n(b.mrr_end) > n(a.mrr_end) ? b : a));
    const d = deltaText(ctx.lang, n(L.mrr_end), n(first.mrr_end), 'yen');
    const s = scopeOf(ctx);
    const range = rangeText(ctx.lang, ymRow(first), ymRow(L));
    return {
      text: tx(
        ctx.lang,
        `${range}${s}のMRRは ${yen(n(first.mrr_end), 'ja')} → ${yen(n(L.mrr_end), 'ja')}、増減は ${d}。最も高かったのは ${monthLabel(ymRow(peak), 'ja')} の ${yen(n(peak.mrr_end), 'ja')} です。`,
        `${range}${s}: MRR ${yen(n(first.mrr_end), 'vi')} → ${yen(n(L.mrr_end), 'vi')}, thay đổi ${d}. Cao nhất là ${monthLabel(ymRow(peak), 'vi')} với ${yen(n(peak.mrr_end), 'vi')}.`,
      ),
      figures: [
        { label: tx(ctx.lang, '期首MRR', 'MRR đầu kỳ'), value: yen(n(first.mrr_end), ctx.lang), sub: monthLabel(ymRow(first), ctx.lang) },
        { label: tx(ctx.lang, '最新MRR', 'MRR mới nhất'), value: yen(n(L.mrr_end), ctx.lang), sub: monthLabel(ymRow(L), ctx.lang) },
        { label: tx(ctx.lang, '増減', 'Thay đổi'), value: d },
      ],
      chart: { kind: 'line', unit: 'yen', goodWhen: 'up', label: 'MRR', points: series(ctx.lang, win, (r) => n(r.mrr_end)) },
      basis: basisRev(ctx, '各月の月末MRR（直近12か月）。', 'MRR cuối tháng của 12 tháng gần nhất.'),
      period: range,
      applied: applied(ctx, this),
    };
  },
};

const fastestPlan: Question = {
  id: 'fastest_plan',
  group: 'revenue',
  ask: {
    ja: ['この6か月でMRRが一番伸びたプランは？', 'プラン別の成長率を比べて', '伸びているプランはどれ？'],
    vi: ['Gói nào tăng MRR nhanh nhất trong 6 tháng qua?', 'So sánh tốc độ tăng trưởng giữa các gói', 'Gói nào đang tăng mạnh nhất?'],
  },
  keywords: ['成長率', '伸び', 'tang nhanh', 'tang truong', 'toc do'],
  uses: {},
  related: ['mrr_by_plan', 'mrr_trend', 'plan_changes'],
  needs: needRev,
  build(ctx) {
    const rows = rowsOf(ctx, REV);
    if (!rows || rows.length === 0) return null;
    const latest = rows.map(ymRow).sort().at(-1)!;
    const base = addMonths(latest, -6);
    const list = PLANS.map((plan) => {
      const now = rows.find((r) => r.plan_id === plan && ymRow(r) === latest);
      const was = rows.find((r) => r.plan_id === plan && ymRow(r) === base);
      const a = now ? n(now.mrr_end) : null;
      const b = was ? n(was.mrr_end) : null;
      return { plan, a, b, rate: a != null && b != null ? ratio(a - b, Math.abs(b)) : null };
    }).sort((x, y) => (y.rate ?? -Infinity) - (x.rate ?? -Infinity));
    const top = list[0]!;
    const range = rangeText(ctx.lang, base, latest);
    if (top.rate == null) return null;
    return {
      text: tx(
        ctx.lang,
        `${range}で最も伸びたのは「${ctx.label('plan', top.plan)}」で、MRRは ${yen(top.b, 'ja')} → ${yen(top.a, 'ja')}（${top.rate >= 0 ? '+' : ''}${pct(top.rate, 'ja')}）です。`,
        `${range}, gói "${ctx.label('plan', top.plan)}" tăng nhanh nhất: MRR từ ${yen(top.b, 'vi')} lên ${yen(top.a, 'vi')} (${top.rate >= 0 ? '+' : ''}${pct(top.rate, 'vi')}).`,
      ),
      figures: [],
      table: {
        head: [tx(ctx.lang, 'プラン', 'Gói'), monthLabel(base, ctx.lang), monthLabel(latest, ctx.lang), tx(ctx.lang, '成長率', 'Tăng trưởng')],
        numeric: [false, true, true, true],
        rows: list.map((x) => [ctx.label('plan', x.plan), yen(x.b, ctx.lang), yen(x.a, ctx.lang), pct(x.rate, ctx.lang)]),
      },
      chart: { kind: 'bar', unit: 'pct', points: list.map((x) => ({ x: ctx.label('plan', x.plan), y: x.rate })) },
      basis: tx(ctx.lang, '売上ボード：プラン別月末MRRを6か月前と比較。成長率＝（最新−6か月前）÷6か月前。プラン変更による移動も含みます。', 'Bảng Doanh thu: MRR cuối tháng theo gói, so với 6 tháng trước. Tăng trưởng = (mới nhất − 6 tháng trước) ÷ 6 tháng trước. Có tính cả khách đổi gói.'),
      period: range,
      applied: applied(ctx, this),
    };
  },
};

const newMrr: Question = {
  id: 'new_mrr',
  group: 'revenue',
  ask: {
    ja: ['今月の新規MRRはいくら？', '新規契約は何社増えた？', '新しく獲得した売上は？'],
    vi: ['MRR mới tháng này là bao nhiêu?', 'Có bao nhiêu công ty mới ký hợp đồng?', 'Doanh thu từ khách hàng mới tháng này?'],
  },
  keywords: ['新規', '獲得', 'khach moi', 'cong ty moi', 'mrr moi', 'new'],
  uses: { plan: true },
  related: ['churn_mrr', 'mrr_breakdown', 'paying_companies'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const L = rows.at(-1)!;
    const P = rows.at(-2) ?? null;
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}${s}の新規MRRは ${yen(n(L.new_mrr), 'ja')}（新規 ${count(n(L.new_companies), 'ja')} 社）です。${P ? `前月は ${yen(n(P.new_mrr), 'ja')}（${count(n(P.new_companies), 'ja')} 社）。` : ''}`,
        `MRR mới${s} ${monthText('vi', L)}: ${yen(n(L.new_mrr), 'vi')} từ ${count(n(L.new_companies), 'vi')} công ty mới.${P ? ` Tháng trước: ${yen(n(P.new_mrr), 'vi')} (${count(n(P.new_companies), 'vi')} công ty).` : ''}`,
      ),
      figures: [
        { label: tx(ctx.lang, '新規MRR', 'MRR mới'), value: yen(n(L.new_mrr), ctx.lang) },
        { label: tx(ctx.lang, '新規企業数', 'Công ty mới'), value: count(n(L.new_companies), ctx.lang) },
        { label: tx(ctx.lang, '復帰MRR', 'MRR quay lại'), value: yen(n(L.reactivation_mrr), ctx.lang) },
      ],
      chart: { kind: 'bar', unit: 'yen', points: series(ctx.lang, lastN(rows, 12), (r) => n(r.new_mrr)) },
      basis: basisRev(ctx, '新規MRR＝前月MRR 0 で今月初めて有料になった企業のMRR。', 'MRR mới = MRR của công ty lần đầu trả tiền trong tháng (tháng trước MRR = 0).'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const churnMrr: Question = {
  id: 'churn_mrr',
  group: 'revenue',
  ask: {
    ja: ['先月、解約で失ったMRRはいくら？', '解約による売上の減少は？', 'グロスMRRチャーン率は？'],
    vi: ['Tháng trước mất bao nhiêu MRR vì khách huỷ?', 'Doanh thu giảm do huỷ hợp đồng là bao nhiêu?', 'Tỉ lệ mất MRR gộp (gross churn) là bao nhiêu?'],
  },
  keywords: ['解約', 'チャーン', '減った', '失った', 'churn', 'huy', 'mat mrr', 'mat doanh thu'],
  uses: { plan: true },
  related: ['logo_churn', 'mrr_breakdown', 'risk_bands'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const C = lastClosed(rows);
    if (!C) return null;
    const before = rowAtYm(rows, addMonths(ymRow(C), -1));
    const g = before ? grossMrrChurn(n(C.churned_mrr), n(C.contraction_mrr), n(before.mrr_end)) : null;
    const s = scopeOf(ctx);
    const closed = rows.filter((r) => r.is_closed === true);
    return {
      text: tx(
        ctx.lang,
        `${monthLabel(ymRow(C), 'ja')}${s}は解約で ${yen(-n(C.churned_mrr), 'ja')}（${count(n(C.churned_companies), 'ja')} 社）、縮小で ${yen(-n(C.contraction_mrr), 'ja')} を失いました。グロスMRRチャーン率は ${pct(g, 'ja')} です。`,
        `${monthLabel(ymRow(C), 'vi')}${s}: mất ${yen(-n(C.churned_mrr), 'vi')} vì huỷ (${count(n(C.churned_companies), 'vi')} công ty) và ${yen(-n(C.contraction_mrr), 'vi')} vì thu hẹp. Tỉ lệ mất MRR gộp: ${pct(g, 'vi')}.`,
      ),
      figures: [
        { label: tx(ctx.lang, '解約MRR', 'MRR mất vì huỷ'), value: yen(-n(C.churned_mrr), ctx.lang) },
        { label: tx(ctx.lang, '解約企業数', 'Công ty huỷ'), value: count(n(C.churned_companies), ctx.lang) },
        { label: tx(ctx.lang, 'グロスMRRチャーン率', 'Tỉ lệ mất MRR gộp'), value: pct(g, ctx.lang) },
      ],
      chart: { kind: 'bar', unit: 'yen', points: series(ctx.lang, lastN(closed, 12), (r) => -n(r.churned_mrr)) },
      basis: basisRev(
        ctx,
        '確定済みの直近月。グロスMRRチャーン率＝（解約MRR＋縮小MRR）÷月初MRR（前月末MRR）。',
        'Tháng đã chốt gần nhất. Tỉ lệ mất MRR gộp = (MRR huỷ + MRR thu hẹp) ÷ MRR đầu tháng (MRR cuối tháng trước).',
      ),
      period: monthLabel(ymRow(C), ctx.lang),
      applied: applied(ctx, this),
    };
  },
};

const nrr12: Question = {
  id: 'nrr_12m',
  group: 'revenue',
  ask: {
    ja: ['直近12か月のNRR（売上継続率）は？', '既存顧客からの売上は維持できている？', 'ネットレベニューリテンションを教えて'],
    vi: ['NRR 12 tháng gần nhất là bao nhiêu?', 'Doanh thu từ khách hàng cũ có giữ được không?', 'Tỉ lệ giữ doanh thu (net revenue retention)?'],
  },
  keywords: ['nrr', '継続率', 'リテンション', 'retention', 'giu doanh thu', 'khach cu', '既存顧客'],
  uses: {},
  related: ['churn_mrr', 'expansion', 'mrr_trend'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV, 'all');
    if (!rows) return null;
    const closed = rows.filter((r) => r.is_closed === true);
    const win = lastN(closed, 12);
    if (win.length === 0) return null;
    const start = rowAtYm(rows, addMonths(ymRow(win[0]!), -1));
    const sum = (k: string) => win.reduce((s, r) => s + n(r[k]), 0);
    const parts = { expansion: sum('expansion_mrr'), contraction: sum('contraction_mrr'), churned: sum('churned_mrr'), planIn: sum('plan_in_mrr'), planOut: sum('plan_out_mrr') };
    const v = start && win.length === 12 ? nrr({ mrrStart: n(start.mrr_end), ...parts }) : null;
    const range = rangeText(ctx.lang, ymRow(win[0]!), ymRow(win.at(-1)!));
    return {
      text:
        v == null
          ? tx(ctx.lang, `NRRの計算には確定済み12か月＋その前月のデータが必要ですが、まだ揃っていません。`, `Cần đủ 12 tháng đã chốt và tháng liền trước để tính NRR; dữ liệu chưa đủ.`)
          : tx(
              ctx.lang,
              `${range}のNRRは ${pct(v, 'ja')} です。期首MRR ${yen(n(start!.mrr_end), 'ja')} に対し、拡大 ${yen(parts.expansion, 'ja')}、縮小 ${yen(parts.contraction, 'ja')}、解約 ${yen(parts.churned, 'ja')}。${v >= 1 ? '既存顧客だけで売上が増えています。' : '既存顧客の売上は減少しています。'}`,
              `NRR ${range}: ${pct(v, 'vi')}. Trên MRR đầu kỳ ${yen(n(start!.mrr_end), 'vi')}: mở rộng ${yen(parts.expansion, 'vi')}, thu hẹp ${yen(parts.contraction, 'vi')}, huỷ ${yen(parts.churned, 'vi')}. ${v >= 1 ? 'Chỉ riêng khách cũ, doanh thu vẫn tăng.' : 'Doanh thu từ khách cũ đang giảm.'}`,
            ),
      figures: [
        { label: 'NRR', value: pct(v, ctx.lang) },
        { label: tx(ctx.lang, '拡大MRR', 'MRR mở rộng'), value: yen(parts.expansion, ctx.lang) },
        { label: tx(ctx.lang, '解約MRR', 'MRR huỷ'), value: yen(parts.churned, ctx.lang) },
      ],
      basis: tx(
        ctx.lang,
        '売上ボード：全プラン合計、確定済みの直近12か月。NRR＝（期首MRR＋拡大＋縮小＋解約＋プラン変更）÷期首MRR。新規・復帰は含めません。',
        'Bảng Doanh thu: cộng mọi gói, 12 tháng đã chốt gần nhất. NRR = (MRR đầu kỳ + mở rộng + thu hẹp + huỷ + đổi gói) ÷ MRR đầu kỳ. Không tính khách mới và khách quay lại.',
      ),
      period: range,
      applied: applied(ctx, this),
    };
  },
};

const MOVES = ['new_mrr', 'reactivation_mrr', 'expansion_mrr', 'contraction_mrr', 'churned_mrr'] as const;
const MOVE_CODE: Record<(typeof MOVES)[number], string> = {
  new_mrr: 'new', reactivation_mrr: 'reactivation', expansion_mrr: 'expansion', contraction_mrr: 'contraction', churned_mrr: 'churn',
};

const mrrBreakdown: Question = {
  id: 'mrr_breakdown',
  group: 'revenue',
  ask: {
    ja: ['先月のMRRの増減の内訳は？', 'MRRの変動要因を分解して', '新規・拡大・縮小・解約の内訳を教えて'],
    vi: ['Biến động MRR tháng trước gồm những gì?', 'Phân tích nguyên nhân MRR tăng giảm', 'MRR mới, mở rộng, thu hẹp, huỷ tháng trước là bao nhiêu?'],
  },
  keywords: ['内訳', '要因', '変動', 'bien dong', 'phan tich', 'nguyen nhan'],
  uses: { plan: true },
  related: ['new_mrr', 'churn_mrr', 'expansion'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const C = lastClosed(rows);
    if (!C) return null;
    const before = rowAtYm(rows, addMonths(ymRow(C), -1));
    const net = before ? n(C.mrr_end) - n(before.mrr_end) : null;
    const planNet = n(C.plan_in_mrr) + n(C.plan_out_mrr);
    const items = MOVES.map((k) => ({ code: MOVE_CODE[k], v: n(C[k]) }));
    if (ctx.slots.plan) items.push({ code: 'plan_in', v: planNet });
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${monthLabel(ymRow(C), 'ja')}${s}のMRRは差し引き ${yen(net, 'ja')} 変動しました。内訳は新規 ${yen(n(C.new_mrr), 'ja')}、拡大 ${yen(n(C.expansion_mrr), 'ja')}、縮小 ${yen(n(C.contraction_mrr), 'ja')}、解約 ${yen(n(C.churned_mrr), 'ja')} です。`,
        `${monthLabel(ymRow(C), 'vi')}${s}, MRR thay đổi ròng ${yen(net, 'vi')}: mới ${yen(n(C.new_mrr), 'vi')}, mở rộng ${yen(n(C.expansion_mrr), 'vi')}, thu hẹp ${yen(n(C.contraction_mrr), 'vi')}, huỷ ${yen(n(C.churned_mrr), 'vi')}.`,
      ),
      figures: [{ label: tx(ctx.lang, '純増減', 'Thay đổi ròng'), value: yen(net, ctx.lang) }],
      table: {
        head: [tx(ctx.lang, '区分', 'Loại'), 'MRR'],
        numeric: [false, true],
        rows: items.map((x) => [x.code === 'plan_in' ? tx(ctx.lang, 'プラン変更（純額）', 'Đổi gói (ròng)') : ctx.label('movement', x.code), yen(x.v, ctx.lang)]),
      },
      basis: basisRev(ctx, '確定済みの直近月のMRR変動（新規・復帰・拡大・縮小・解約）。', 'Biến động MRR của tháng đã chốt gần nhất (mới · quay lại · mở rộng · thu hẹp · huỷ).'),
      period: monthLabel(ymRow(C), ctx.lang),
      applied: applied(ctx, this),
    };
  },
};

const expansion: Question = {
  id: 'expansion',
  group: 'revenue',
  ask: {
    ja: ['拡大MRRと縮小MRRはどちらが多い？', 'アップセルはどれくらい？', 'この半年の拡大と縮小の推移'],
    vi: ['MRR mở rộng và thu hẹp bên nào nhiều hơn?', 'Upsell được bao nhiêu?', 'Mở rộng và thu hẹp 6 tháng qua thế nào?'],
  },
  keywords: ['拡大', '縮小', 'アップセル', 'upsell', 'mo rong', 'thu hep', 'expansion', 'contraction'],
  uses: { plan: true },
  related: ['nrr_12m', 'plan_changes', 'mrr_breakdown'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const win = lastN(rows.filter((r) => r.is_closed === true), 6);
    if (win.length === 0) return null;
    const ex = win.reduce((s, r) => s + n(r.expansion_mrr), 0);
    const co = win.reduce((s, r) => s + n(r.contraction_mrr), 0);
    const range = rangeText(ctx.lang, ymRow(win[0]!), ymRow(win.at(-1)!));
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${range}${s}の拡大MRRは合計 ${yen(ex, 'ja')}、縮小MRRは ${yen(co, 'ja')}。差し引き ${yen(ex + co, 'ja')} で、${ex + co >= 0 ? '拡大が上回っています' : '縮小が上回っています'}。`,
        `${range}${s}: MRR mở rộng tổng ${yen(ex, 'vi')}, thu hẹp ${yen(co, 'vi')}. Ròng ${yen(ex + co, 'vi')} — ${ex + co >= 0 ? 'mở rộng nhiều hơn' : 'thu hẹp nhiều hơn'}.`,
      ),
      figures: [
        { label: tx(ctx.lang, '拡大MRR', 'MRR mở rộng'), value: yen(ex, ctx.lang) },
        { label: tx(ctx.lang, '縮小MRR', 'MRR thu hẹp'), value: yen(co, ctx.lang) },
      ],
      table: {
        head: [tx(ctx.lang, '月', 'Tháng'), tx(ctx.lang, '拡大', 'Mở rộng'), tx(ctx.lang, '縮小', 'Thu hẹp'), tx(ctx.lang, '差し引き', 'Ròng')],
        numeric: [false, true, true, true],
        rows: win.map((r) => [monthLabel(ymRow(r), ctx.lang), yen(n(r.expansion_mrr), ctx.lang), yen(n(r.contraction_mrr), ctx.lang), yen(n(r.expansion_mrr) + n(r.contraction_mrr), ctx.lang)]),
      },
      basis: basisRev(ctx, '確定済みの直近6か月の拡大MRR・縮小MRR（既存企業の契約変更）。', 'Mở rộng / thu hẹp MRR (khách cũ đổi hợp đồng) của 6 tháng đã chốt gần nhất.'),
      period: range,
      applied: applied(ctx, this),
    };
  },
};

const arpaQ: Question = {
  id: 'arpa',
  group: 'revenue',
  ask: {
    ja: ['1社あたりの平均MRR（ARPA）は？', '顧客単価はいくら？', 'プラン別のARPAを教えて'],
    vi: ['MRR trung bình mỗi công ty (ARPA) là bao nhiêu?', 'Mỗi khách hàng trả trung bình bao nhiêu?', 'ARPA theo từng gói?'],
  },
  keywords: ['arpa', '単価', '平均', 'trung binh', 'moi cong ty', 'moi khach'],
  uses: {},
  related: ['mrr_by_plan', 'paying_companies', 'mrr_now'],
  needs: needRev,
  build(ctx) {
    const all = monthly(ctx, REV, 'all');
    const by = latestByPlan(ctx);
    if (!all || !by) return null;
    const L = all.at(-1)!;
    const P = all.at(-2) ?? null;
    const a = arpa(n(L.mrr_end), n(L.paying_companies));
    const b = P ? arpa(n(P.mrr_end), n(P.paying_companies)) : null;
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}の全プランARPAは ${yen(a, 'ja')} です（前月 ${yen(b, 'ja')}）。`,
        `ARPA mọi gói ${monthText('vi', L)}: ${yen(a, 'vi')} (tháng trước ${yen(b, 'vi')}).`,
      ),
      figures: [{ label: 'ARPA', value: yen(a, ctx.lang) }, { label: tx(ctx.lang, '前月', 'Tháng trước'), value: yen(b, ctx.lang) }],
      table: {
        head: [tx(ctx.lang, 'プラン', 'Gói'), 'ARPA', 'MRR', tx(ctx.lang, '有料企業数', 'Công ty trả tiền')],
        numeric: [false, true, true, true],
        rows: by.map(({ plan, row }) => [ctx.label('plan', plan), yen(arpa(n(row.mrr_end), n(row.paying_companies)), ctx.lang), yen(n(row.mrr_end), ctx.lang), count(n(row.paying_companies), ctx.lang)]),
      },
      basis: tx(ctx.lang, '売上ボード：ARPA＝月末MRR÷有料企業数。', 'Bảng Doanh thu: ARPA = MRR cuối tháng ÷ số công ty trả tiền.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const paying: Question = {
  id: 'paying_companies',
  group: 'revenue',
  ask: {
    ja: ['有料の顧客は何社？', '契約企業数の推移は？', 'トライアル中の企業は何社？'],
    vi: ['Có bao nhiêu công ty đang trả tiền?', 'Số công ty khách hàng thay đổi thế nào?', 'Bao nhiêu công ty đang dùng thử?'],
  },
  keywords: ['企業数', '顧客数', '社数', 'トライアル', 'so cong ty', 'khach hang', 'dung thu', 'trial'],
  uses: { plan: true },
  related: ['new_mrr', 'logo_churn', 'arpa'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const L = rows.at(-1)!;
    const P = rows.at(-2) ?? null;
    const s = scopeOf(ctx);
    const d = deltaText(ctx.lang, n(L.paying_companies), P ? n(P.paying_companies) : null, 'count');
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}${s}の有料企業は ${count(n(L.paying_companies), 'ja')} 社（前月比 ${d}）、トライアル中は ${count(n(L.trial_companies), 'ja')} 社です。`,
        `${monthText('vi', L)}${s}: ${count(n(L.paying_companies), 'vi')} công ty trả tiền (so với tháng trước ${d}), ${count(n(L.trial_companies), 'vi')} công ty đang dùng thử.`,
      ),
      figures: [
        { label: tx(ctx.lang, '有料企業数', 'Công ty trả tiền'), value: count(n(L.paying_companies), ctx.lang) },
        { label: tx(ctx.lang, '前月比', 'So với tháng trước'), value: d },
        { label: tx(ctx.lang, 'トライアル', 'Dùng thử'), value: count(n(L.trial_companies), ctx.lang) },
      ],
      chart: { kind: 'line', unit: 'count', goodWhen: 'up', label: tx(ctx.lang, '有料企業数', 'Công ty trả tiền'), points: series(ctx.lang, lastN(rows, 12), (r) => n(r.paying_companies)) },
      basis: basisRev(ctx, '有料企業＝測定日時点でMRR＞0の企業。トライアル＝プランはあるがMRR 0 の企業。', 'Công ty trả tiền = MRR > 0 tại ngày chốt số. Dùng thử = có gói nhưng MRR = 0.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const logoChurnQ: Question = {
  id: 'logo_churn',
  group: 'revenue',
  ask: {
    ja: ['解約率（社数ベース）は？', '毎月何社くらい解約している？', 'ロゴチャーンの推移'],
    vi: ['Tỉ lệ huỷ theo số công ty là bao nhiêu?', 'Mỗi tháng có bao nhiêu công ty huỷ?', 'Diễn biến tỉ lệ huỷ (logo churn)'],
  },
  keywords: ['解約率', 'ロゴ', 'logo', 'ti le huy', 'cong ty huy'],
  uses: { plan: true },
  related: ['churn_mrr', 'risk_bands', 'cancel_scheduled'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const rate = (r: Row) => {
      const b = rowAtYm(rows, addMonths(ymRow(r), -1));
      return b ? logoChurn(n(r.churned_companies), n(b.paying_companies)) : null;
    };
    const closed = rows.filter((r) => r.is_closed === true);
    const C = closed.at(-1);
    if (!C) return null;
    const win = lastN(closed, 12);
    const total = win.reduce((s, r) => s + n(r.churned_companies), 0);
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${monthLabel(ymRow(C), 'ja')}${s}の解約は ${count(n(C.churned_companies), 'ja')} 社、解約率は ${pct(rate(C), 'ja')} です。直近12か月の解約は合計 ${count(total, 'ja')} 社。`,
        `${monthLabel(ymRow(C), 'vi')}${s}: ${count(n(C.churned_companies), 'vi')} công ty huỷ, tỉ lệ huỷ ${pct(rate(C), 'vi')}. 12 tháng gần nhất: tổng ${count(total, 'vi')} công ty huỷ.`,
      ),
      figures: [
        { label: tx(ctx.lang, '解約率', 'Tỉ lệ huỷ'), value: pct(rate(C), ctx.lang) },
        { label: tx(ctx.lang, '解約企業数', 'Công ty huỷ'), value: count(n(C.churned_companies), ctx.lang) },
      ],
      chart: { kind: 'line', unit: 'pct', goodWhen: 'down', label: tx(ctx.lang, '解約率', 'Tỉ lệ huỷ'), points: series(ctx.lang, win, rate) },
      basis: basisRev(ctx, '解約率＝その月の解約企業数÷前月末の有料企業数（確定済みの月）。', 'Tỉ lệ huỷ = số công ty huỷ trong tháng ÷ số công ty trả tiền cuối tháng trước (tháng đã chốt).'),
      period: monthLabel(ymRow(C), ctx.lang),
      applied: applied(ctx, this),
    };
  },
};

const collection: Question = {
  id: 'collection',
  group: 'revenue',
  ask: {
    ja: ['請求した金額は回収できている？', '未入金の請求はいくら？', '回収率を教えて'],
    vi: ['Tiền xuất hoá đơn đã thu về được chưa?', 'Hoá đơn chưa thu là bao nhiêu?', 'Tỉ lệ thu tiền là bao nhiêu?'],
  },
  keywords: ['請求', '入金', '回収', '未入金', 'hoa don', 'thu tien', 'chua thu', 'cong no'],
  uses: { plan: true },
  related: ['mrr_now', 'risk_reasons', 'churn_mrr'],
  needs: needRev,
  build(ctx) {
    const rows = monthly(ctx, REV);
    if (!rows) return null;
    const C = lastClosed(rows);
    if (!C) return null;
    const win = lastN(rows.filter((r) => r.is_closed === true), 12);
    const unpaid12 = win.reduce((s, r) => s + n(r.unpaid_amount), 0);
    const rate = collectionRate(n(C.paid_amount), n(C.invoiced_amount));
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${monthLabel(ymRow(C), 'ja')}${s}の請求額 ${yen(n(C.invoiced_amount), 'ja')} のうち入金済みは ${yen(n(C.paid_amount), 'ja')}（回収率 ${pct(rate, 'ja')}）、未入金は ${yen(n(C.unpaid_amount), 'ja')} です。直近12か月の未入金合計は ${yen(unpaid12, 'ja')}。`,
        `${monthLabel(ymRow(C), 'vi')}${s}: xuất hoá đơn ${yen(n(C.invoiced_amount), 'vi')}, đã thu ${yen(n(C.paid_amount), 'vi')} (tỉ lệ thu ${pct(rate, 'vi')}), chưa thu ${yen(n(C.unpaid_amount), 'vi')}. Tổng chưa thu 12 tháng: ${yen(unpaid12, 'vi')}.`,
      ),
      figures: [
        { label: tx(ctx.lang, '回収率', 'Tỉ lệ thu tiền'), value: pct(rate, ctx.lang) },
        { label: tx(ctx.lang, '未入金', 'Chưa thu'), value: yen(n(C.unpaid_amount), ctx.lang) },
        { label: tx(ctx.lang, '12か月の未入金', 'Chưa thu 12 tháng'), value: yen(unpaid12, ctx.lang) },
      ],
      chart: { kind: 'bar', unit: 'yen', points: series(ctx.lang, win, (r) => n(r.unpaid_amount)) },
      basis: basisRev(ctx, '請求月ごとの請求額（取消を除く）・入金済み・未入金（未入金＋回収不能）。回収率＝入金済み÷請求額。', 'Theo tháng của hoá đơn: tiền xuất (trừ hoá đơn đã huỷ), đã thu, chưa thu (chưa thu + không thu được). Tỉ lệ thu = đã thu ÷ đã xuất.'),
      period: monthLabel(ymRow(C), ctx.lang),
      applied: applied(ctx, this),
    };
  },
};

export const REVENUE_QUESTIONS: readonly Question[] = [
  mrrNow, mrrByPlan, mrrTrend, fastestPlan, newMrr, churnMrr, nrr12, mrrBreakdown, expansion, arpaQ, paying, logoChurnQ, collection,
];

export type { Answer };
