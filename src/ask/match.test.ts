import { describe, expect, it } from 'vitest';
import { extractSlots, features, fold } from './match';
import { AUTO_MAX, autocomplete, QUESTIONS, resolve, SUGGEST_COUNT } from './questions';

const NAMES = {
  starter: { ja: 'スターター', vi: 'Khởi đầu' },
  growth: { ja: 'グロース', vi: 'Tăng trưởng' },
  scale: { ja: 'スケール', vi: 'Mở rộng' },
};

describe('fold — normalize for comparison', () => {
  it('Latin diacritics stripped, đ → d, lowercase, NFKC', () => {
    expect(fold('Doanh Thu ĐƯỢC bao nhiêu')).toBe('doanh thu duoc bao nhieu');
    expect(fold('ＭＲＲ')).toBe('mrr');
  });
  it('does NOT strip kana marks (が does not become か)', () => {
    expect(fold('解約が多い')).toBe('解約が多い');
    expect(fold('ｸﾞﾛｰｽ')).toBe('グロース');
  });
  it('features: words + word pairs; Japanese bigrams; pure numbers dropped', () => {
    const f = features(fold('Doanh thu 2026 theo ngành'));
    expect(f.has('w:doanh')).toBe(true);
    expect(f.has('p:doanh thu')).toBe(true);
    expect([...f].some((x) => x.includes('2026'))).toBe(false);
    expect(features('解約率').has('j:解約')).toBe(true);
  });
});

describe('extractSlots — plan + top N', () => {
  it('top N in many spellings, capped at 50', () => {
    expect(extractSlots(fold('top 5 công ty')).slots.topN).toBe(5);
    expect(extractSlots(fold('上位20社')).slots.topN).toBe(20);
    expect(extractSlots(fold('15 người dùng nhiều nhất')).slots.topN).toBe(15);
    expect(extractSlots(fold('top 500')).slots.topN).toBe(50);
    expect(extractSlots(fold('MRR tháng 11')).slots.topN).toBeNull();
  });
  it('plan: code, ja label, vi label ONLY after the word "gói"', () => {
    expect(extractSlots(fold('MRR growth'), NAMES).slots.plan).toBe('growth');
    expect(extractSlots(fold('グロースのMRR'), NAMES).slots.plan).toBe('growth');
    expect(extractSlots(fold('MRR gói Tăng trưởng'), NAMES).slots.plan).toBe('growth');
    expect(extractSlots(fold('mrr goi mo rong'), NAMES).slots.plan).toBe('scale');
    // "tăng trưởng MRR", "MRR mở rộng" are ordinary meanings, not plan names
    expect(extractSlots(fold('tăng trưởng MRR'), NAMES).slots.plan).toBeNull();
    expect(extractSlots(fold('MRR mở rộng'), NAMES).slots.plan).toBeNull();
    // no DB labels yet ⇒ the code is still recognized
    expect(extractSlots(fold('scale plan')).slots.plan).toBe('scale');
  });
});

describe('every sample question matches itself', () => {
  for (const q of QUESTIONS) {
    for (const p of [...q.ask.ja, ...q.ask.vi]) {
      it(`${q.id}: ${p}`, () => {
        const r = resolve(p, NAMES);
        expect(r.kind).toBe('answer');
        if (r.kind === 'answer') expect(r.question.id).toBe(q.id);
      });
    }
  }
});

