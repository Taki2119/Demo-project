// Khung thẻ biểu đồ (kit 01 §2): <figure class="ui-card ui-viz">, tiêu đề <h2>, chú giải, vùng vẽ.
import type { CSSProperties, ReactNode } from 'react';
import { CHART_ANIM_MS } from './motion';
import { Legend, type LegendItem } from './Legend';

export function ChartCard({
  title,
  unit,
  note,
  legend = [],
  wide = false,
  dom = false,
  children,
}: {
  title: string;
  /** đơn vị của trục (vd. '万円'), in ở đầu thẻ */
  unit?: string;
  /** dòng chú thích dưới vùng vẽ */
  note?: string;
  legend?: readonly LegendItem[];
  wide?: boolean;
  /** khuôn DOM (HBars): cao theo nội dung, không cố định 15rem */
  dom?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className={`ui-card ui-viz${wide ? ' ui-card--wide' : ''}`}>
      <figcaption className="ui-card-head">
        <h2>{title}</h2>
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
