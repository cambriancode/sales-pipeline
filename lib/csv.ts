export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/"/g, '""');
  return /[",\r\n]/.test(text) ? `"${text}"` : text;
}

export function toCsvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}

export function toCsv(headers: unknown[], rows: unknown[][]): string {
  return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\n');
}