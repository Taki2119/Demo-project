// Number formatting by the selected LANGUAGE. Money is always yen (integers).
// Rules (kit 03 §6): null ⇒ '—', never '0'. Negative numbers use the minus sign U+2212, not '-'.
import type { Lang } from './i18n';

export const NO_VALUE = '—';
export const MINUS = '−';

const LOCALE: Record<Lang, string> = { ja: 'ja-JP', vi: 'vi-VN' };

const intFmt = (lang: Lang, v: number, digits = 0) =>
  new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: digits }).format(v);
/** The sign of a negative number goes BEFORE any symbol (−¥2,400), as U+2212. Negative that rounds to 0 ⇒ no sign. */
const signed = (v: number, body: (abs: number) => string) => {
  const s = body(Math.abs(v));
  return v < 0 && /[1-9]/.test(s) ? `${MINUS}${s}` : s;
};
const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

export function yen(v: number | null | undefined, lang: Lang): string {
  if (!ok(v)) return NO_VALUE;
  return signed(v, (a) => `¥${intFmt(lang, Math.round(a))}`);
}

export function count(v: number | null | undefined, lang: Lang): string {
  if (!ok(v)) return NO_VALUE;
  return signed(v, (a) => intFmt(lang, a));
}

/** `v` is a fraction (0,153 ⇒ 15,3%). */
export function pct(v: number | null | undefined, lang: Lang, digits = 1): string {
  if (!ok(v)) return NO_VALUE;
  return signed(v, (a) =>
    `${new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(a * 100)}%`,
  );
}

/** 'YYYY-MM-DD' or 'YYYY-MM' → month label ('2026年4月' / 'Tháng 4/2026'). Doesn't go through Date. */
export function monthLabel(iso: string, lang: Lang): string {
  const [y, m] = iso.split('-');
  if (!y || !m) return iso;
  const mm = Number(m);
  return lang === 'ja' ? `${y}年${mm}月` : `Tháng ${mm}/${y}`;
}

/** SHORT month label for axes ('2026/4' / '4/2026'). */
export function monthShort(iso: string, lang: Lang): string {
  const [y, m] = iso.split('-');
  if (!y || !m) return iso;
  return lang === 'ja' ? `${y}/${Number(m)}` : `${Number(m)}/${y}`;
}

/** 'YYYY-MM-DD' → '2026年11月8日' / '8/11/2026'. Doesn't go through Date. */
export function dayLabel(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return lang === 'ja' ? `${y}年${Number(m)}月${Number(d)}日` : `${Number(d)}/${Number(m)}/${y}`;
}

/** 'YYYY-MM-DD' → '11/8' / '8/11' (axis). */
export function dayShort(iso: string, lang: Lang): string {
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  return lang === 'ja' ? `${Number(m)}/${Number(d)}` : `${Number(d)}/${Number(m)}`;
}

/** Money scale for axes (kit 03 §6 moneyScale). Chosen by the TARGET (the axis's largest value), not
 *  per label ⇒ every label shares one unit.
 *  JA: ≥1e8 ⇒ 億円 · ≥1e4 ⇒ 万円. VI: ≥1e9 ⇒ tỷ ¥ · ≥1e6 ⇒ tr ¥. */
export interface MoneyScale {
  div: number;
  unit: string;
  digits: number;
}
export function moneyScale(target: number, lang: Lang): MoneyScale {
  const a = Math.abs(target);
  if (lang === 'ja') {
    if (a >= 1e8) return { div: 1e8, unit: '億円', digits: 2 };
    if (a >= 1e4) return { div: 1e4, unit: '万円', digits: 0 };
    return { div: 1, unit: '円', digits: 0 };
  }
  if (a >= 1e9) return { div: 1e9, unit: 'tỷ ¥', digits: 2 };
  if (a >= 1e6) return { div: 1e6, unit: 'tr ¥', digits: 1 };
  return { div: 1, unit: '¥', digits: 0 };
}

/** Number divided by the scale (axis label; unit printed at the top of the card). */
export function scaled(v: number | null | undefined, s: MoneyScale, lang: Lang): string {
  if (!ok(v)) return NO_VALUE;
  return signed(v, (a) => intFmt(lang, a / s.div, s.digits));
}
