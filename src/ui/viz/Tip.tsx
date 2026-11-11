// Tooltip nhiều dòng (kit 03 §7). Thứ tự dòng = thứ tự `items` — khuôn cột xếp lớp tự sắp sao cho
// khớp hình (lát trên cùng trước; cột phân cực: lát dương từ trên xuống rồi lát âm).
// Lệch kit: thân ĐỤC (--surface) thay vì kính — tooltip của Recharts nằm TRONG thẻ kính, mà kính
// lồng trong tổ tiên có backdrop-filter chỉ nhoè được nền rỗng (kit 02 §3 bẫy 1).
import { NO_VALUE } from '../format';
import { Swatch, type LegendItem } from './Legend';

interface Entry {
  dataKey?: string | number;
  value?: unknown;
}

export interface TipProps {
  items: readonly LegendItem[];
  format: (key: string, v: number) => string;
  title: (label: string) => string;
  // Recharts tiêm vào:
  active?: boolean;
  payload?: readonly Entry[];
  label?: string | number;
}

export function Tip({ items, format, title, active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const byKey = new Map(payload.map((e) => [String(e.dataKey), e.value]));
  const rows = items.filter((it) => byKey.has(it.key));
  return (
    <div className="ui-tip" role="status">
      <div className="ui-tip-title">{title(String(label ?? ''))}</div>
      {rows.map((it) => {
        const v = byKey.get(it.key);
        return (
          <div key={it.key} className="ui-tip-row">
            <Swatch color={it.color} kind={it.kind} />
            <span>{it.label}</span>
            <b>{typeof v === 'number' && Number.isFinite(v) ? format(it.key, v) : NO_VALUE}</b>
          </div>
        );
      })}
    </div>
  );
}
