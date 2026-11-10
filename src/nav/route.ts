// Router HASH — GitHub Pages là host tĩnh, không rewrite được đường dẫn, nên mọi trang đi sau `#`.
//   #/                          Home
//   #/plans/<gói>/<bảng>        một bảng của một gói (gói = all | starter | growth | scale)
//   #/project/churn             dự án cảnh báo huỷ sớm
// Hash lạ ⇒ Home. parse/ghép là phép THUẦN trên chuỗi; bất biến: toHash(parseHash(h)) === h
// với mọi h hợp lệ (route.test.ts).
import { create } from 'zustand';
import { BOARD_KEYS, PLAN_KEYS, type BoardKey, type PlanKey } from './catalog';

export type Route =
  | { kind: 'home' }
  | { kind: 'board'; plan: PlanKey; board: BoardKey }
  | { kind: 'churn' };

export const HOME: Route = { kind: 'home' };

const isPlan = (s: string | undefined): s is PlanKey => (PLAN_KEYS as readonly string[]).includes(s ?? '');
const isBoard = (s: string | undefined): s is BoardKey => (BOARD_KEYS as readonly string[]).includes(s ?? '');

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'plans' && parts.length === 3 && isPlan(parts[1]) && isBoard(parts[2])) {
    return { kind: 'board', plan: parts[1], board: parts[2] };
  }
  if (parts[0] === 'project' && parts[1] === 'churn' && parts.length === 2) return { kind: 'churn' };
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
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return toHash(a) === toHash(b);
}

const current = (): Route => (typeof window === 'undefined' ? HOME : parseHash(window.location.hash));

export const useRouteStore = create<{ route: Route }>(() => ({ route: current() }));

export const useRoute = (): Route => useRouteStore((s) => s.route);

export function navigate(route: Route): void {
  const h = toHash(route);
  if (window.location.hash !== h) window.location.hash = h;
  else useRouteStore.setState({ route });
}

export function initRouter(): void {
  const sync = () => {
    const r = current();
    // Chuẩn hoá URL lạ về dạng chính tắc (không đẻ mục lịch sử mới).
    const canonical = toHash(r);
    if (window.location.hash !== canonical) history.replaceState(null, '', canonical);
    useRouteStore.setState({ route: r });
  };
  window.addEventListener('hashchange', sync);
  sync();
}
