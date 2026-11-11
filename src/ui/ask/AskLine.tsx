// Biểu đồ đường 1 chuỗi của câu trả lời Hỏi AI — nạp ĐỘNG (Recharts không vào chunk đầu, kit 01 §1).
// Trục x đã là nhãn tháng ngắn (câu trả lời dựng sẵn) ⇒ xTick / xTitle giữ nguyên. Trục tiền: vạch
// chỉ có số theo thang moneyScale; đơn vị in MỘT lần phía trên biểu đồ (AnswerView).
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
