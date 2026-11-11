// CSV exactly as Postgres COPY reads it: `null` ⇒ an EMPTY unquoted cell (= NULL); strings with
// commas / quotes / newlines are wrapped in double quotes. Booleans come out as `true` / `false`.

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
