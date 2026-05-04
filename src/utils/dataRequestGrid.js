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
    note: overrides.note || '',
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
      note: field.note || '',
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

function cleanCell(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function nonEmptyCells(row = []) {
  return row.map(cleanCell).filter(Boolean);
}

function looksLikeDate(value) {
  const text = cleanCell(value);
  return text !== '' && Number.isNaN(Number(text)) && !Number.isNaN(Date.parse(text));
}

function inferFieldType(values = []) {
  const samples = values.map(cleanCell).filter(Boolean);
  if (!samples.length) return 'text';
  const numericCount = samples.filter(value => !Number.isNaN(Number(value))).length;
  if (numericCount / samples.length >= 0.7) return 'number';
  const dateCount = samples.filter(looksLikeDate).length;
  if (dateCount / samples.length >= 0.7) return 'date';
  const uniqueValues = new Set(samples);
  if (samples.length >= 3 && uniqueValues.size > 1 && uniqueValues.size <= 8) return 'select';
  const longTextCount = samples.filter(value => value.length > 80).length;
  if (longTextCount / samples.length >= 0.3) return 'textarea';
  return 'text';
}

function normalizeFieldType(type) {
  const text = cleanCell(type).toLowerCase();
  if (['number', 'numeric', 'decimal', 'integer', 'float', 'currency', 'percent'].includes(text)) return 'number';
  if (['date', 'datetime'].includes(text)) return 'date';
  if (['select', 'dropdown', 'choice', 'enum'].includes(text)) return 'select';
  if (['textarea', 'longtext', 'long_text', 'multiline'].includes(text)) return 'textarea';
  return 'text';
}

function fallbackSchemaFromCandidate(candidate = {}) {
  const headers = Array.isArray(candidate.headers) ? candidate.headers : [];
  const sampleRows = Array.isArray(candidate.sampleRows) ? candidate.sampleRows : [];
  return headers
    .map((header, index) => {
      const label = cleanCell(header);
      if (!label) return null;
      const values = sampleRows.map(row => row?.[index]);
      const type = inferFieldType(values);
      const options = type === 'select'
        ? [...new Set(values.map(cleanCell).filter(Boolean))].slice(0, 12).join(',')
        : '';
      return createField({
        label,
        type,
        required: false,
        options,
        order: index,
      });
    })
    .filter(Boolean);
}

export function detectCandidateTables(rawRows = [], options = {}) {
  const rows = Array.isArray(rawRows) ? rawRows : [];
  const candidates = [];

  rows.forEach((row, rowIndex) => {
    const headers = (Array.isArray(row) ? row : []).map(cleanCell);
    const headerCount = nonEmptyCells(headers).length;
    if (headerCount < 2) return;

    const followingRows = rows.slice(rowIndex + 1);
    const dataRows = [];
    for (const nextRow of followingRows) {
      const nonEmpty = nonEmptyCells(nextRow).length;
      if (nonEmpty === 0) {
        if (dataRows.length) break;
        continue;
      }
      if (nonEmpty < Math.min(2, headerCount)) {
        if (dataRows.length) break;
        continue;
      }
      dataRows.push(nextRow);
      if (dataRows.length >= 20) break;
    }

    if (!dataRows.length) return;
    const columnCount = Math.max(...[headers, ...dataRows].map(item => Array.isArray(item) ? item.length : 0));
    const score = (headerCount * 2) + dataRows.length + (rowIndex === 0 ? 1 : 0);
    candidates.push({
      id: `${options.sheetName || 'Sheet'}-${rowIndex}`,
      sheetName: options.sheetName || 'Sheet1',
      headerRowIndex: rowIndex,
      columnCount,
      dataRowCount: dataRows.length,
      headers: headers.slice(0, columnCount),
      sampleRows: dataRows.slice(0, 8).map(item => Array.from({ length: columnCount }, (_, index) => item?.[index] ?? '')),
      confidence: Math.min(0.95, Math.max(0.35, score / 20)),
      score,
    });
  });

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || raw.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate) return null;
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

export function parseAiSchemaSuggestion(aiText, fallbackCandidate = {}) {
  const parsed = parseJsonObject(aiText);
  if (!parsed || !Array.isArray(parsed.fields)) {
    return {
      confidence: 0.2,
      schema: fallbackSchemaFromCandidate(fallbackCandidate),
      note: 'AI response was not valid JSON, so fields were inferred from headers.',
    };
  }

  const schema = parsed.fields
    .map((field, index) => {
      const label = cleanCell(field?.label || field?.name || field?.title);
      if (!label) return null;
      const type = normalizeFieldType(field?.type);
      const rawOptions = Array.isArray(field?.options) ? field.options.join(',') : field?.options;
      return createField({
        label,
        type,
        required: Boolean(field?.required),
        options: type === 'select' ? cleanCell(rawOptions) : '',
        order: index,
        note: cleanCell(field?.note || field?.reason),
      });
    })
    .filter(Boolean);

  return {
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
    schema: normalizeSchema(schema),
    note: cleanCell(parsed.note || parsed.reason),
  };
}

export function removeMissingSupabaseColumn(payload, error) {
  const message = String(error?.message || error || '');
  const match = message.match(/Could not find the '([^']+)' column/i);
  if (!match) return payload;
  const { [match[1]]: _missingColumn, ...nextPayload } = payload;
  return nextPayload;
}
