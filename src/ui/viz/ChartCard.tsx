// Chart card frame (kit 01 §2): <figure class="ui-card ui-viz">, <h2> title, legend, plot area.
import type { CSSProperties, ReactNode } from 'react';
import type { GlossaryKey } from '../../data/glossary';
import { InfoTip } from '../InfoTip';
import { CHART_ANIM_MS } from './motion';
import { Legend, type LegendItem } from './Legend';

export function ChartCard({
  title,
  info,
  unit,
  note,
  legend = [],
  wide = false,
  dom = false,
  children,
}: {
  title: string;
  /** glossary key ⇒ ⓘ button next to the title (a card plotting 2 metrics ⇒ 2 keys) */
  info?: GlossaryKey | readonly GlossaryKey[];
  /** axis unit (e.g. '万円'), printed at the top of the card */
  unit?: string;
  /** caption line below the plot area */
  note?: string;
  legend?: readonly LegendItem[];
  wide?: boolean;
  /** DOM template (HBars): height follows content, not a fixed 15rem */
  dom?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className={`ui-card ui-viz${wide ? ' ui-card--wide' : ''}`}>
      <figcaption className="ui-card-head">
        <h2>
          {title}
          {info ? <InfoTip keys={info} /> : null}
        </h2>
        {unit ? <span className="ui-card-unit">{unit}</span> : null}
      </figcaption>
      <Legend items={legend} />
      <div className={dom ? 'ui-chart-dom' : 'ui-chart'} style={{ '--x-anim': `${CHART_ANIM_MS}ms` } as CSSProperties}>
        {children}
      </div>
      {note ? <p className="ui-card-note">{note}</p> : null}
    </figure>
  );
}
