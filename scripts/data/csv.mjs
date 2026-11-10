// CSV theo đúng thứ COPY của Postgres đọc: `null` ⇒ ô TRỐNG không nháy (= NULL); chuỗi có
// dấu phẩy / nháy / xuống dòng thì bọc nháy kép. Boolean ra `true` / `false`.

function cell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) || s === '' ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns, rows) {
  const out = [columns.join(',')];
  for (const r of rows) out.push(r.map(cell).join(','));
  return out.join('\n') + '\n';
}
