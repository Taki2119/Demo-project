// Single-series line chart for Ask AI answers — LAZY-LOADED (Recharts stays out of the initial chunk, kit 01 §1).
// The x axis is already short month labels (prebuilt by the answer) ⇒ xTick / xTitle pass through. Money axis: ticks
// show only numbers on the moneyScale scale; the unit is printed ONCE above the chart (AnswerView).
import type { ChartSpec } from '../../ask/kit';
import { count, moneyScale, pct, scaled, yen } from '../format';
import { useLangStore } from '../i18n';
import type { ChartFormat } from '../viz/charts/common';
import { SoloLine } from '../viz/charts/SoloLine';

export default function AskLine({ spec }: { spec: Extract<ChartSpec, { kind: 'line' }> }) {
  const lang = useLangStore((s) => s.lang);
  const max = Math.max(0, ...spec.points.map((p) => Math.abs(p.y ?? 0)));
  const s = moneyScale(max, lang);
  const id = (x: string) => x;
  const fmt: ChartFormat =
    spec.unit === 'yen'
      ? { value: (v) => yen(v, lang), tick: (v) => scaled(v, s, lang), xTick: id, xTitle: id }
      : spec.unit === 'pct'
        ? { value: (v) => pct(v, lang), tick: (v) => pct(v, lang, 0), xTick: id, xTitle: id }
        : { value: (v) => count(v, lang), tick: (v) => count(v, lang), xTick: id, xTitle: id };
  return <SoloLine data={spec.points} xKey="x" yKey="y" label={spec.label} goodWhen={spec.goodWhen} fmt={fmt} />;
}
