// ─────────────────────────────────────────────────────────────────────────────
// Bilingual ja / vi — UI TEXT (buttons, filters, messages).
// DATA text (column names, plan names, industries, churn reasons…) is NOT here: it comes from mart.labels /
// mart.column_labels via data/labels.ts — one source for both the app and the AI.
// ⚠ DICT.ja and DICT.vi are a two-way contract: i18n.test.ts locks them to the same key set.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';

export const LANGS = ['ja', 'vi'] as const;
export type Lang = (typeof LANGS)[number];

const ja = {
  appName: 'SaaS アナリティクス',
  home: 'ホーム',
  plans: 'プラン',
  allPlans: '全プラン',
  project: 'プロジェクト',
  langLabel: '言語',
  langJa: '日本語',
  langVi: 'Tiếng Việt',
  homeLead: '各ダッシュボードの概要。カードを押すと詳細に移動します。',
  preparing: '準備中',
  noApi: 'データAPIが未設定です（VITE_API_URL）。',
  noData: 'データがありません。',
  loading: '読み込み中…',
  loadFailed: 'データを読み込めませんでした。',
  updatedAt: '更新',
  open: '開く',
  menu: 'メニュー',
  pager: 'ページ送り',
  pageSize: '表示件数',
  prevPage: '前のページ',
  nextPage: '次のページ',
  userCount: 'ユーザー数',
  top10: '上位10社',
  axisX: '横軸',
  axisY: '縦軸',
  atRiskOnly: '「低」を除く',
  asOfDay: '（{d}日時点）',
  partialMonthNote: '月の途中のため、利用日数の多い区分は実際より少なく出ます。',
  info: '説明',
  gName: '指標',
  gWhat: '定義',
  gFormula: '計算式',
  gUnit: '単位',
  gSource: 'データ元',
  gScope: '範囲・注意',
  unconfirmed: '未確認',
  dataUntil: '{d}までのデータ',
  sampleData: 'サンプルデータ',
  filters: '絞り込み',
  period: '期間',
  month: '月',
  resetFilter: '絞り込みをリセット',
  reset: 'リセット',
  pickStart: '開始月を選んでください',
  pickEnd: '終了月を選んでください',
  pickMonth: '月を選んでください',
  yearLabel: '{y}年',
  monthCell: '{m}月',
  vsPrevMonth: '前月比',
  vsPrevRange: '前の{n}か月比',
  about: 'このデモについて',
  aboutLead: 'このアプリが何を見せているか、数字とグラフの読み方。',
  aboutWhatTitle: 'このデモとは',
  aboutWhatBody: '架空の SaaS（月額課金・シート制）の売上と利用状況を見るダッシュボードです。プラン別の4つの表と、解約予兆の早期検知プロジェクトがあります。',
  aboutSampleTitle: 'データはすべてサンプルです',
  aboutSampleBody: '企業名・人名・メール・金額はすべてシード付きの生成プログラムが作った架空のものです。実在の企業や人物のデータは含みません。メールは *.example.com のみ。',
  aboutPagesTitle: '各ページが答える問い',
  aboutReadTitle: 'グラフの読み方',
  aboutReadColor: '色：系列ごとの色は凡例で示します。緑系は増加、赤系は減少を表します。',
  aboutReadPill: 'ピル：単一系列の折れ線では、最も良い時点（同点なら最新）にだけ値のピルを付けます。',
  aboutReadPolar: '上下に分かれる棒：0 より上が増加、下が減少。ツールチップの値は向きではなく大きさです。',
  aboutReadNull: '「—」：計算できない値（分母 0・データなし）。0 とは区別します。',
  aboutMetricsTitle: '指標の定義',
  aboutCommonTitle: 'すべての指標に共通',
  aboutStackTitle: '構成',
  stackDb: 'raw → mart の2層。mart は足し算できる数だけを持ち、比率はブラウザで計算。',
  stackApi: '読み取り専用ロールで mart だけを読む API。ブラウザは DB に直接つながりません。',
  stackWeb: 'ハッシュルーターの静的サイト。日本語／ベトナム語。',
  stackCharts: 'グラフは必要になったときに読み込み（最初の画面には含めない）。',
  askDemoNote: 'デモ版：AIには接続していません。売上・ユーザー・企業・解約リスクについて入力すると、最も近いサンプル質問を選び、データAPIの数字で答えます。完全に一致しなくても大丈夫です。',
  askDemoChip: 'デモ',
  askClose: '閉じる',
  askSuggestLabel: '質問の候補',
  askAutoHint: '↑↓ 選択 · Enter 質問 · Tab 入力欄に入れる',
  askPlaceholder: '例：今のMRRは？／解約しそうな会社は？',
  askInputLabel: '質問を入力',
  askSend: '送信',
  askMatched: '近い質問',
  askThinking: 'データを分析しています…',
  askNotSure: '質問の意図がはっきりしませんでした。次のどれかに近いですか？',
  askRelated: '関連する質問',
  askBasis: '使用したデータと計算方法',
  askPeriod: '対象期間',
  askNoData: 'この質問に答えるためのデータがまだありません。',
  askPlan: 'プラン：{p}',
  askTop: '上位{n}件',
  askClear: '会話をクリア',
  askYou: 'あなた',
  askBot: 'アシスタント（デモ）',
  askLog: '会話',
} as const;

