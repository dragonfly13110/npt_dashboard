export const DISTRICTS = [
  'เมืองนครปฐม',
  'กำแพงแสน',
  'นครชัยศรี',
  'ดอนตูม',
  'บางเลน',
  'สามพราน',
  'พุทธมณฑล',
];

export const FIELD_TYPES = [
  { label: 'ข้อความ', value: 'text' },
  { label: 'ตัวเลข', value: 'number' },
  { label: 'ตัวเลือก', value: 'select' },
  { label: 'วันที่', value: 'date' },
  { label: 'ข้อความยาว', value: 'textarea' },
];

export function createField(overrides = {}) {
  const id = overrides.id || `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    label: overrides.label || '',
    type: overrides.type || 'text',
    required: overrides.required || false,
    options: overrides.options || '',
    order: overrides.order ?? 0,
  };
}

export function normalizeSchema(schema = []) {
  return [...schema]
    .filter(field => field && field.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((field, index) => ({
      ...field,
      label: field.label || `คำถาม ${index + 1}`,
      type: field.type || 'text',
      required: Boolean(field.required),
      options: field.options || '',
      order: index,
    }));
}

export function parseClipboardTable(text) {
  if (!text) return [];
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(row => row.trim() !== '')
    .map(row => row.split('\t'));
}

export function applyGridPaste(rows, schema, pasteText, startRowIndex, startFieldId) {
  const orderedSchema = normalizeSchema(schema);
  const startColIndex = orderedSchema.findIndex(field => field.id === startFieldId);
  if (startColIndex < 0) return rows;

  const pasteRows = parseClipboardTable(pasteText);
  const nextRows = [...rows];

  pasteRows.forEach((pasteRow, rowOffset) => {
    const targetRowIndex = startRowIndex + rowOffset;
    const targetRow = { ...(nextRows[targetRowIndex] || {}) };

    pasteRow.forEach((value, colOffset) => {
      const targetField = orderedSchema[startColIndex + colOffset];
      if (targetField) targetRow[targetField.id] = value;
    });

    nextRows[targetRowIndex] = targetRow;
  });

  return nextRows.length ? nextRows : [{}];
}

export function validateRows(rows, schema) {
  const orderedSchema = normalizeSchema(schema);
  const errors = {};

  rows.forEach((row, rowIndex) => {
    orderedSchema.forEach(field => {
      const rawValue = row?.[field.id];
      const value = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
      const key = `${rowIndex}:${field.id}`;

      if (field.required && value === '') {
        errors[key] = 'จำเป็นต้องกรอก';
        return;
      }

      if (value !== '' && field.type === 'number' && Number.isNaN(Number(value))) {
        errors[key] = 'ต้องเป็นตัวเลข';
      }

      if (value !== '' && field.type === 'date' && Number.isNaN(Date.parse(value))) {
        errors[key] = 'วันที่ไม่ถูกต้อง';
      }
    });
  });

  return errors;
}

export function rowsToExportObjects(rows, schema) {
  const orderedSchema = normalizeSchema(schema);
  return rows.map(row => {
    const item = {};
    orderedSchema.forEach(field => {
      item[field.label] = row?.[field.id] ?? '';
    });
    return item;
  });
}

export function googleSheetUrlToCsvUrl(url) {
  const text = String(url || '').trim();
  if (!text) return '';
  if (text.includes('output=csv') || text.endsWith('.csv')) return text;

  const idMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return text;

  const gidMatch = text.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  return rows;
}

export function tabularRowsToAnswerRows(rawRows, schema) {
  const orderedSchema = normalizeSchema(schema);
  return rawRows.slice(1)
    .filter(row => row?.some(cell => String(cell ?? '').trim() !== ''))
    .map(row => {
      const item = {};
      orderedSchema.forEach((field, index) => {
        item[field.id] = row[index] ?? '';
      });
      return item;
    });
}
