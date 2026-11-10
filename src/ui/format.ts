// Định dạng số theo NGÔN NGỮ đang chọn. Tiền luôn là yên (số nguyên).
import type { Lang } from './i18n';

export const NO_VALUE = '—';

const LOCALE: Record<Lang, string> = { ja: 'ja-JP', vi: 'vi-VN' };

export function yen(v: number | null | undefined, lang: Lang): string {
  if (v == null || !Number.isFinite(v)) return NO_VALUE;
  return `¥${new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 0 }).format(Math.round(v))}`;
}

export function count(v: number | null | undefined, lang: Lang): string {
  if (v == null || !Number.isFinite(v)) return NO_VALUE;
  return new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 0 }).format(v);
}

/** `v` là phân số (0,153 ⇒ 15,3%). */
export function pct(v: number | null | undefined, lang: Lang, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return NO_VALUE;
  return `${new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v * 100)}%`;
}

/** 'YYYY-MM-DD' hoặc 'YYYY-MM' → nhãn tháng ('2026年4月' / 'Tháng 4/2026'). Không đi qua Date. */
export function monthLabel(iso: string, lang: Lang): string {
  const [y, m] = iso.split('-');
  if (!y || !m) return iso;
  const mm = Number(m);
  return lang === 'ja' ? `${y}年${mm}月` : `Tháng ${mm}/${y}`;
}
