// ─────────────────────────────────────────────────────────────────────────────
// SO KHỚP GẦN ĐÚNG câu người dùng gõ ↔ bộ câu hỏi mẫu (bản demo "Hỏi AI", không gọi AI thật).
//
// Không cần khớp 100%:
//   · chuẩn hoá NFKC + chữ thường; chữ Latin BỎ DẤU ("doanh thu" = "doanh thu") — chỉ bỏ dấu
//     của ký tự Latin, KHÔNG đụng kana (bỏ dấu kana sẽ biến が thành か);
//   · tiếng Việt / Latin ⇒ từ + cặp từ liền nhau; tiếng Nhật (không có dấu cách) ⇒ bigram ký tự;
//   · trọng số IDF tính trên chính bộ câu hỏi ⇒ từ xuất hiện ở mọi câu ("bao nhiêu", "の") nhẹ ký;
//   · điểm câu hỏi = trộn Dice có trọng số (giống CÁCH HỎI nào nhất) + độ phủ của câu người dùng
//     trên toàn bộ từ của câu hỏi đó (người dùng nói ít hơn nhưng đúng chủ đề vẫn được điểm).
// Tham số (gói, top N) được trích ra TRƯỚC rồi xoá khỏi câu, để tên gói không kéo lệch điểm.
// ─────────────────────────────────────────────────────────────────────────────
import type { PlanKey } from '../nav/catalog';

export interface Slots {
  plan: Exclude<PlanKey, 'all'> | null;
  topN: number | null;
}

/** Tên gói để nhận ra trong câu: mã (luôn có) + nhãn ja/vi từ DB (có khi API đã trả nhãn). */
export type PlanNames = Partial<Record<Exclude<PlanKey, 'all'>, { ja?: string; vi?: string }>>;

const PLAN_CODES = ['starter', 'growth', 'scale'] as const;
const LATIN_MARKED = /[À-ɏḀ-ỿ]/;

/** Chuẩn hoá để so: NFKC, chữ thường, Latin bỏ dấu, đ → d. Kana / kanji giữ nguyên. */
export function fold(s: string): string {
  let out = '';
  for (const ch of s.normalize('NFKC').toLowerCase()) {
    if (ch === 'đ') out += 'd';
    else if (LATIN_MARKED.test(ch)) out += ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    else out += ch;
  }
  return out;
}

// Từ tiếng Việt (đã bỏ dấu) gần như câu nào cũng có ⇒ bỏ hẳn. IDF lo phần còn lại.
// ⚠ KHÔNG đưa từ phủ định vào đây ("không", "chưa"): "không hoạt động" ≠ "hoạt động".
const VI_STOP = new Set(
  ('la cua cac nhung co the nao gi bao nhieu cho toi minh em anh chi ban hay xem giup voi va o trong den tu ' +
    'mot duoc khi nay do thi ma ra ve nhu a vay nhe di nhi biet muon can hoi liet ke dang').split(' '),
);
const HIRA = /[぀-ゟ]/;
const CJK = /[぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/;
const WORD = /[a-z0-9]/;

/** Cụm CJK → bigram, tách theo LOẠI CHỮ: kanji/katakana riêng, hiragana riêng. Bigram vắt qua trợ
 *  từ ('の売', 'を使') chỉ là nhiễu. Kanji/katakana 1 ký tự giữ nguyên (高, 中); hiragana 1 ký tự
 *  (の, を, は) là trợ từ ⇒ bỏ. */
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

/** Đặc trưng của một câu đã `fold`: 'w:từ', 'p:từ từ', 'j:bigram' (hoặc 1 ký tự). */
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
      // Số thuần (10, 2026…) là tham số, không phải chủ đề.
      if (!/^\d+$/.test(w) && !VI_STOP.has(w)) words.push(w);
      i = j;
    } else if (CJK.test(ch)) {
      flushWords();
      let j = i;
      while (j < folded.length && CJK.test(folded[j]!)) j++;
      cjkFeatures(folded.slice(i, j), out);
      i = j;
    } else {
      // Dấu câu ngắt cụm từ (không tạo cặp từ xuyên qua dấu phẩy).
      if (!/\s/.test(ch)) flushWords();
      i++;
    }
  }
  flushWords();
  return out;
}

/** Trích gói + top N, trả câu đã xoá phần tham số. */
export function extractSlots(folded: string, names: PlanNames = {}): { slots: Slots; rest: string } {
  let rest = folded;
  let plan: Slots['plan'] = null;
  for (const code of PLAN_CODES) {
    // Mã gói (starter/growth/scale) đứng riêng một từ.
    const codeRe = new RegExp(`(^|[^a-z])${code}([^a-z]|$)`);
    // Nhãn tiếng Việt CHỈ nhận sau chữ "gói": "Mở rộng"/"Tăng trưởng" còn là nghĩa thường
    // (MRR mở rộng = expansion, tăng trưởng MRR) ⇒ không có "gói" thì không coi là tên gói.
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

/** Câu hỏi đưa vào bộ so khớp: id + mọi cách hỏi (cả ja lẫn vi) + từ khoá phụ. */
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
  // Từ không có trong bộ câu hỏi (gõ sai, chủ đề lạ) vẫn tính vào mẫu số ⇒ kéo điểm xuống,
  // nhưng nhẹ hơn một từ hiếm có thật để một chữ thừa không đánh rớt cả câu.
  return { docs: built, idf, unknownWeight: Math.log(1 + n) * 0.6 };
}

export interface Ranked {
  id: string;
  score: number;
}

export interface MatchResult {
  slots: Slots;
  ranked: Ranked[];
  /** Câu hỏi đủ gần để trả lời luôn; null ⇒ chỉ gợi ý. */
  best: Ranked | null;
}

/** Ngưỡng trả lời — chỉnh bằng bảng câu thử trong match.test.ts, đừng sửa mò. */
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
  // Ổn định: điểm bằng nhau ⇒ giữ thứ tự của bộ câu hỏi (câu phổ biến đứng trước).
  const order = new Map(index.docs.map((d, i) => [d.id, i]));
  ranked.sort((a, b) => b.score - a.score || order.get(a.id)! - order.get(b.id)!);
  const top = ranked[0];
  return { slots, ranked, best: top && top.score >= ANSWER_MIN ? top : null };
}
