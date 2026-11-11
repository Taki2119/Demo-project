// ─────────────────────────────────────────────────────────────────────────────
// Bộ câu hỏi mẫu của "Hỏi AI" (bản DEMO — không gọi AI thật) + đường đi câu gõ tự do:
//   câu gõ ──match()──▶ đủ gần ⇒ trả lời câu mẫu gần nhất + gợi ý câu liên quan
//                     └ chưa đủ gần ⇒ chỉ gợi ý các câu gần nhất
// Thứ tự trong QUESTIONS = thứ tự ưu tiên khi điểm bằng nhau (câu phổ biến trước).
// ─────────────────────────────────────────────────────────────────────────────
import type { Lang } from '../ui/i18n';
import type { Question } from './kit';
import { ANSWER_MIN, buildIndex, fold, match, type MatchResult, type PlanNames, type Slots } from './match';
import { CHURN_QUESTIONS } from './q/churn';
import { COMPANY_QUESTIONS } from './q/companies';
import { REVENUE_QUESTIONS } from './q/revenue';
import { USER_QUESTIONS } from './q/users';

export const QUESTIONS: readonly Question[] = [...REVENUE_QUESTIONS, ...USER_QUESTIONS, ...COMPANY_QUESTIONS, ...CHURN_QUESTIONS];

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const questionById = (id: string): Question | undefined => BY_ID.get(id);

/** Câu hiện trên nút gợi ý = cách hỏi đầu tiên của ngôn ngữ đang chọn. */
export const promptOf = (q: Question, lang: Lang): string => q.ask[lang][0]!;

// Chỉ mục dựng MỘT lần, gộp cả hai ngôn ngữ: người dùng gõ tiếng Nhật khi giao diện đang là tiếng
// Việt (hoặc ngược lại) vẫn khớp được.
let index: ReturnType<typeof buildIndex> | null = null;
function getIndex() {
  index ??= buildIndex(QUESTIONS.map((q) => ({ id: q.id, phrasings: [...q.ask.ja, ...q.ask.vi], keywords: q.keywords })));
  return index;
}

/** Câu phổ biến — bù cho gợi ý khi câu gõ lạc đề. */
export const STARTERS: readonly string[] = ['mrr_now', 'mrr_trend', 'mau', 'top_users', 'top_companies_mrr', 'revenue_by_industry', 'risk_bands', 'cancel_scheduled'];

/** 3 câu gợi ý khi ô chat còn trống (một câu mỗi chủ đề lớn). Danh sách câu mẫu đầy đủ KHÔNG hiện. */
export const WELCOME: readonly string[] = ['mrr_now', 'top_companies_mrr', 'risk_bands'];

/** Gợi ý theo chữ đang gõ: tối đa AUTO_MAX câu. */
export const AUTO_MAX = 3;
const AUTO_MIN = 0.2;

export interface AutoItem {
  id: string;
  /** Câu hiện ra (ngôn ngữ đang chọn) — Tab điền câu này vào ô chat. */
  text: string;
}

/**
 * Tự gợi ý khi đang gõ:
 *   1. câu mẫu (ngôn ngữ đang chọn) CHỨA NGUYÊN chữ đang gõ (đã fold: không dấu vẫn khớp) — xếp theo
 *      độ gần, hiện đúng cách hỏi chứa chữ đó;
 *   2. còn chỗ ⇒ bù bằng câu so gần đúng (≥ AUTO_MIN).
 * Dưới 2 ký tự ⇒ không gợi ý (gõ 1 chữ thì cái gì cũng "khớp").
 */
export function autocomplete(input: string, lang: Lang, names: PlanNames = {}): AutoItem[] {
  const f = fold(input).replace(/\s+/g, ' ').trim();
  if (f.replace(/ /g, '').length < 2) return [];
  const contains = new Map<string, string>();
  for (const q of QUESTIONS) {
    const hit = q.ask[lang].find((p) => fold(p).includes(f));
    if (hit) contains.set(q.id, hit);
  }
  const ranked = match(getIndex(), input, names).ranked;
  const out: AutoItem[] = [];
  const push = (id: string, text: string) => {
    if (out.length < AUTO_MAX && !out.some((x) => x.id === id)) out.push({ id, text });
  };
  for (const r of ranked) if (contains.has(r.id)) push(r.id, contains.get(r.id)!);
  for (const r of ranked) if (r.score >= AUTO_MIN) push(r.id, promptOf(BY_ID.get(r.id)!, lang));
  return out;
}

export type Resolution =
  | { kind: 'answer'; question: Question; slots: Slots; score: number; related: Question[] }
  | { kind: 'suggest'; slots: Slots; suggestions: Question[] };

/** Ngưỡng để một câu được coi là "hơi gần" khi gợi ý (dưới ngưỡng trả lời ANSWER_MIN). */
const SUGGEST_MIN = 0.15;
export const SUGGEST_COUNT = 4;

/** Câu gõ tự do → trả lời câu mẫu gần nhất, hoặc gợi ý. */
export function resolve(query: string, names: PlanNames = {}): Resolution {
  const m: MatchResult = match(getIndex(), query, names);
  if (m.best) {
    const question = BY_ID.get(m.best.id)!;
    return { kind: 'answer', question, slots: m.slots, score: m.best.score, related: relatedOf(question, m) };
  }
  // Câu hơi gần lên trước, bù bằng câu phổ biến cho đủ 4 gợi ý.
  const near = m.ranked.filter((r) => r.score >= SUGGEST_MIN).map((r) => r.id);
  const ids = [...new Set([...near, ...STARTERS])].slice(0, SUGGEST_COUNT);
  return { kind: 'suggest', slots: m.slots, suggestions: ids.map((id) => BY_ID.get(id)!) };
}

/** Bấm nút gợi ý: trả lời đúng câu đó, không qua so khớp. */
export function resolveId(id: string, slots: Slots = { plan: null, topN: null }): Resolution | null {
  const question = BY_ID.get(id);
  if (!question) return null;
  return { kind: 'answer', question, slots, score: 1, related: relatedOf(question) };
}

/** 3 câu liên quan: câu khớp GẦN NGANG câu được chọn (≥ ngưỡng trả lời — người hỏi có thể muốn câu
 *  đó) lên trước, rồi danh sách `related` viết tay. Câu khớp yếu không chen vào. */
function relatedOf(q: Question, m?: MatchResult): Question[] {
  const close = (m?.ranked.slice(1, 3) ?? []).filter((r) => r.score >= ANSWER_MIN).map((r) => r.id);
  const ids = [...close, ...q.related];
  return [...new Set(ids)].filter((id) => id !== q.id).slice(0, 3).map((id) => BY_ID.get(id)!);
}
