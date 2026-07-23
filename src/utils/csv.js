export function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const rawText = String(value);
  // ponytail: spreadsheet apps evaluate cells that begin with formula prefixes.
  const text = /^\s*[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(toCsvValue).join(',')).join('\r\n');
}

export function objectsToCsv(rows) {
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  return rowsToCsv([
    headers,
    ...rows.map((row) => headers.map((header) => row?.[header])),
  ]);
}

export function downloadCsv(filename, rowsOrCsv) {
  const csv = Array.isArray(rowsOrCsv) ? rowsToCsv(rowsOrCsv) : rowsOrCsv;
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/\.xlsx$/i, '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCsv(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/)[0] || '';
  const delimiter =
    firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    const next = clean[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

export function csvMatrixToObjects(matrix) {
  const validRows = (matrix || []).filter((row) =>
    (row || []).some((cell) => String(cell ?? '').trim() !== '')
  );

  if (validRows.length < 2) return { headers: [], rows: [] };

  const headers = validRows[0].map((header) =>
    String(header ?? '')
      .replace(/\r?\n/g, '')
      .trim()
  );

  const rows = validRows.slice(1).map((values, index) => {
    const row = {};
    headers.forEach((header, columnIndex) => {
      row[header] = String(values?.[columnIndex] ?? '').trim();
    });
    row._rowNum = index + 2;
    return row;
  });

  return { headers, rows };
}

export function parseCsvTable(text) {
  return csvMatrixToObjects(parseCsv(text));
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) =>
      resolve(parseCsv(String(event.target.result || '')));
    reader.onerror = () =>
      reject(reader.error || new Error('Unable to read CSV file'));
    reader.readAsText(file, 'utf-8');
  });
}

export const MAX_TABLE_IMPORT_BYTES = 4 * 1024 * 1024;

export function validateTableImportFile(file) {
  const extension = file?.name?.split('.').pop()?.toLowerCase();
  if (!['csv', 'txt'].includes(extension)) {
    throw new Error('รองรับเฉพาะไฟล์ CSV หรือ TXT');
  }
  if (!Number.isFinite(file.size) || file.size > MAX_TABLE_IMPORT_BYTES) {
    throw new Error('ไฟล์นำเข้าต้องมีขนาดไม่เกิน 4 MB');
  }
  return extension;
}

export async function parseTableFile(file) {
  validateTableImportFile(file);
  const text = await file.text();
  return parseCsvTable(text);
}
