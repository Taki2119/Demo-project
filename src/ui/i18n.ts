// ─────────────────────────────────────────────────────────────────────────────
// Song ngữ ja / vi — CHỮ GIAO DIỆN (nút, bộ lọc, thông báo).
// Chữ DỮ LIỆU (tên cột, tên gói, ngành, lý do huỷ…) KHÔNG ở đây: nó lấy từ mart.labels /
// mart.column_labels qua data/labels.ts — một nguồn cho cả app lẫn AI.
// ⚠ DICT.ja và DICT.vi là hợp đồng 2 chiều: i18n.test.ts khoá cùng bộ key.
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
};

export const DICT: Record<Lang, Record<DictKey, string>> = { ja, vi };

const STORAGE_KEY = 'saas-analytics.lang';

function initialLang(): Lang {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'ja' || saved === 'vi') return saved;
  } catch {
    // trình duyệt chặn storage (chế độ riêng tư…) — dùng mặc định
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
      // không lưu được thì thôi — chỉ mất "nhớ lựa chọn" ở lần mở sau
    }
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
    set({ lang });
  },
}));

export function useT(): (key: DictKey) => string {
  const lang = useLangStore((s) => s.lang);
  return (key) => DICT[lang][key];
}
