// Router HASH — GitHub Pages là host tĩnh, không rewrite được đường dẫn, nên mọi trang đi sau `#`.
//   #/                          Home
//   #/plans/<gói>/<bảng>        một bảng của một gói (gói = all | starter | growth | scale)
//   #/project/churn             dự án cảnh báo huỷ sớm
//   #/about                     trang Giới thiệu
// Hash lạ ⇒ Home. parse/ghép là phép THUẦN trên chuỗi; bất biến: toHash(parseHash(h)) === h
// với mọi h hợp lệ (route.test.ts).
//
// BỘ LỌC đi sau `?` (vd. `#/plans/all/revenue?from=2026-01&to=2026-11`) và KHÔNG thuộc Route:
// App dựng lại trang theo key = toHash(route), nên đổi bộ lọc không được đổi route (panel sẽ đóng,
// trang dựng lại). Query chỉ giữ khoá hợp lệ CHO TRANG ĐÓ và đúng dạng 'YYYY-MM'; còn phạm vi dữ
// liệu thì trang kiểm khi có dữ liệu (data/period.ts). Đổi bộ lọc = replaceState (Back không bị dồn).
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

/** Khoá query mà trang nhận: khoảng tháng (Doanh thu, Người dùng, Cảnh báo huỷ) · 1 tháng (Theo
 *  người dùng, Theo công ty) · không có (Home, Giới thiệu). */
export function queryKeysFor(route: Route): readonly (keyof Query)[] {
  if (route.kind === 'churn') return ['from', 'to'];
  if (route.kind !== 'board') return [];
  return route.board === 'revenue' || route.board === 'users' ? ['from', 'to'] : ['month'];
}

/** Đọc phần sau `?`: chỉ giữ khoá của trang + giá trị đúng dạng 'YYYY-MM'. Rác bị bỏ, không lỗi. */
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

/** Query → '?from=…&to=…' theo thứ tự cố định; rỗng ⇒ ''. */
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

/** Sang trang khác (bộ lọc KHÔNG đi theo: mỗi trang tự về mặc định). */
export function navigate(route: Route): void {
  const h = toHash(route);
  if (window.location.hash !== h) window.location.hash = h;
  else useRouteStore.setState({ route, query: {} });
}

/** Đổi bộ lọc của trang đang xem: replaceState (không đẻ mục lịch sử, không bắn hashchange). */
export function setQuery(q: Query): void {
  const { route, query } = useRouteStore.getState();
  if (toQueryString(q) === toQueryString(query)) return;
  history.replaceState(null, '', toHash(route) + toQueryString(q));
  useRouteStore.setState({ query: q });
}

export function initRouter(): void {
  const sync = () => {
    const next = read(currentHash());
    // Chuẩn hoá URL lạ về dạng chính tắc (không đẻ mục lịch sử mới).
    const canonical = toHash(next.route) + toQueryString(next.query);
    if (window.location.hash !== canonical) history.replaceState(null, '', canonical);
    useRouteStore.setState(next);
  };
  window.addEventListener('hashchange', sync);
  sync();
}
