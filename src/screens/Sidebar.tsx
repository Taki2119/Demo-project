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

// ≤640px: the side panel becomes a DRAWER (kit 02 §4) — the top bar has an open button, overlay z 39,
// drawer z 40. Open ⇒ .main `inert` + scroll lock. Esc / click the overlay / page change ⇒ close, then return
// focus to the open button. >640px: nothing changes compared with the regular side panel.
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
  useEffect(() => setOpen(false), [hash]); // page change ⇒ close
  useEffect(() => {
    if (!mobile) setOpen(false); // leaving the mobile viewport ⇒ close (don't leave .main locked)
  }, [mobile]);

  useEffect(() => {
    if (!shown) {
      if (wasShown.current) toggleRef.current?.focus(); // after closing ⇒ return focus to the open button
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
        <Link to={{ kind: 'about' }}>{t('about')}</Link>

        <div className="side-foot">
          <LangToggle />
        </div>
      </nav>
    </>
  );
}
