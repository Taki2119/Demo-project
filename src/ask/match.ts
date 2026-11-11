// ─────────────────────────────────────────────────────────────────────────────
// FUZZY MATCHING of the user's typed question ↔ the sample question set ("Ask AI" demo version, no real AI call).
//
// No 100% match needed:
//   · NFKC normalization + lowercase; Latin letters have DIACRITICS STRIPPED ("doanh thu" = "doanh thu") — only
//     Latin characters are stripped, kana is NOT touched (stripping kana marks would turn が into か);
//   · Vietnamese / Latin ⇒ words + adjacent word pairs; Japanese (no spaces) ⇒ character bigrams;
//   · IDF weights computed over the question set itself ⇒ words found in every question ("bao nhiêu", "の") weigh little;
//   · question score = blend of weighted Dice (best-matching PHRASING) + coverage of the user's query
//     over all words of that question (a user who says less but on-topic still scores).
// Parameters (plan, top N) are extracted FIRST and removed from the query, so plan names don't skew the score.
// ─────────────────────────────────────────────────────────────────────────────
import type { PlanKey } from '../nav/catalog';

export interface Slots {
  plan: Exclude<PlanKey, 'all'> | null;
  topN: number | null;
}

/** Plan names to recognize in a query: code (always present) + ja/vi labels from the DB (present once the API has returned labels). */
export type PlanNames = Partial<Record<Exclude<PlanKey, 'all'>, { ja?: string; vi?: string }>>;

const PLAN_CODES = ['starter', 'growth', 'scale'] as const;
const LATIN_MARKED = /[À-ɏḀ-ỿ]/;

/** Normalize for comparison: NFKC, lowercase, Latin diacritics stripped, đ → d. Kana / kanji unchanged. */
export function fold(s: string): string {
  let out = '';
  for (const ch of s.normalize('NFKC').toLowerCase()) {
    if (ch === 'đ') out += 'd';
    else if (LATIN_MARKED.test(ch)) out += ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    else out += ch;
  }
  return out;
}

