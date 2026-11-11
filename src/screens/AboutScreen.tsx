// About page (#/about): what the demo is · sample data · what question each page answers · how to read
// charts · metrics table · architecture. The metrics table renders FROM the glossary (not written a second time);
// page names + questions come from the catalog; metric names come from DB labels.
import { COMMON_SCOPE, GLOSSARY, GLOSSARY_KEYS, textOf, type Text } from '../data/glossary';
import { useNameRefs } from '../data/labels';
import { BOARDS, PAGE_ASK, pick, PROJECT_CHURN } from '../nav/catalog';
import { NO_VALUE } from '../ui/format';
import { useLangStore, useT } from '../ui/i18n';
import { PageMeta } from '../ui/parts';

// Technology names are not translated.
const STACK = [
  ['Supabase (Postgres)', 'stackDb'],
  ['Vercel (Node API)', 'stackApi'],
  ['GitHub Pages · Vite · React · TypeScript', 'stackWeb'],
  ['Recharts 2', 'stackCharts'],
] as const;

export function AboutScreen() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const nameOf = useNameRefs();
  const txt = (v: Text) => textOf(v, lang) ?? t('unconfirmed');

  return (
    <section className="page about">
      <PageMeta />
      <h1>{t('about')}</h1>
      <p className="lead">{t('aboutLead')}</p>

      <section className="ui-glass about-block">
        <h2>{t('aboutWhatTitle')}</h2>
        <p>{t('aboutWhatBody')}</p>
      </section>

      <section className="ui-glass about-block about-sample">
        <h2>{t('aboutSampleTitle')}</h2>
        <p>{t('aboutSampleBody')}</p>
      </section>

      <section className="ui-glass about-block">
        <h2>{t('aboutPagesTitle')}</h2>
        <dl className="about-pages">
          {[...BOARDS, PROJECT_CHURN, PAGE_ASK].map((p) => (
            <div key={pick(p.name, 'ja')}>
              <dt>{pick(p.name, lang)}</dt>
              <dd>{pick(p.question, lang)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ui-glass about-block">
        <h2>{t('aboutReadTitle')}</h2>
        <ul className="about-read">
          <li>
            <span className="about-dot" style={{ background: 'var(--ok-fill)' }} aria-hidden="true" />
            <span className="about-dot" style={{ background: 'var(--crit-fill)' }} aria-hidden="true" />
            {t('aboutReadColor')}
          </li>
          <li>{t('aboutReadPill')}</li>
          <li>{t('aboutReadPolar')}</li>
          <li>{t('aboutReadNull')}</li>
        </ul>
      </section>

      <section className="ui-glass about-block">
        <h2>{t('aboutMetricsTitle')}</h2>
        <div className="gloss-wrap">
          <table className="gloss">
            <thead>
              <tr>
                <th scope="col">{t('gName')}</th>
                <th scope="col">{t('gWhat')}</th>
                <th scope="col">{t('gFormula')}</th>
                <th scope="col">{t('gUnit')}</th>
                <th scope="col">{t('gSource')}</th>
                <th scope="col">{t('gScope')}</th>
              </tr>
            </thead>
            <tbody>
              {GLOSSARY_KEYS.map((k) => {
                const e = GLOSSARY[k];
                return (
                  <tr key={k}>
                    <th scope="row">{nameOf(e.name) ?? NO_VALUE}</th>
                    <td data-h={t('gWhat')}>{txt(e.what)}</td>
                    <td data-h={t('gFormula')}>{txt(e.formula)}</td>
                    <td data-h={t('gUnit')}>{txt(e.unit)}</td>
                    <td data-h={t('gSource')}><code>{e.source}</code></td>
                    <td data-h={t('gScope')}>
                      {txt(e.scope)}
                      {e.partialMonth ? ` ${COMMON_SCOPE.partialMonth[lang]}` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3>{t('aboutCommonTitle')}</h3>
        <ul>
          <li>{COMMON_SCOPE.testInternal[lang]}</li>
          <li>{COMMON_SCOPE.timezone[lang]}</li>
        </ul>
      </section>

      <section className="ui-glass about-block">
        <h2>{t('aboutStackTitle')}</h2>
        <dl className="about-pages">
          {STACK.map(([name, key]) => (
            <div key={key}>
              <dt>{name}</dt>
              <dd>{t(key)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
