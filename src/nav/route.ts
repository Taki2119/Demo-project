// HASH router — GitHub Pages is a static host and can't rewrite paths, so every page goes after `#`.
//   #/                          Home
//   #/plans/<plan>/<board>      one board of one plan (plan = all | starter | growth | scale)
//   #/project/churn             early churn alert project
//   #/about                     About page
// Unknown hash ⇒ Home. parse/build are PURE string operations; invariant: toHash(parseHash(h)) === h
// for every valid h (route.test.ts).
//
// FILTERS go after `?` (e.g. `#/plans/all/revenue?from=2026-01&to=2026-11`) and are NOT part of Route:
// App rebuilds the page keyed on toHash(route), so changing a filter must not change the route (the panel would
// close, the page would rebuild). The query keeps only keys valid FOR THAT PAGE in 'YYYY-MM' form; the data range
// is checked by the page once data arrives (data/period.ts). Changing a filter = replaceState (Back doesn't pile up).
import { create } from 'zustand';
import { isYm, type FilterQuery } from '../data/period';
import { BOARD_KEYS, PLAN_KEYS, type BoardKey, type PlanKey } from './catalog';

export type Route =
  | { kind: 'home' }
  | { kind: 'board'; plan: PlanKey; board: BoardKey }
  | { kind: 'churn' }
  | { kind: 'about' };

export const HOME: Route = { kind: 'home' };

const isPlan = (s: string | undefined): s is PlanKey => (PLAN_KEYS as readonly string[]).includes(s ?? '');
const isBoard = (s: string | undefined): s is BoardKey => (BOARD_KEYS as readonly string[]).includes(s ?? '');

const pathOf = (hash: string): string => hash.split('?')[0] ?? '';

export function parseHash(hash: string): Route {
  const parts = pathOf(hash).replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'plans' && parts.length === 3 && isPlan(parts[1]) && isBoard(parts[2])) {
    return { kind: 'board', plan: parts[1], board: parts[2] };
  }
  if (parts[0] === 'project' && parts[1] === 'churn' && parts.length === 2) return { kind: 'churn' };
  if (parts[0] === 'about' && parts.length === 1) return { kind: 'about' };
  return HOME;
}

export function toHash(route: Route): string {
  switch (route.kind) {
    case 'home':
      return '#/';
    case 'board':
      return `#/plans/${route.plan}/${route.board}`;
    case 'churn':
      return '#/project/churn';
    case 'about':
      return '#/about';
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return toHash(a) === toHash(b);
}

export type Query = FilterQuery;
const QUERY_ORDER = ['from', 'to', 'month'] as const;

/** Query keys a page accepts: month range (Revenue, Users, Churn alert) · single month (By user,
 *  By company) · none (Home, About). */
export function queryKeysFor(route: Route): readonly (keyof Query)[] {
  if (route.kind === 'churn') return ['from', 'to'];
  if (route.kind !== 'board') return [];
  return route.board === 'revenue' || route.board === 'users' ? ['from', 'to'] : ['month'];
}

/** Read the part after `?`: keep only the page's keys + values in 'YYYY-MM' form. Garbage is dropped, no error. */
export function parseQuery(hash: string, route: Route): Query {
  const at = hash.indexOf('?');
  if (at < 0) return {};
  const p = new URLSearchParams(hash.slice(at + 1));
  const q: Query = {};
  for (const k of queryKeysFor(route)) {
    const v = p.get(k);
    if (isYm(v)) q[k] = v;
  }
  return q;
}

/** Query → '?from=…&to=…' in a fixed order; empty ⇒ ''. */
export function toQueryString(q: Query): string {
  const parts = QUERY_ORDER.filter((k) => q[k] != null).map((k) => `${k}=${q[k]}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

const currentHash = () => (typeof window === 'undefined' ? '' : window.location.hash);

function read(hash: string): { route: Route; query: Query } {
  const route = parseHash(hash);
  return { route, query: parseQuery(hash, route) };
}

export const useRouteStore = create<{ route: Route; query: Query }>(() => read(currentHash()));

export const useRoute = (): Route => useRouteStore((s) => s.route);
export const useQuery = (): Query => useRouteStore((s) => s.query);

/** Go to another page (filters do NOT carry over: each page resets to its default). */
export function navigate(route: Route): void {
  const h = toHash(route);
  if (window.location.hash !== h) window.location.hash = h;
  else useRouteStore.setState({ route, query: {} });
}

/** Change the current page's filters: replaceState (no new history entry, no hashchange fired). */
export function setQuery(q: Query): void {
  const { route, query } = useRouteStore.getState();
  if (toQueryString(q) === toQueryString(query)) return;
  history.replaceState(null, '', toHash(route) + toQueryString(q));
  useRouteStore.setState({ query: q });
}

export function initRouter(): void {
  const sync = () => {
    const next = read(currentHash());
    // Normalize unusual URLs to canonical form (no new history entry).
    const canonical = toHash(next.route) + toQueryString(next.query);
    if (window.location.hash !== canonical) history.replaceState(null, '', canonical);
    useRouteStore.setState(next);
  };
  window.addEventListener('hashchange', sync);
  sync();
}