// Queries phrased DIFFERENTLY from the sample questions — this is the table used to tune the threshold
// (ANSWER_MIN); don't change expectations to fit the code: add phrasings / keywords to the sample question.
const PARAPHRASES: [string, string][] = [
  // Vietnamese with diacritics
  ['MRR bây giờ bao nhiêu', 'mrr_now'],
  ['doanh thu hiện tại', 'mrr_now'],
  ['tỉ trọng doanh thu của từng gói', 'mrr_by_plan'],
  ['MRR một năm qua thay đổi ra sao', 'mrr_trend'],
  ['gói nào đang tăng trưởng tốt nhất', 'fastest_plan'],
  ['khách hàng mới tháng này mang về bao nhiêu MRR', 'new_mrr'],
  ['tháng rồi mất bao nhiêu doanh thu do khách huỷ', 'churn_mrr'],
  ['NRR', 'nrr_12m'],
  ['net revenue retention', 'nrr_12m'],
  ['phân tích biến động MRR', 'mrr_breakdown'],
  ['upsell và thu hẹp', 'expansion'],
  ['ARPA', 'arpa'],
  ['bao nhiêu khách hàng đang trả tiền', 'paying_companies'],
  ['tỉ lệ huỷ hàng tháng', 'logo_churn'],
  ['còn bao nhiêu hoá đơn chưa thu tiền', 'collection'],
  ['số người dùng hoạt động tháng này', 'mau'],
  ['DAU/MAU theo gói', 'stickiness'],
  ['có bao nhiêu user mới', 'new_users'],
  ['ghế đã mua có được dùng hết không', 'seat_usage'],
  ['ai dùng nhiều nhất', 'top_users'],
  ['top 5 người dùng tích cực', 'top_users'],
  ['người dùng không hoạt động', 'inactive_users'],
  ['10 khách hàng lớn nhất', 'top_companies_mrr'],
  ['doanh thu theo ngành nghề', 'revenue_by_industry'],
  ['khách hàng ở khu vực nào nhiều nhất', 'revenue_by_region'],
  ['doanh thu theo quy mô doanh nghiệp', 'revenue_by_size'],
  ['ai đã nâng gói', 'plan_changes'],
  ['công ty dùng ít ghế', 'low_seat_companies'],
  ['khách không dùng tính năng chính', 'no_key_feature'],
  ['công ty hoạt động nhiều nhất', 'top_active_companies'],
  ['có bao nhiêu công ty rủi ro', 'risk_bands'],
  ['ai sắp huỷ hợp đồng', 'cancel_scheduled'],
  ['danh sách khách rủi ro cao cần ưu tiên', 'high_risk_list'],
  ['tại sao khách có nguy cơ huỷ', 'risk_reasons'],
  ['doanh thu đang có nguy cơ mất', 'mrr_at_risk'],
  ['nhân viên nào phụ trách nhiều khách rủi ro', 'risk_by_owner'],
  ['gọi điện hay email hiệu quả hơn', 'intervention_channel'],
  ['điểm rủi ro có chính xác không', 'risk_accuracy'],
  // Vietnamese WITHOUT diacritics
  ['mrr hien tai bao nhieu', 'mrr_now'],
  ['doanh thu theo nganh', 'revenue_by_industry'],
  ['cong ty nao sap huy', 'cancel_scheduled'],
  ['ti le dung ghe', 'seat_usage'],
  ['khach hang moi thang nay', 'new_mrr'],
  // Japanese
  ['MRRいくら？', 'mrr_now'],
  ['今の売上', 'mrr_now'],
  ['プランごとの売上構成', 'mrr_by_plan'],
  ['MRRの推移を見たい', 'mrr_trend'],
  ['一番伸びたプラン', 'fastest_plan'],
  ['新規の売上', 'new_mrr'],
  ['解約で減った売上', 'churn_mrr'],
  ['NRRは？', 'nrr_12m'],
  ['MRRの内訳', 'mrr_breakdown'],
  ['顧客単価', 'arpa'],
  ['有料顧客数', 'paying_companies'],
  ['毎月の解約率', 'logo_churn'],
  ['未入金はいくら', 'collection'],
  ['MAUは何人？', 'mau'],
  ['DAU/MAU', 'stickiness'],
  ['新しいユーザー数', 'new_users'],
  ['シートの利用率', 'seat_usage'],
  ['よく使っているユーザー上位5人', 'top_users'],
  ['使っていないユーザー', 'inactive_users'],
  ['売上トップ10の企業', 'top_companies_mrr'],
  ['業種別の売上', 'revenue_by_industry'],
  ['地域ごとの顧客', 'revenue_by_region'],
  ['規模別の売上', 'revenue_by_size'],
  ['アップグレードした会社', 'plan_changes'],
  ['シートを使っていない会社', 'low_seat_companies'],
  ['主要機能を使っていない会社', 'no_key_feature'],
  ['リスクの高い企業数', 'risk_bands'],
  ['解約予定の会社', 'cancel_scheduled'],
  ['優先してフォローすべき企業', 'high_risk_list'],
  ['リスクの理由', 'risk_reasons'],
  ['担当者別のリスク', 'risk_by_owner'],
  ['電話とメールどちらが効果的？', 'intervention_channel'],
  ['スコアの精度', 'risk_accuracy'],
];

