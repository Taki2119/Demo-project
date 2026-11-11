// Sample questions — CHURN ALERT group. Sources: churn-watchlist (latest snapshot) · interventions-monthly ·
// churn-history (52 weeks, measures risk-score accuracy).
import type { Row } from '../../data/api';
import { BAND_ORDER, precisionByBand } from '../../data/churn';
import { ratio } from '../../data/metrics';
import { monthsOf } from '../../data/period';
import { dayLabel } from '../../ui/format';
import {
  applied, count, groupSum, lastN, n, pct, rangeText, rowsOf, scopeOf, topOf, tx, ymRow, yen,
  type Ctx, type Question,
} from '../kit';

const WL = 'churn-watchlist' as const;
const needWl = () => [{ source: WL, params: {} }];

function watch(ctx: Ctx): { rows: Row[]; period: string } | null {
  const all = rowsOf(ctx, WL);
  if (!all || all.length === 0) return null;
  const rows = ctx.slots.plan ? all.filter((r) => r.plan_id === ctx.slots.plan) : all;
  const d = typeof all[0]!.snapshot_date === 'string' ? (all[0]!.snapshot_date as string) : null;
  const period = d ? tx(ctx.lang, `${dayLabel(d, 'ja')}時点のスコア`, `Điểm rủi ro chụp ngày ${dayLabel(d, 'vi')}`) : '';
  return { rows, period };
}

const basisWl = (ctx: Ctx, ja: string, vi: string) =>
  tx(ctx.lang, `解約予兆ボード（毎週日曜に算出したリスクスコアの最新分）：${ja}`, `Trang Cảnh báo huỷ (điểm rủi ro mới nhất, chụp mỗi Chủ nhật): ${vi}`);

const bandLabel = (ctx: Ctx, b: string) => ctx.label('risk_band', b);

