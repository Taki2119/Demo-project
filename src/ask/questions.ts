// ─────────────────────────────────────────────────────────────────────────────
// Sample question set of "Ask AI" (DEMO version — no real AI call) + the path of a free-typed query:
//   typed query ──match()──▶ close enough ⇒ answer the closest sample question + suggest related ones
//                          └ not close enough ⇒ only suggest the closest questions
// Order in QUESTIONS = priority order on equal scores (common questions first).
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

/** Text on the suggestion button = first phrasing in the selected language. */
export const promptOf = (q: Question, lang: Lang): string => q.ask[lang][0]!;

// Index built ONCE, merging both languages: a user typing Japanese while the UI is in Vietnamese
// (or vice versa) still gets a match.
let index: ReturnType<typeof buildIndex> | null = null;
function getIndex() {
  index ??= buildIndex(QUESTIONS.map((q) => ({ id: q.id, phrasings: [...q.ask.ja, ...q.ask.vi], keywords: q.keywords })));
  return index;
}

/** Common questions — fill up the suggestions when the typed query is off-topic. */
export const STARTERS: readonly string[] = ['mrr_now', 'mrr_trend', 'mau', 'top_users', 'top_companies_mrr', 'revenue_by_industry', 'risk_bands', 'cancel_scheduled'];

/** 3 suggestions while the chat is still empty (one per major topic). The full sample list is NOT shown. */
export const WELCOME: readonly string[] = ['mrr_now', 'top_companies_mrr', 'risk_bands'];

/** Suggestions based on the text being typed: at most AUTO_MAX questions. */
export const AUTO_MAX = 3;
const AUTO_MIN = 0.2;

export interface AutoItem {
  id: string;
  /** Displayed text (selected language) — Tab fills this into the chat input. */
  text: string;
}

/**
 * Autocomplete while typing:
 *   1. sample questions (selected language) that CONTAIN the typed text verbatim (folded: matches without
 *      diacritics too) — ranked by closeness, showing the exact phrasing that contains it;
 *   2. room left ⇒ fill with fuzzy matches (≥ AUTO_MIN).
 * Under 2 characters ⇒ no suggestions (a single letter "matches" everything).
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

/** Threshold for a question to count as "somewhat close" when suggesting (below the ANSWER_MIN answer threshold). */
const SUGGEST_MIN = 0.15;
export const SUGGEST_COUNT = 4;

/** Free-typed query → answer the closest sample question, or suggest. */
export function resolve(query: string, names: PlanNames = {}): Resolution {
  const m: MatchResult = match(getIndex(), query, names);
  if (m.best) {
    const question = BY_ID.get(m.best.id)!;
    return { kind: 'answer', question, slots: m.slots, score: m.best.score, related: relatedOf(question, m) };
  }
  // Somewhat-close questions first, topped up with common ones to make 4 suggestions.
  const near = m.ranked.filter((r) => r.score >= SUGGEST_MIN).map((r) => r.id);
  const ids = [...new Set([...near, ...STARTERS])].slice(0, SUGGEST_COUNT);
  return { kind: 'suggest', slots: m.slots, suggestions: ids.map((id) => BY_ID.get(id)!) };
}

/** Suggestion button clicked: answer exactly that question, no matching. */
export function resolveId(id: string, slots: Slots = { plan: null, topN: null }): Resolution | null {
  const question = BY_ID.get(id);
  if (!question) return null;
  return { kind: 'answer', question, slots, score: 1, related: relatedOf(question) };
}

/** 3 related questions: ones that matched ALMOST AS WELL as the chosen one (≥ answer threshold — the asker
 *  may have meant that one) come first, then the hand-written `related` list. Weak matches don't get in. */
function relatedOf(q: Question, m?: MatchResult): Question[] {
  const close = (m?.ranked.slice(1, 3) ?? []).filter((r) => r.score >= ANSWER_MIN).map((r) => r.id);
  const ids = [...close, ...q.related];
  return [...new Set(ids)].filter((id) => id !== q.id).slice(0, 3).map((id) => BY_ID.get(id)!);
}
