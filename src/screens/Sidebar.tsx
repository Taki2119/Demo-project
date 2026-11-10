import { BOARDS, pick, PLAN_KEYS, PROJECT_CHURN, type PlanKey } from '../nav/catalog';
import { navigate, sameRoute, toHash, useRoute, type Route } from '../nav/route';
import { useLabel } from '../data/labels';
import { useLangStore, useT } from '../ui/i18n';
import { LangToggle } from '../ui/parts';

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

export function Sidebar() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const label = useLabel();
  const route = useRoute();
  const planName = (p: PlanKey) => (p === 'all' ? t('allPlans') : label('plan', p));
  return (
    <nav className="side" aria-label={t('menu')}>
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
  );
}