const riskBands: Question = {
  id: 'risk_bands',
  group: 'churn',
  ask: {
    ja: ['解約リスクが高い企業は何社？', 'リスク区分ごとの企業数は？', '解約しそうな顧客はどれくらいいる？'],
    vi: ['Có bao nhiêu công ty có rủi ro huỷ cao?', 'Số công ty theo mức rủi ro?', 'Bao nhiêu khách hàng có khả năng huỷ?'],
  },
  keywords: ['リスク', '解約しそう', '解約予兆', 'rui ro', 'kha nang huy', 'canh bao'],
  uses: { plan: true },
  related: ['high_risk_list', 'mrr_at_risk', 'cancel_scheduled'],
  needs: needWl,
  build(ctx) {
    const w = watch(ctx);
    if (!w) return null;
    const by = BAND_ORDER.map((b) => {
      const rs = w.rows.filter((r) => r.risk_band === b);
      return { b, n: rs.length, mrr: rs.reduce((s, r) => s + n(r.mrr), 0) };
    });
    const get = (b: string) => by.find((x) => x.b === b)!;
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${w.period}${s}、有料企業 ${count(w.rows.length, 'ja')} 社のうち「${bandLabel(ctx, 'cancel_scheduled')}」${count(get('cancel_scheduled').n, 'ja')} 社、「${bandLabel(ctx, 'high')}」${count(get('high').n, 'ja')} 社、「${bandLabel(ctx, 'medium')}」${count(get('medium').n, 'ja')} 社です。`,
        `${w.period}${s}: trong ${count(w.rows.length, 'vi')} công ty trả tiền có ${count(get('cancel_scheduled').n, 'vi')} "${bandLabel(ctx, 'cancel_scheduled')}", ${count(get('high').n, 'vi')} rủi ro "${bandLabel(ctx, 'high')}", ${count(get('medium').n, 'vi')} rủi ro "${bandLabel(ctx, 'medium')}".`,
      ),
      figures: [
        { label: bandLabel(ctx, 'cancel_scheduled'), value: count(get('cancel_scheduled').n, ctx.lang) },
        { label: bandLabel(ctx, 'high'), value: count(get('high').n, ctx.lang) },
      ],
      table: {
        head: [tx(ctx.lang, 'リスク区分', 'Mức rủi ro'), tx(ctx.lang, '企業数', 'Số công ty'), 'MRR', tx(ctx.lang, 'MRR構成比', 'Tỉ trọng MRR')],
        numeric: [false, true, true, true],
        rows: by.map((x) => [bandLabel(ctx, x.b), count(x.n, ctx.lang), yen(x.mrr, ctx.lang), pct(ratio(x.mrr, by.reduce((s2, y) => s2 + y.mrr, 0)), ctx.lang)]),
      },
      chart: { kind: 'bar', unit: 'count', points: by.map((x) => ({ x: bandLabel(ctx, x.b), y: x.n })) },
      basis: basisWl(ctx, '高＝スコア60以上、中＝30以上、解約予約は別区分。', 'Cao = điểm ≥ 60, Trung bình = ≥ 30; đang hẹn huỷ là mức riêng.'),
      period: w.period,
      applied: applied(ctx, this),
    };
  },
};

const cancelScheduled: Question = {
  id: 'cancel_scheduled',
  group: 'churn',
  ask: {
    ja: ['解約予約をしている企業は？', '解約が決まっている顧客の一覧', '今後解約予定の会社を教えて'],
    vi: ['Công ty nào đang hẹn huỷ?', 'Danh sách khách hàng đã đặt lịch huỷ', 'Những công ty sắp huỷ hợp đồng'],
  },
  keywords: ['解約予約', '解約予定', 'hen huy', 'sap huy', 'dat lich huy'],
  uses: { plan: true, topN: true },
  related: ['high_risk_list', 'mrr_at_risk', 'intervention_channel'],
  needs: needWl,
  build(ctx) {
    const w = watch(ctx);
    if (!w) return null;
    const rs = w.rows.filter((r) => r.risk_band === 'cancel_scheduled').sort((a, b) => n(b.mrr) - n(a.mrr));
    const mrr = rs.reduce((s, r) => s + n(r.mrr), 0);
    const list = rs.slice(0, topOf(ctx));
    const s = scopeOf(ctx);
    return {
      text:
        rs.length === 0
          ? tx(ctx.lang, `${w.period}${s}、解約予約中の企業はありません。`, `${w.period}${s}: không có công ty nào đang hẹn huỷ.`)
          : tx(
              ctx.lang,
              `${w.period}${s}、解約予約中の企業は ${count(rs.length, 'ja')} 社、MRR合計 ${yen(mrr, 'ja')} です。引き留めの対象として担当者と最終対応を確認してください。`,
              `${w.period}${s}: ${count(rs.length, 'vi')} công ty đang hẹn huỷ, tổng MRR ${yen(mrr, 'vi')}. Nên kiểm tra người phụ trách và lần chăm sóc gần nhất để giữ chân.`,
            ),
      figures: [
        { label: tx(ctx.lang, '企業数', 'Số công ty'), value: count(rs.length, ctx.lang) },
        { label: 'MRR', value: yen(mrr, ctx.lang) },
      ],
      table: rs.length
        ? {
            head: [tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, 'プラン', 'Gói'), 'MRR', tx(ctx.lang, '担当者', 'Phụ trách'), tx(ctx.lang, '最終対応', 'Chăm sóc gần nhất')],
            numeric: [false, false, true, false, false],
            rows: list.map((r) => [
              String(r.company_name ?? ''),
              r.plan_id ? ctx.label('plan', String(r.plan_id)) : '—',
              yen(n(r.mrr), ctx.lang),
              String(r.owner_name ?? '—'),
              typeof r.last_intervention_at === 'string' ? dayLabel(r.last_intervention_at.slice(0, 10), ctx.lang) : '—',
            ]),
          }
        : undefined,
      basis: basisWl(ctx, '解約予約（取り消されていない予約）がある有料企業、MRRの大きい順。', 'công ty trả tiền đang có lịch huỷ chưa rút lại, xếp theo MRR.'),
      period: w.period,
      applied: applied(ctx, this),
    };
  },
};

const highRisk: Question = {
  id: 'high_risk_list',
  group: 'churn',
  ask: {
    ja: ['リスクスコアが高い企業トップ10は？', '優先的にフォローすべき顧客は？', 'リスク「高」の企業一覧'],
    vi: ['Top 10 công ty có điểm rủi ro cao nhất?', 'Nên ưu tiên chăm sóc khách hàng nào?', 'Danh sách công ty rủi ro cao'],
  },
  keywords: ['リスクスコア', 'フォロー', '優先', 'diem rui ro', 'uu tien', 'cham soc', 'rui ro cao'],
  uses: { plan: true, topN: true },
  related: ['risk_reasons', 'cancel_scheduled', 'risk_by_owner'],
  needs: needWl,
  build(ctx) {
    const w = watch(ctx);
    if (!w) return null;
    const rs = w.rows.filter((r) => r.risk_band === 'high').sort((a, b) => n(b.risk_score) - n(a.risk_score) || n(b.mrr) - n(a.mrr));
    const list = rs.slice(0, topOf(ctx));
    const s = scopeOf(ctx);
    return {
      text:
        rs.length === 0
          ? tx(ctx.lang, `${w.period}${s}、リスク「${bandLabel(ctx, 'high')}」の企業はありません。`, `${w.period}${s}: không có công ty nào rủi ro "${bandLabel(ctx, 'high')}".`)
          : tx(
              ctx.lang,
              `${w.period}${s}、リスク「${bandLabel(ctx, 'high')}」は ${count(rs.length, 'ja')} 社です。スコアの高い順に表示します（最大100）。`,
              `${w.period}${s}: ${count(rs.length, 'vi')} công ty rủi ro "${bandLabel(ctx, 'high')}". Bảng xếp theo điểm (tối đa 100).`,
            ),
      figures: [{ label: tx(ctx.lang, '企業数', 'Số công ty'), value: count(rs.length, ctx.lang) }],
      table: rs.length
        ? {
            head: [tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, 'スコア', 'Điểm'), tx(ctx.lang, '主な理由', 'Lý do chính'), 'MRR', tx(ctx.lang, '担当者', 'Phụ trách')],
            numeric: [false, true, false, true, false],
            rows: list.map((r) => [
              String(r.company_name ?? ''),
              count(n(r.risk_score), ctx.lang),
              r.top_reason ? ctx.label('top_reason', String(r.top_reason)) : '—',
              yen(n(r.mrr), ctx.lang),
              String(r.owner_name ?? '—'),
            ]),
          }
        : undefined,
      basis: basisWl(ctx, 'スコア＝利用の減少・停止（≤40）＋シート未利用（≤20）＋主要機能の減少（≤30）＋支払い遅延（10）。60以上が「高」。', 'điểm = giảm/ngừng dùng (≤40) + ghế ít dùng (≤20) + giảm tính năng chính (≤30) + chậm thanh toán (10). Từ 60 là "Cao".'),
      period: w.period,
      applied: applied(ctx, this),
    };
  },
};

const riskReasons: Question = {
  id: 'risk_reasons',
  group: 'churn',
  ask: {
    ja: ['解約リスクの主な理由は？', 'なぜ解約リスクが高くなっている？', 'リスク要因の内訳'],
    vi: ['Lý do chính khiến khách có rủi ro huỷ?', 'Vì sao rủi ro huỷ tăng?', 'Phân tích các yếu tố rủi ro'],
  },
  keywords: ['理由', '要因', 'なぜ', 'ly do', 'yeu to', 'vi sao', 'tai sao', 'nguyen nhan', 'nguy co huy'],
  uses: { plan: true },
  related: ['high_risk_list', 'no_key_feature', 'low_seat_companies'],
  needs: needWl,
  build(ctx) {
    const w = watch(ctx);
    if (!w) return null;
    const risky = w.rows.filter((r) => r.risk_band === 'high' || r.risk_band === 'medium');
    const g = groupSum(risky.filter((r) => r.top_reason != null), 'top_reason', 'mrr').sort((a, b) => b.n - a.n);
    const top = g[0];
    const s = scopeOf(ctx);
    return {
      text: !top
        ? tx(ctx.lang, `${w.period}${s}、リスク「高」「中」の企業はありません。`, `${w.period}${s}: không có công ty rủi ro Cao hoặc Trung bình.`)
        : tx(
            ctx.lang,
            `${w.period}${s}、リスク「${bandLabel(ctx, 'high')}」「${bandLabel(ctx, 'medium')}」の ${count(risky.length, 'ja')} 社で最も多い主な理由は「${ctx.label('top_reason', top.code)}」（${count(top.n, 'ja')} 社）です。`,
            `${w.period}${s}: trong ${count(risky.length, 'vi')} công ty rủi ro Cao/Trung bình, lý do chính phổ biến nhất là "${ctx.label('top_reason', top.code)}" (${count(top.n, 'vi')} công ty).`,
          ),
      figures: [],
      table: g.length
        ? {
            head: [tx(ctx.lang, '主な理由', 'Lý do chính'), tx(ctx.lang, '企業数', 'Số công ty'), 'MRR'],
            numeric: [false, true, true],
            rows: g.map((x) => [ctx.label('top_reason', x.code), count(x.n, ctx.lang), yen(x.sum, ctx.lang)]),
          }
        : undefined,
      chart: g.length ? { kind: 'bar', unit: 'count', points: g.map((x) => ({ x: ctx.label('top_reason', x.code), y: x.n })) } : undefined,
      basis: basisWl(ctx, '主な理由＝スコアの内訳で最も点数が大きい項目。対象はリスク「高」「中」。', 'lý do chính = thành phần đóng góp nhiều điểm nhất. Chỉ xét công ty rủi ro Cao và Trung bình.'),
      period: w.period,
      applied: applied(ctx, this),
    };
  },
};

const mrrAtRisk: Question = {
  id: 'mrr_at_risk',
  group: 'churn',
  ask: {
    ja: ['解約リスクにさらされているMRRはいくら？', 'リスクのある売上は全体の何％？', '失うかもしれない売上は？'],
    vi: ['Bao nhiêu MRR đang có nguy cơ mất?', 'Doanh thu có rủi ro chiếm bao nhiêu phần trăm?', 'Có thể mất bao nhiêu doanh thu?'],
  },
  keywords: ['失う', 'さらされ', 'nguy co', 'co the mat', 'doanh thu rui ro'],
  uses: { plan: true },
  related: ['risk_bands', 'cancel_scheduled', 'churn_mrr'],
  needs: needWl,
  build(ctx) {
    const w = watch(ctx);
    if (!w) return null;
    const total = w.rows.reduce((s, r) => s + n(r.mrr), 0);
    const sumBand = (bands: string[]) => w.rows.filter((r) => bands.includes(String(r.risk_band))).reduce((s, r) => s + n(r.mrr), 0);
    const hard = sumBand(['cancel_scheduled', 'high']);
    const mid = sumBand(['medium']);
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${w.period}${s}、解約予約＋リスク「高」のMRRは ${yen(hard, 'ja')}（全体の ${pct(ratio(hard, total), 'ja')}）、「中」を含めると ${yen(hard + mid, 'ja')}（${pct(ratio(hard + mid, total), 'ja')}）です。`,
        `${w.period}${s}: MRR của nhóm hẹn huỷ + rủi ro Cao là ${yen(hard, 'vi')} (${pct(ratio(hard, total), 'vi')} tổng); tính cả Trung bình là ${yen(hard + mid, 'vi')} (${pct(ratio(hard + mid, total), 'vi')}).`,
      ),
      figures: [
        { label: tx(ctx.lang, '予約＋高', 'Hẹn huỷ + Cao'), value: yen(hard, ctx.lang), sub: pct(ratio(hard, total), ctx.lang) },
        { label: tx(ctx.lang, '中を含む', 'Gồm cả Trung bình'), value: yen(hard + mid, ctx.lang), sub: pct(ratio(hard + mid, total), ctx.lang) },
        { label: tx(ctx.lang, '全有料MRR', 'Tổng MRR trả tiền'), value: yen(total, ctx.lang) },
      ],
      basis: basisWl(ctx, '最新スコア時点の有料企業MRRをリスク区分で合計。構成比＝区分MRR÷全有料MRR。', 'cộng MRR công ty trả tiền theo mức rủi ro tại lần chấm điểm mới nhất. Tỉ trọng = MRR nhóm ÷ tổng MRR.'),
      period: w.period,
      applied: applied(ctx, this),
    };
  },
};