// Vietnamese words (diacritics stripped) that appear in almost every query ⇒ dropped outright. IDF handles the rest.
// ⚠ Do NOT put negation words here ("không", "chưa"): "không hoạt động" ≠ "hoạt động".
const VI_STOP = new Set(
  ('la cua cac nhung co the nao gi bao nhieu cho toi minh em anh chi ban hay xem giup voi va o trong den tu ' +
    'mot duoc khi nay do thi ma ra ve nhu a vay nhe di nhi biet muon can hoi liet ke dang').split(' '),
);
const HIRA = /[぀-ゟ]/;
const CJK = /[぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/;
const WORD = /[a-z0-9]/;

/** CJK run → bigrams, split by SCRIPT: kanji/katakana separately, hiragana separately. Bigrams spanning a
 *  particle ('の売', 'を使') are just noise. Single kanji/katakana characters are kept (高, 中); single
 *  hiragana characters (の, を, は) are particles ⇒ dropped. */
function cjkFeatures(run: string, out: Set<string>): void {
  let i = 0;
  while (i < run.length) {
    const hira = HIRA.test(run[i]!);
    let j = i;
    while (j < run.length && HIRA.test(run[j]!) === hira) j++;
    const seg = run.slice(i, j);
    if (seg.length === 1) {
      if (!hira) out.add(`j:${seg}`);
    } else {
      for (let k = 0; k + 1 < seg.length; k++) out.add(`j:${seg.slice(k, k + 2)}`);
    }
    i = j;
  }
}

/** Features of a `fold`ed query: 'w:word', 'p:word word', 'j:bigram' (or a single character). */
export function features(folded: string): Set<string> {
  const out = new Set<string>();
  const words: string[] = [];
  let i = 0;
  const flushWords = () => {
    for (let k = 0; k < words.length; k++) {
      out.add(`w:${words[k]}`);
      if (k > 0) out.add(`p:${words[k - 1]} ${words[k]}`);
    }
    words.length = 0;
  };
  while (i < folded.length) {
    const ch = folded[i]!;
    if (WORD.test(ch)) {
      let j = i;
      while (j < folded.length && WORD.test(folded[j]!)) j++;
      const w = folded.slice(i, j);
      // Pure numbers (10, 2026…) are parameters, not topics.
      if (!/^\d+$/.test(w) && !VI_STOP.has(w)) words.push(w);
      i = j;
    } else if (CJK.test(ch)) {
      flushWords();
      let j = i;
      while (j < folded.length && CJK.test(folded[j]!)) j++;
      cjkFeatures(folded.slice(i, j), out);
      i = j;
    } else {
      // Punctuation breaks phrases (no word pairs across a comma).
      if (!/\s/.test(ch)) flushWords();
      i++;
    }
  }
  flushWords();
  return out;
}

/** Extract plan + top N, return the query with the parameter parts removed. */
export function extractSlots(folded: string, names: PlanNames = {}): { slots: Slots; rest: string } {
  let rest = folded;
  let plan: Slots['plan'] = null;
  for (const code of PLAN_CODES) {
    // Plan code (starter/growth/scale) as a standalone word.
    const codeRe = new RegExp(`(^|[^a-z])${code}([^a-z]|$)`);
    // Vietnamese labels are ONLY recognized after the word "gói": "Mở rộng"/"Tăng trưởng" also have ordinary
    // meanings (MRR mở rộng = expansion, tăng trưởng MRR) ⇒ without "gói" it's not treated as a plan name.
    const vi = names[code]?.vi ? fold(names[code]!.vi!) : null;
    const viRe = vi ? new RegExp(`goi\\s+${vi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) : null;
    const ja = names[code]?.ja ? fold(names[code]!.ja!) : null;
    let hit: RegExp | string | null = null;
    if (viRe?.test(rest)) hit = viRe;
    else if (ja && rest.includes(ja)) hit = ja;
    else if (codeRe.test(rest)) hit = codeRe;
    if (hit) {
      plan = code;
      rest = typeof hit === 'string' ? rest.replace(hit, ' ') : rest.replace(hit, ' ');
      break;
    }
  }
  let topN: number | null = null;
  const nm =
    /(?:top|トップ|上位|ベスト)\s*(\d{1,3})/.exec(rest) ??
    /(\d{1,3})\s*(?:社|人|名|件|cong ty|nguoi|user|khach)/.exec(rest);
  if (nm) {
    const n = Number(nm[1]);
    if (n >= 1) topN = Math.min(n, 50);
    rest = rest.replace(nm[0], ' ');
  }
  return { slots: { plan, topN }, rest };
}

/** A question fed to the matcher: id + all phrasings (both ja and vi) + extra keywords. */
export interface MatchDoc {
  id: string;
  phrasings: readonly string[];
  keywords?: readonly string[];
}

export interface MatchIndex {
  docs: { id: string; phr: Set<string>[]; all: Set<string> }[];
  idf: Map<string, number>;
  unknownWeight: number;
}

export function buildIndex(docs: readonly MatchDoc[]): MatchIndex {
  const built = docs.map((d) => {
    const phr = d.phrasings.map((p) => features(extractSlots(fold(p)).rest));
    const all = new Set<string>();
    for (const s of phr) for (const f of s) all.add(f);
    for (const k of d.keywords ?? []) for (const f of features(fold(k))) all.add(f);
    return { id: d.id, phr, all };
  });
  const df = new Map<string, number>();
  for (const d of built) for (const f of d.all) df.set(f, (df.get(f) ?? 0) + 1);
  const n = built.length;
  const idf = new Map<string, number>();
  for (const [f, c] of df) idf.set(f, Math.log(1 + n / c));
  // Words not in the question set (typos, unrelated topics) still count in the denominator ⇒ pull the score down,
  // but weigh less than a real rare word so one stray word doesn't sink the whole query.
  return { docs: built, idf, unknownWeight: Math.log(1 + n) * 0.6 };
}

export interface Ranked {
  id: string;
  score: number;
}

export interface MatchResult {
  slots: Slots;
  ranked: Ranked[];
  /** Question close enough to answer directly; null ⇒ suggestions only. */
  best: Ranked | null;
}

/** Answer threshold — tune it with the test-query table in match.test.ts, don't tweak by guesswork. */
export const ANSWER_MIN = 0.3;

export function match(index: MatchIndex, query: string, names: PlanNames = {}): MatchResult {
  const { slots, rest } = extractSlots(fold(query), names);
  const q = features(rest);
  const w = (f: string) => index.idf.get(f) ?? index.unknownWeight;
  let wq = 0;
  for (const f of q) wq += w(f);
  const ranked: Ranked[] = index.docs.map((d) => {
    if (wq === 0) return { id: d.id, score: 0 };
    let bestDice = 0;
    for (const p of d.phr) {
      let inter = 0;
      let wp = 0;
      for (const f of p) {
        wp += w(f);
        if (q.has(f)) inter += w(f);
      }
      bestDice = Math.max(bestDice, (2 * inter) / (wq + wp));
    }
    let cover = 0;
    for (const f of q) if (d.all.has(f)) cover += w(f);
    return { id: d.id, score: 0.55 * bestDice + 0.45 * (cover / wq) };
  });
  // Stable: equal scores ⇒ keep the question-set order (common questions come first).
  const order = new Map(index.docs.map((d, i) => [d.id, i]));
  ranked.sort((a, b) => b.score - a.score || order.get(a.id)! - order.get(b.id)!);
  const top = ranked[0];
  return { slots, ranked, best: top && top.score >= ANSWER_MIN ? top : null };
}