export type DictKey = keyof typeof ja;

const vi: Record<DictKey, string> = {
  appName: 'SaaS Analytics',
  home: 'Trang chủ',
  plans: 'Gói dịch vụ',
  allPlans: 'Tất cả gói',
  project: 'Dự án',
  langLabel: 'Ngôn ngữ',
  langJa: '日本語',
  langVi: 'Tiếng Việt',
  homeLead: 'Tổng quan các bảng. Bấm vào một thẻ để xem chi tiết.',
  preparing: 'Đang chuẩn bị',
  noApi: 'Chưa cấu hình API dữ liệu (VITE_API_URL).',
  noData: 'Chưa có dữ liệu.',
  loading: 'Đang tải…',
  loadFailed: 'Không tải được dữ liệu.',
  updatedAt: 'Cập nhật',
  open: 'Mở',
  menu: 'Menu',
  pager: 'Phân trang',
  pageSize: 'Số dòng mỗi trang',
  prevPage: 'Trang trước',
  nextPage: 'Trang sau',
  userCount: 'Số người dùng',
  top10: '10 công ty dẫn đầu',
  axisX: 'Trục ngang',
  axisY: 'Trục dọc',
  atRiskOnly: 'Không tính mức "Thấp"',
  asOfDay: ' (tính đến ngày {d})',
  partialMonthNote: 'Tháng chưa trọn nên các nhóm ngày dùng cao còn thấp hơn thực tế.',
  info: 'Giải thích',
  gName: 'Chỉ số',
  gWhat: 'Định nghĩa',
  gFormula: 'Công thức',
  gUnit: 'Đơn vị',
  gSource: 'Nguồn',
  gScope: 'Phạm vi · lưu ý',
  unconfirmed: 'Chưa xác nhận',
  dataUntil: 'Có số tới ngày {d}',
  sampleData: 'Dữ liệu mẫu',
  filters: 'Bộ lọc',
  period: 'Kỳ',
  month: 'Tháng',
  resetFilter: 'Đặt lại bộ lọc',
  reset: 'Đặt lại',
  pickStart: 'Chọn tháng bắt đầu',
  pickEnd: 'Chọn tháng kết thúc',
  pickMonth: 'Chọn một tháng',
  yearLabel: 'Năm {y}',
  monthCell: 'Th {m}',
  vsPrevMonth: 'so với tháng trước',
  vsPrevRange: 'so với {n} tháng trước đó',
  about: 'Giới thiệu',
  aboutLead: 'App này cho xem gì, và cách đọc số liệu, biểu đồ.',
  aboutWhatTitle: 'Demo này là gì',
  aboutWhatBody: 'Dashboard doanh thu và mức sử dụng của một SaaS giả lập (thu phí theo tháng, tính theo ghế). Gồm 4 bảng cho từng gói và một dự án cảnh báo huỷ sớm.',
  aboutSampleTitle: 'Toàn bộ là dữ liệu mẫu',
  aboutSampleBody: 'Tên công ty, tên người, email và số tiền đều do bộ sinh có seed tạo ra. Không có dữ liệu của công ty hay người thật nào. Email chỉ thuộc *.example.com.',
  aboutPagesTitle: 'Mỗi trang trả lời câu hỏi gì',
  aboutReadTitle: 'Cách đọc biểu đồ',
  aboutReadColor: 'Màu: màu của từng chuỗi ghi ở chú giải. Tông xanh lá là tăng, tông đỏ là giảm.',
  aboutReadPill: 'Pill: biểu đồ đường một chuỗi chỉ gắn pill giá trị ở MỘT mốc tốt nhất (bằng nhau thì lấy mốc mới nhất).',
  aboutReadPolar: 'Cột chia trên/dưới: trên mốc 0 là tăng, dưới là giảm. Số trong tooltip là độ lớn, không mang dấu.',
  aboutReadNull: '"—": giá trị không tính được (mẫu số 0, thiếu dữ liệu) — khác với số 0.',
  aboutMetricsTitle: 'Định nghĩa chỉ số',
  aboutCommonTitle: 'Áp dụng cho mọi chỉ số',
  aboutStackTitle: 'Kiến trúc',
  stackDb: 'Hai tầng raw → mart. Mart chỉ chở số cộng được; tỉ lệ tính ở trình duyệt.',
  stackApi: 'API chỉ đọc mart bằng một role chỉ có quyền đọc. Trình duyệt không nói thẳng với DB.',
  stackWeb: 'Trang tĩnh, router theo hash. Tiếng Nhật / tiếng Việt.',
  stackCharts: 'Biểu đồ chỉ tải khi cần (không nằm trong lần tải đầu).',
  askDemoNote: 'Bản demo: chưa nối AI thật. Gõ câu hỏi về doanh thu, người dùng, công ty hay rủi ro huỷ — app chọn câu hỏi mẫu gần nhất và trả lời bằng số từ API dữ liệu. Không cần gõ khớp từng chữ.',
  askDemoChip: 'Demo',
  askClose: 'Đóng',
  askSuggestLabel: 'Gợi ý câu hỏi',
  askAutoHint: '↑↓ chọn · Enter hỏi · Tab điền vào ô',
  askPlaceholder: 'Ví dụ: MRR hiện tại? / công ty nào sắp huỷ?',
  askInputLabel: 'Nhập câu hỏi',
  askSend: 'Gửi',
  askMatched: 'Câu hỏi gần nhất',
  askThinking: 'Đang phân tích dữ liệu…',
  askNotSure: 'Mình chưa chắc bạn muốn hỏi gì. Có phải một trong các câu này?',
  askRelated: 'Câu hỏi liên quan',
  askBasis: 'Dữ liệu dùng và cách tính',
  askPeriod: 'Kỳ dữ liệu',
  askNoData: 'Chưa đủ dữ liệu để trả lời câu này.',
  askPlan: 'Gói: {p}',
  askTop: 'Top {n}',
  askClear: 'Xoá cuộc trò chuyện',
  askYou: 'Bạn',
  askBot: 'Trợ lý (demo)',
  askLog: 'Cuộc trò chuyện',
};

export const DICT: Record<Lang, Record<DictKey, string>> = { ja, vi };

const STORAGE_KEY = 'saas-analytics.lang';

function initialLang(): Lang {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'ja' || saved === 'vi') return saved;
  } catch {
    // browser blocks storage (private mode…) — use the default
  }
  const nav = typeof navigator === 'undefined' ? '' : navigator.language;
  return nav.startsWith('vi') ? 'vi' : 'ja';
}

export const useLangStore = create<{ lang: Lang; setLang: (l: Lang) => void }>((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, lang);
    } catch {
      // can't save, never mind — we only lose "remember the choice" on the next visit
    }
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
    set({ lang });
  },
}));

export function useT(): (key: DictKey) => string {
  const lang = useLangStore((s) => s.lang);
  return (key) => DICT[lang][key];
}
