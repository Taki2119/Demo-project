import { useEffect, useRef, useState } from 'react';
import { BOARDS, pick, PLAN_KEYS, PROJECT_CHURN, type PlanKey } from '../nav/catalog';
import { navigate, sameRoute, toHash, useRoute, type Route } from '../nav/route';
import { useLabel } from '../data/labels';
import { useLangStore, useT } from '../ui/i18n';
import { LangToggle } from '../ui/parts';
import { useMediaQuery } from '../ui/useMediaQuery';

function Link({ to, children }: { to: Route; children: string }) {
  const route = useRoute();
  const active = sameRoute(route, to);
  return (
    <a
      href={toHash(to)}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

// ≤640px: side panel thành NGĂN KÉO (kit 02 §4) — thanh trên cùng có nút mở, lớp phủ z 39,
// ngăn kéo z 40. Mở ⇒ .main `inert` + khoá cuộn. Esc / bấm lớp phủ / đổi trang ⇒ đóng, rồi trả
// focus về nút mở. >640px: không có gì thay đổi so với side panel thường.
const MOBILE = '(max-width: 640px)';

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Sidebar() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const route = useRoute();
  const planName = (p: PlanKey) => (p === 'all' ? t('allPlans') : label('plan', p));

  const mobile = useMediaQuery(MOBILE);
  const [open, setOpen] = useState(false);
  const shown = open && mobile;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const wasShown = useRef(false);

  const hash = toHash(route);
  useEffect(() => setOpen(false), [hash]); // đổi trang ⇒ đóng
  useEffect(() => {
    if (!mobile) setOpen(false); // rời khung mobile ⇒ đóng (không để .main bị khoá)
  }, [mobile]);

  useEffect(() => {
    if (!shown) {
      if (wasShown.current) toggleRef.current?.focus(); // đóng xong ⇒ trả focus về nút mở
      wasShown.current = false;
      return;
    }
    wasShown.current = true;
    const root = document.documentElement;
    const main = document.querySelector<HTMLElement>('.main');
    if (main) main.inert = true;
    root.setAttribute('data-drawer-open', '');
    navRef.current?.querySelector<HTMLElement>('a, summary, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (main) main.inert = false;
      root.removeAttribute('data-drawer-open');
    };
  }, [shown]);

  return (
    <>
      <div className="side-bar">
        <button
          ref={toggleRef}
          type="button"
          className="btn side-toggle"
          aria-label={t('menu')}
          aria-expanded={shown}
          aria-controls="side-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <MenuIcon />
        </button>
        <span className="brand">{t('appName')}</span>
      </div>
      <div className="side-scrim" data-open={shown} aria-hidden="true" onClick={() => setOpen(false)} />
      <nav id="side-nav" ref={navRef} className="side" data-open={shown} aria-label={t('menu')}>
        <div className="brand">{t('appName')}</div>
        <Link to={{ kind: 'home' }}>{t('home')}</Link>

        <div className="side-section">{t('plans')}</div>
        {PLAN_KEYS.map((plan) => (
          <details key={plan} open={route.kind === 'board' ? route.plan === plan : plan === 'all'}>
            <summary>{planName(plan)}</summary>
            {BOARDS.map((b) => (
              <Link key={b.key} to={{ kind: 'board', plan, board: b.key }}>{pick(b.name, lang)}</Link>
            ))}
          </details>
        ))}

        <div className="side-section">{t('project')}</div>
        <Link to={{ kind: 'churn' }}>{pick(PROJECT_CHURN.name, lang)}</Link>

        <div className="side-foot">
          <LangToggle />
        </div>
      </nav>
    </>
  );
}