const riskByOwner: Question = {
  id: 'risk_by_owner',
  group: 'churn',
  ask: {
    ja: ['担当者ごとのリスク企業数は？', 'リスク企業を一番多く抱えている担当者は？', 'CS担当別のリスク状況'],
    vi: ['Mỗi người phụ trách có bao nhiêu công ty rủi ro?', 'Ai đang phụ trách nhiều công ty rủi ro nhất?', 'Tình hình rủi ro theo người phụ trách'],
  },
  keywords: ['担当者', '担当', 'phu trach', 'nhan vien', 'owner'],
  uses: { plan: true },
  related: ['high_risk_list', 'intervention_channel', 'cancel_scheduled'],
  needs: needWl,
  build(ctx) {
    const w = watch(ctx);
    if (!w) return null;
    const risky = w.rows.filter((r) => r.risk_band !== 'low');
    const g = groupSum(risky, 'owner_name', 'mrr').sort((a, b) => b.n - a.n || b.sum - a.sum);
    const none = tx(ctx.lang, '（未割当）', '(chưa phân công)');
    const top = g[0];
    const s = scopeOf(ctx);
    return {
      text: !top
        ? tx(ctx.lang, `${w.period}${s}、フォロー対象の企業はありません。`, `${w.period}${s}: không có công ty cần chăm sóc.`)
        : tx(
            ctx.lang,
            `${w.period}${s}、フォロー対象（「低」以外）${count(risky.length, 'ja')} 社のうち、最も多いのは ${top.code || none}（${count(top.n, 'ja')} 社、MRR ${yen(top.sum, 'ja')}）です。`,
            `${w.period}${s}: trong ${count(risky.length, 'vi')} công ty cần chăm sóc (khác mức Thấp), nhiều nhất là ${top.code || none} (${count(top.n, 'vi')} công ty, MRR ${yen(top.sum, 'vi')}).`,
          ),
      figures: [],
      table: g.length
        ? {
            head: [tx(ctx.lang, '担当者', 'Phụ trách'), tx(ctx.lang, '企業数', 'Số công ty'), 'MRR'],
            numeric: [false, true, true],
            rows: g.map((x) => [x.code || none, count(x.n, ctx.lang), yen(x.sum, ctx.lang)]),
          }
        : undefined,
      basis: basisWl(ctx, 'リスク「低」以外の企業を担当者ごとに集計。', 'gom công ty rủi ro (khác Thấp) theo người phụ trách.'),
      period: w.period,
      applied: applied(ctx, this),
    };
  },
};

