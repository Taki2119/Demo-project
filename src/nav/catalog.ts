// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — ONE source for the side panel, Home and page titles. Adding a board = adding an entry
// here (+ a component in boards/registry.tsx); no screen needs editing.
//
// Tree: Home · Plans (All plans + each plan) × 4 boards · Project (early churn alert).
// ⚠ PLAN NAMES are not declared here: they are DATA (mart.labels domain 'plan'), see data/labels.ts.
//   Only plan CODES live here, matching raw.plans.plan_id.
// ─────────────────────────────────────────────────────────────────────────────
import type { Lang } from '../ui/i18n';

export interface LocalStr {
  ja: string;
  vi: string;
}

export const pick = (s: LocalStr, lang: Lang): string => s[lang];

/** `all` = sum of all plans (valid because each company is on exactly one plan per month — docs/SCHEMA.md §4). */
export const PLAN_KEYS = ['all', 'starter', 'growth', 'scale'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const BOARD_KEYS = ['revenue', 'users', 'by-user', 'by-company'] as const;
export type BoardKey = (typeof BOARD_KEYS)[number];

/** API data source keys (matching the Vercel-side registry) — NOT SQL view names. */
export type SourceKey =
  | 'revenue-monthly'
  | 'users-monthly'
  | 'user-monthly'
  | 'company-monthly'
  | 'churn-watchlist'
  | 'churn-history'
  | 'interventions-monthly'
  | 'labels'
  | 'column-labels';

export interface BoardDef {
  key: BoardKey;
  name: LocalStr;
  desc: LocalStr;
  /** The question this page answers (About page). */
  question: LocalStr;
  source: SourceKey;
}

export const BOARDS: readonly BoardDef[] = [
  {
    key: 'revenue',
    name: { ja: '売上', vi: 'Doanh thu' },
    desc: { ja: 'MRRの推移と内訳（新規・拡大・縮小・解約）、請求と入金。', vi: 'MRR theo tháng và biến động (mới · mở rộng · thu hẹp · huỷ), hoá đơn và tiền thu.' },
    question: { ja: '毎月の MRR はどう動き、その増減は新規・拡大・縮小・解約のどれから来たか？請求した分は回収できているか？', vi: 'MRR mỗi tháng đi thế nào, tăng giảm đến từ khách mới, mở rộng, thu hẹp hay huỷ? Tiền xuất hoá đơn đã thu về được chưa?' },
    source: 'revenue-monthly',
  },
  {
    key: 'users',
    name: { ja: 'ユーザー数', vi: 'Số lượng người dùng' },
    desc: { ja: '有効ユーザー数・MAU・DAU/MAUの推移。', vi: 'Số người dùng, MAU, DAU/MAU theo tháng.' },
    question: { ja: 'シートを持つ人のうち、どれだけが実際に使っているか？増えた人・止まった人は？', vi: 'Trong số người giữ ghế, bao nhiêu người thật sự dùng? Bao nhiêu người mới, bao nhiêu người bị tắt?' },
    source: 'users-monthly',
  },
  {
    key: 'by-user',
    name: { ja: 'ユーザー別', vi: 'Theo người dùng' },
    desc: { ja: 'ユーザーごとの利用日数・利用時間・最終利用日。', vi: 'Số ngày dùng, thời gian dùng, lần dùng gần nhất của từng người.' },
    question: { ja: '誰がどれくらい使っているか？ほとんど使っていない人は誰か？', vi: 'Ai dùng nhiều, ai dùng ít? Ai gần như không dùng?' },
    source: 'user-monthly',
  },
  {
    key: 'by-company',
    name: { ja: '企業別', vi: 'Theo công ty' },
    desc: { ja: '企業ごとのMRR・シート・利用状況。', vi: 'MRR, số ghế, mức sử dụng của từng công ty.' },
    question: { ja: 'どの企業の MRR が大きく、シートに対して利用は追いついているか？', vi: 'Công ty nào có MRR lớn, và mức dùng có tương xứng với số ghế không?' },
    source: 'company-monthly',
  },
];

export const PROJECT_CHURN = {
  name: { ja: '解約予兆の早期検知', vi: 'Cảnh báo huỷ sớm' },
  desc: {
    ja: '利用の減少・シート未活用・重要機能の離脱から解約リスクを週次で算出し、フォロー対象を絞り込む。',
    vi: 'Tính điểm rủi ro huỷ mỗi tuần từ việc giảm sử dụng, ghế bỏ trống, bỏ tính năng chính — chọn ra công ty cần chăm sóc.',
  },
  question: {
    ja: '今週、どの有料企業が解約に向かっていそうで、理由は何か？過去のスコアはどれだけ当たったか？',
    vi: 'Tuần này công ty trả tiền nào có dấu hiệu sắp huỷ, vì sao? Điểm rủi ro trước đây đoán đúng tới đâu?',
  },
  sources: ['churn-watchlist', 'churn-history', 'interventions-monthly'] as const satisfies readonly SourceKey[],
} as const;

/** Ask AI — DEMO VERSION: answers from the sample question set (src/ask/), no real AI call. NOT a page:
 *  it's a chat window opened from the top-right button, on every screen (src/ui/ask/ChatDock.tsx). This entry
 *  provides the button name + the description line on the About page. */
export const PAGE_ASK = {
  name: { ja: 'AIに質問', vi: 'Hỏi AI' },
  desc: {
    ja: '右上のボタンからどの画面でも開けるチャット。よくある質問を自然な言葉で入力すると、サンプルデータから答えを組み立てます（デモ：AIには接続していません）。',
    vi: 'Cửa sổ chat mở từ nút góc trên bên phải, ở mọi màn hình. Gõ câu hỏi thường gặp bằng lời tự nhiên, app dựng câu trả lời từ dữ liệu mẫu (bản demo: chưa nối AI thật).',
  },
  question: {
    ja: '表を開かずに「今のMRRは？」「解約しそうな会社は？」と聞いたら、数字と根拠がすぐ返ってくるか？',
    vi: 'Không cần mở bảng, hỏi "MRR hiện tại?", "công ty nào sắp huỷ?" có nhận ngay số liệu kèm cách tính không?',
  },
} as const;

export function boardOf(key: BoardKey): BoardDef {
  const b = BOARDS.find((x) => x.key === key);
  if (!b) throw new Error(`unknown board: ${key}`);
  return b;
}