describe('queries phrased differently from the samples still get the right answer', () => {
  it.each(PARAPHRASES)('%s → %s', (text, id) => {
    const r = resolve(text, NAMES);
    expect(r.kind === 'answer' ? r.question.id : `suggest(${r.suggestions.map((q) => q.id).join(',')})`).toBe(id);
  });
});

describe('off-topic query ⇒ suggestions only, no random answer', () => {
  it.each(['thời tiết hôm nay thế nào', '今日の天気は？', 'asdfgh qwerty', '', '   ', 'xin chào', 'こんにちは'])('%s', (text) => {
    const r = resolve(text, NAMES);
    expect(r.kind).toBe('suggest');
    if (r.kind === 'suggest') {
      expect(r.suggestions).toHaveLength(SUGGEST_COUNT);
      expect(new Set(r.suggestions.map((q) => q.id)).size).toBe(SUGGEST_COUNT);
    }
  });
});

describe('answers come with suggestions + parameters', () => {
  it('an answer always has 3 related questions, never itself', () => {
    for (const q of QUESTIONS) {
      const r = resolve(q.ask.vi[0]!, NAMES);
      if (r.kind !== 'answer') throw new Error(q.id);
      expect(r.related).toHaveLength(3);
      expect(r.related.map((x) => x.id)).not.toContain(r.question.id);
    }
  });
  it('plan + top N carry over to the answer', () => {
    const r = resolve('top 5 công ty MRR lớn nhất gói Tăng trưởng', NAMES);
    expect(r.kind).toBe('answer');
    if (r.kind === 'answer') {
      expect(r.question.id).toBe('top_companies_mrr');
      expect(r.slots).toEqual({ plan: 'growth', topN: 5 });
    }
  });
  it('somewhat close query ⇒ on-topic suggestions', () => {
    const r = resolve('khách hàng', NAMES);
    const ids = r.kind === 'answer' ? [r.question.id, ...r.related.map((q) => q.id)] : r.suggestions.map((q) => q.id);
    expect(ids.length).toBeGreaterThan(0);
  });
});

describe('autocomplete — suggestions while typing', () => {
  const ids = (text: string, lang: 'ja' | 'vi' = 'vi') => autocomplete(text, lang, NAMES).map((x) => x.id);
  it('under 2 characters or garbage text ⇒ no suggestions', () => {
    expect(ids('m')).toEqual([]);
    expect(ids('  ')).toEqual([]);
    expect(ids('zxqv')).toEqual([]);
  });
  it('at most 3, no duplicates, shown in the selected language', () => {
    for (const t of ['mrr', 'doanh thu', 'cong ty', 'người dùng', '解約', 'ユーザー', 'top']) {
      const r = autocomplete(t, 'vi', NAMES);
      expect(r.length, t).toBeLessThanOrEqual(AUTO_MAX);
      expect(new Set(r.map((x) => x.id)).size).toBe(r.length);
    }
    for (const x of autocomplete('MRR', 'ja', NAMES)) expect(x.text).toMatch(/[\u3040-\u30ff\u4e00-\u9fff]/);
  });
  it('partial input still finds the right topic (with / without diacritics / Japanese)', () => {
    expect(ids('MRR hiện')).toContain('mrr_now');
    expect(ids('doanh thu theo ng')).toContain('revenue_by_industry');
    expect(ids('cong ty sap h')).toContain('cancel_scheduled');
    expect(ids('解約予', 'ja')).toContain('cancel_scheduled');
    expect(ids('業種', 'ja')).toContain('revenue_by_industry');
  });
  it('the shown question CONTAINS the typed text when such a sample exists (Tab fills in exactly that question)', () => {
    const r = autocomplete('hen huy', 'vi', NAMES);
    expect(r.length).toBeGreaterThan(0);
    expect(fold(r[0]!.text)).toContain('hen huy');
  });
});
