// ─────────────────────────────────────────────────────────────────────────────
// Đường ĐỌC dữ liệu DUY NHẤT của app: POST {VITE_API_URL}/api/board-data { source, ...tham số }
// → { source, updatedAt, rows }. Endpoint đó (Vercel) đọc mart.* bằng role analytics_reader.
// Trình duyệt KHÔNG bao giờ nói thẳng với Supabase.
//
// ⚠ Chưa đặt VITE_API_URL ⇒ `apiConfigured = false` ⇒ mọi bảng hiện trạng thái "chưa cấu hình",
//   KHÔNG có số mẫu nào nằm trong bundle.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { create } from 'zustand';
import type { SourceKey } from '../nav/catalog';

export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const apiConfigured = API_URL !== '';

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

export interface SourceData {
  rows: Row[];
  updatedAt: string | null;
}

export type Params = Record<string, string | number>;

/** Khoá cache: nguồn + tham số đã sắp xếp (cùng nội dung ⇒ cùng khoá). */
export function cacheKey(source: SourceKey, params: Params = {}): string {
  const p = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return p ? `${source}?${p}` : source;
}

/** Kiểm HÌNH của phản hồi — API trả sai hình thì báo lỗi, đừng vẽ rác. */
export function parseResponse(json: unknown): SourceData {
  if (typeof json !== 'object' || json === null) throw new Error('bad_shape');
  const o = json as { rows?: unknown; updatedAt?: unknown };
  if (!Array.isArray(o.rows)) throw new Error('bad_shape');
  for (const r of o.rows) if (typeof r !== 'object' || r === null || Array.isArray(r)) throw new Error('bad_shape');
  const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : null;
  return { rows: o.rows as Row[], updatedAt };
}

export async function fetchSource(source: SourceKey, params: Params = {}, signal?: AbortSignal): Promise<SourceData> {
  const res = await fetch(`${API_URL}/api/board-data`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source, ...params }),
    signal,
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return parseResponse(await res.json());
}

export type Phase = 'off' | 'loading' | 'ready' | 'failed';

interface Entry {
  phase: Phase;
  data: SourceData | null;
}

const useSourceStore = create<Record<string, Entry>>(() => ({}));
const inflight = new Map<string, Promise<void>>();

function load(source: SourceKey, params: Params): void {
  const key = cacheKey(source, params);
  if (inflight.has(key) || useSourceStore.getState()[key]?.phase === 'ready') return;
  useSourceStore.setState({ [key]: { phase: 'loading', data: useSourceStore.getState()[key]?.data ?? null } });
  const p = fetchSource(source, params)
    .then((data) => useSourceStore.setState({ [key]: { phase: 'ready', data } }))
    .catch(() => useSourceStore.setState({ [key]: { phase: 'failed', data: null } }))
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
}

/** Nạp một nguồn (có cache trong bộ nhớ). Chưa cấu hình API ⇒ phase 'off'. */
export function useSource(source: SourceKey, params: Params = {}): Entry {
  const key = cacheKey(source, params);
  const entry = useSourceStore((s) => s[key]);
  useEffect(() => {
    if (apiConfigured) load(source, params);
  }, [key]); // `params` đã nằm trong `key`
  if (!apiConfigured) return { phase: 'off', data: null };
  return entry ?? { phase: 'loading', data: null };
}
