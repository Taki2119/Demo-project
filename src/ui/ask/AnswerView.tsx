// Answer block of Ask AI (demo version). The answer is REBUILT on every render from raw data +
// the selected language (chat.ts) ⇒ switching ja/vi switches the whole conversation.
// Reused kit pieces: .tile (stat tile), .table-wrap (table), HBars (horizontal DOM bars), SoloLine (lazy-loaded).
import { lazy, Suspense } from 'react';
import type { Message } from '../../ask/chat';
import type { Answer, Ctx } from '../../ask/kit';
import type { Slots } from '../../ask/match';
import { promptOf, questionById } from '../../ask/questions';
import { count, moneyScale, pct, yen } from '../format';
import { useLangStore, useT, type Lang } from '../i18n';
import { boardChunk } from '../chunk';
import { ErrorBoundary } from '../ErrorBoundary';
import { StateBox } from '../parts';
import { HBars } from '../viz/charts/HBars';

const AskLine = lazy(boardChunk('ask-chart', () => import('./AskLine')));

type Bot = Extract<Message, { role: 'bot' }>;

/** Question buttons (suggestions / related / sample list). */
export function QuestionButtons({ ids, onPick, lang }: { ids: readonly string[]; onPick: (id: string) => void; lang: Lang }) {
  return (
    <ul className="ask-qs">
      {ids.map((id) => {
        const q = questionById(id);
        return q ? (
          <li key={id}>
            <button type="button" className="btn ask-q" onClick={() => onPick(id)}>
              {promptOf(q, lang)}
            </button>
          </li>
        ) : null;
      })}
    </ul>
  );
}

function barText(unit: 'yen' | 'count' | 'pct', v: number | null, lang: Lang) {
  return unit === 'yen' ? yen(v, lang) : unit === 'pct' ? pct(v, lang) : count(v, lang);
}

function AnswerBody({ a, label }: { a: Answer; label: Ctx['label'] }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const chips = [
    a.applied.plan ? t('askPlan').replace('{p}', label('plan', a.applied.plan)) : null,
    a.applied.topN ? t('askTop').replace('{n}', String(a.applied.topN)) : null,
  ].filter(Boolean);
  return (
    <>
      <p className="ask-text">{a.text}</p>
      {chips.length ? (
        <div className="ask-chips">
          {chips.map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>
      ) : null}
      {a.figures.length ? (
        <div className="ask-figs">
          {a.figures.map((f) => (
            <div key={f.label} className="tile">
              <div className="tile-label">{f.label}</div>
              <div className="tile-value">{f.value}</div>
              {f.sub ? <div className="tile-sub">{f.sub}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
      {a.chart?.kind === 'line' && a.chart.unit === 'yen' ? (
        <p className="ask-chart-unit">{moneyScale(Math.max(0, ...a.chart.points.map((p) => Math.abs(p.y ?? 0))), lang).unit}</p>
      ) : null}
      {a.chart?.kind === 'line' ? (
        <div className="ui-chart ask-chart">
          <ErrorBoundary fallback={<StateBox phase="failed" />}>
            <Suspense fallback={null}>
              <AskLine spec={a.chart} />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : a.chart?.kind === 'bar' ? (
        <div className="ask-chart-dom">
          <HBars
            labelW={9}
            rows={a.chart.points.map((p, i) => ({ key: `${i}:${p.x}`, label: p.x, value: p.y, text: barText(a.chart!.unit, p.y, lang) }))}
          />
        </div>
      ) : null}
      {a.table ? (
        <div className="table-wrap ask-table">
          <table>
            <thead>
              <tr>
                {a.table.head.map((h, i) => (
                  <th key={h} scope="col" className={a.table!.numeric[i] ? 'num' : undefined}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.table.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, i) => (
                    <td key={i} className={a.table!.numeric[i] ? 'num' : undefined}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <details className="ask-basis">
        <summary>{t('askBasis')}</summary>
        <dl>
          <dt>{t('askPeriod')}</dt>
          <dd>{a.period}</dd>
        </dl>
        <p>{a.basis}</p>
      </details>
    </>
  );
}

/** Assistant message: thinking · answer · suggestions · error / API not configured. */
export function BotMessage({ m, label, onPick }: { m: Bot; label: Ctx['label']; onPick: (id: string, slots?: Slots) => void }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const q = m.qid ? questionById(m.qid) : undefined;

  if (m.status === 'thinking') {
    return (
      <p className="ask-thinking" role="status">
        <span className="ask-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {t('askThinking')}
      </p>
    );
  }
  if (m.kind === 'suggest') {
    return (
      <>
        <p className="ask-text">{t('askNotSure')}</p>
        <QuestionButtons ids={m.more} onPick={(id) => onPick(id)} lang={lang} />
      </>
    );
  }
  const answer = q && m.status === 'ready' ? q.build({ lang, slots: m.slots, data: m.data, label }) : null;
  return (
    <>
      {q ? (
        <p className="ask-matched">
          <span>{t('askMatched')}</span> {promptOf(q, lang)}
        </p>
      ) : null}
      {m.status === 'off' ? <StateBox phase="off" /> : m.status === 'failed' ? <StateBox phase="failed" /> : null}
      {m.status === 'ready' ? answer ? <AnswerBody a={answer} label={label} /> : <p className="ask-text">{t('askNoData')}</p> : null}
      {m.more.length ? (
        <div className="ask-more">
          <h3>{t('askRelated')}</h3>
          <QuestionButtons ids={m.more} onPick={(id) => onPick(id, m.slots)} lang={lang} />
        </div>
      ) : null}
    </>
  );
}
