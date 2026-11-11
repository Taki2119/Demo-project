// ─────────────────────────────────────────────────────────────────────────────
// The app's ONLY data READ path: POST {VITE_API_URL}/api/board-data { source, ...params }
// → { source, updatedAt, rows }. That endpoint (Vercel) reads mart.* as the analytics_reader role.
// The browser NEVER talks to Supabase directly.
//
// ⚠ VITE_API_URL not set ⇒ `apiConfigured = false` ⇒ every board shows the "not configured" state,
//   NO sample numbers live in the bundle.
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

/** Cache key: source + sorted params (same content ⇒ same key). */
export function cacheKey(source: SourceKey, params: Params = {}): string {
  const p = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return p ? `${source}?${p}` : source;
}

/** Check the SHAPE of the response — if the API returns the wrong shape, report an error, don't draw garbage. */
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

/** Load a source OUTSIDE React (Ask AI: each answer needs a different number of sources). Shares the cache +
 *  store with `useSource` ⇒ if another page already loaded it, return immediately, no refetch. Error ⇒ reject. */
export function loadSource(source: SourceKey, params: Params = {}): Promise<SourceData> {
  if (!apiConfigured) return Promise.reject(new Error('api_off'));
  const key = cacheKey(source, params);
  const ready = () => {
    const e = useSourceStore.getState()[key];
    if (e?.phase === 'ready' && e.data) return e.data;
    throw new Error('load_failed');
  };
  const cur = useSourceStore.getState()[key];
  if (cur?.phase === 'ready' && cur.data) return Promise.resolve(cur.data);
  load(source, params);
  return (inflight.get(key) ?? Promise.resolve()).then(ready);
}

/** Load a source (in-memory cache). API not configured ⇒ phase 'off'.
 *  `enabled = false` ⇒ not loaded yet, returns 'loading' (e.g. waiting for the month list to know the `month` param). */
export function useSource(source: SourceKey, params: Params = {}, enabled = true): Entry {
  const key = cacheKey(source, params);
  const entry = useSourceStore((s) => s[key]);
  useEffect(() => {
    if (apiConfigured && enabled) load(source, params);
  }, [key, enabled]); // `params` is already in `key`
  if (!apiConfigured) return { phase: 'off', data: null };
  return entry ?? { phase: 'loading', data: null };
}