// ── interventions ───────────────────────────────────────────────────────────
const IV = 'interventions-monthly' as const;
const needIv = () => [{ source: IV, params: {} }];

/** Save rate = saved ÷ (saved + churned + no response). "Pending" has no outcome yet ⇒ excluded. */
const decided = (x: { saved: number; churned: number; no_response: number }) => x.saved + x.churned + x.no_response;
const saveRate = (x: { saved: number; churned: number; no_response: number }) => ratio(x.saved, decided(x));

function interventionBy(ctx: Ctx, key: 'channel' | 'trigger', domain: string, q: Question) {
  const all = rowsOf(ctx, IV);
  if (!all || all.length === 0) return null;
  const months = lastN(monthsOf(all), 12);
  const rows = all.filter((r) => months.includes(ymRow(r)));
  const codes = [...new Set(rows.map((r) => String(r[key])))];
  const by = codes
    .map((code) => {
      const rs = rows.filter((r) => String(r[key]) === code);
      const sum = (k: string) => rs.reduce((s, r) => s + n(r[k]), 0);
      const x = { code, interventions: sum('interventions'), saved: sum('saved'), churned: sum('churned'), no_response: sum('no_response'), pending: sum('pending') };
      return { ...x, rate: saveRate(x) };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  const best = by[0];
  const range = rangeText(ctx.lang, months[0]!, months.at(-1)!);
  const lab = (c: string) => ctx.label(domain, c);
  return {
    text: !best
      ? tx(ctx.lang, `${range}の対応記録はありません。`, `${range}: chưa có lượt chăm sóc nào.`)
      : tx(
          ctx.lang,
          `${range}で継続率が最も高いのは「${lab(best.code)}」で ${pct(best.rate, 'ja')}（結果が出た ${count(decided(best), 'ja')} 件中 継続 ${count(best.saved, 'ja')} 件）です。`,
          `${range}: "${lab(best.code)}" có tỉ lệ giữ được cao nhất, ${pct(best.rate, 'vi')} (giữ được ${count(best.saved, 'vi')} / ${count(decided(best), 'vi')} lượt đã có kết quả).`,
        ),
    figures: [],
    table: by.length
      ? {
          head: [
            key === 'channel' ? tx(ctx.lang, 'チャネル', 'Kênh') : tx(ctx.lang, 'きっかけ', 'Nguồn kích hoạt'),
            tx(ctx.lang, '対応件数', 'Lượt'),
            ctx.label('intervention_outcome', 'saved'),
            ctx.label('intervention_outcome', 'churned'),
            ctx.label('intervention_outcome', 'pending'),
            tx(ctx.lang, '継続率', 'Tỉ lệ giữ được'),
          ],
          numeric: [false, true, true, true, true, true],
          rows: by.map((x) => [lab(x.code), count(x.interventions, ctx.lang), count(x.saved, ctx.lang), count(x.churned, ctx.lang), count(x.pending, ctx.lang), pct(x.rate, ctx.lang)]),
        }
      : undefined,
    chart: by.length ? { kind: 'bar' as const, unit: 'pct' as const, points: by.map((x) => ({ x: lab(x.code), y: x.rate })) } : undefined,
    basis: tx(
      ctx.lang,
      '解約予兆ボード：直近12か月（対応作成月）の対応記録。継続率＝継続÷（継続＋解約＋応答なし）。対応中は除外。',
      'Trang Cảnh báo huỷ: các lượt chăm sóc 12 tháng gần nhất (theo tháng tạo). Tỉ lệ giữ được = giữ được ÷ (giữ được + đã huỷ + không phản hồi); bỏ lượt đang xử lý.',
    ),
    period: range,
    applied: applied(ctx, q),
  };
}

const ivChannel: Question = {
  id: 'intervention_channel',
  group: 'churn',
  ask: {
    ja: ['どの対応チャネルが一番引き留めに効果的？', '電話・メール・打ち合わせの継続率を比べて', '引き留め施策の効果は？'],
    vi: ['Kênh chăm sóc nào giữ chân khách hiệu quả nhất?', 'So sánh tỉ lệ giữ được giữa gọi điện, email và họp', 'Hoạt động giữ chân khách có hiệu quả không?'],
  },
  keywords: ['チャネル', '引き留め', '効果', '電話', 'メール', 'kenh', 'giu chan', 'hieu qua', 'goi dien', 'email'],
  uses: {},
  related: ['intervention_trigger', 'risk_by_owner', 'cancel_scheduled'],
  needs: needIv,
  build(ctx) {
    return interventionBy(ctx, 'channel', 'intervention_channel', this);
  },
};

const ivTrigger: Question = {
  id: 'intervention_trigger',
  group: 'churn',
  ask: {
    ja: ['対応のきっかけ別の継続率は？', 'リスクスコアをきっかけにした対応は効果がある？', 'きっかけごとの引き留め結果'],
    vi: ['Tỉ lệ giữ được theo nguồn kích hoạt chăm sóc?', 'Chăm sóc dựa trên điểm rủi ro có hiệu quả không?', 'Kết quả giữ chân theo lý do bắt đầu chăm sóc'],
  },
  keywords: ['きっかけ', 'トリガー', 'nguon kich hoat', 'trigger', 'bat dau'],
  uses: {},
  related: ['intervention_channel', 'risk_accuracy', 'high_risk_list'],
  needs: needIv,
  build(ctx) {
    return interventionBy(ctx, 'trigger', 'intervention_trigger', this);
  },
};

const riskAccuracy: Question = {
  id: 'risk_accuracy',
  group: 'churn',
  ask: {
    ja: ['リスクスコアはどれくらい当たる？', 'リスク区分ごとの実際の解約率は？', '解約予兆スコアの精度'],
    vi: ['Điểm rủi ro dự đoán chính xác đến đâu?', 'Tỉ lệ huỷ thực tế theo từng mức rủi ro?', 'Độ chính xác của điểm cảnh báo huỷ'],
  },
  keywords: ['精度', '当たる', 'chinh xac', 'du doan', 'thuc te'],
  uses: { plan: true },
  related: ['risk_bands', 'high_risk_list', 'intervention_trigger'],
  needs: () => [{ source: 'churn-history', params: {} }],
  build(ctx) {
    const all = rowsOf(ctx, 'churn-history');
    if (!all || all.length === 0) return null;
    const rows = ctx.slots.plan ? all.filter((r) => r.plan_id === ctx.slots.plan) : all;
    const p = precisionByBand(rows);
    const get = (b: string) => p.find((x) => x.band === b)!;
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `過去のスコア${s}を90日後の結果と照合すると、「${bandLabel(ctx, 'high')}」の解約率は ${pct(get('high').churnRate, 'ja')}、「${bandLabel(ctx, 'low')}」は ${pct(get('low').churnRate, 'ja')} でした。区分が高いほど実際に解約しています。`,
        `Đối chiếu điểm rủi ro cũ${s} với kết quả 90 ngày sau: mức "${bandLabel(ctx, 'high')}" có tỉ lệ huỷ ${pct(get('high').churnRate, 'vi')}, mức "${bandLabel(ctx, 'low')}" chỉ ${pct(get('low').churnRate, 'vi')}. Mức càng cao thì càng hay huỷ thật.`,
      ),
      figures: [],
      table: {
        head: [tx(ctx.lang, 'リスク区分', 'Mức rủi ro'), tx(ctx.lang, '判定数', 'Số lần chấm'), tx(ctx.lang, '90日以内の解約率', 'Tỉ lệ huỷ trong 90 ngày')],
        numeric: [false, true, true],
        rows: p.map((x) => [bandLabel(ctx, x.band), count(x.n, ctx.lang), pct(x.churnRate, ctx.lang)]),
      },
      chart: { kind: 'bar', unit: 'pct', points: p.map((x) => ({ x: bandLabel(ctx, x.band), y: x.churnRate })) },
      basis: tx(
        ctx.lang,
        '解約予兆ボード：過去52週の毎週のスコアのうち、90日後の結果が出ているもの。解約率＝90日以内に解約した判定÷判定数。',
        'Trang Cảnh báo huỷ: điểm chấm hằng tuần trong 52 tuần, chỉ lấy lần chấm đã đủ 90 ngày để biết kết quả. Tỉ lệ huỷ = số lần chấm mà công ty huỷ trong 90 ngày ÷ số lần chấm.',
      ),
      period: tx(ctx.lang, '過去52週', '52 tuần gần nhất'),
      applied: applied(ctx, this),
    };
  },
};

export const CHURN_QUESTIONS: readonly Question[] = [
  riskBands, cancelScheduled, highRisk, riskReasons, mrrAtRisk, riskByOwner, ivChannel, ivTrigger, riskAccuracy,
];

