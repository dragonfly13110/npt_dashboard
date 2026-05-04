import { describe, expect, it } from 'vitest';
import {
  applyGridPaste,
  detectCandidateTables,
  googleSheetUrlToCsvUrl,
  parseAiSchemaSuggestion,
  parseCsv,
  removeMissingSupabaseColumn,
  validateRows,
} from './dataRequestGrid';

const schema = [
  { id: 'district', label: 'อำเภอ', type: 'text', required: true, order: 0 },
  { id: 'amount', label: 'จำนวน', type: 'number', required: true, order: 1 },
  { id: 'date', label: 'วันที่', type: 'date', required: false, order: 2 },
];

describe('data request grid helpers', () => {
  it('pastes multiple Excel cells into matching rows and columns', () => {
    const rows = applyGridPaste([{}], schema, 'เมืองนครปฐม\t12\nกำแพงแสน\t7', 0, 'district');

    expect(rows).toEqual([
      { district: 'เมืองนครปฐม', amount: '12' },
      { district: 'กำแพงแสน', amount: '7' },
    ]);
  });

  it('validates required, number, and date fields', () => {
    const errors = validateRows([
      { district: '', amount: 'abc', date: 'not-date' },
    ], schema);

    expect(errors['0:district']).toBe('จำเป็นต้องกรอก');
    expect(errors['0:amount']).toBe('ต้องเป็นตัวเลข');
    expect(errors['0:date']).toBe('วันที่ไม่ถูกต้อง');
  });

  it('accepts valid rows', () => {
    const errors = validateRows([
      { district: 'สามพราน', amount: '10.5', date: '2026-05-04' },
    ], schema);

    expect(errors).toEqual({});
  });

  it('converts Google Sheet URLs to CSV export URLs', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=456';
    expect(googleSheetUrlToCsvUrl(url)).toBe('https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=456');
  });

  it('parses quoted CSV cells', () => {
    expect(parseCsv('name,note\n"เมือง,นครปฐม","line 1"\n')).toEqual([
      ['name', 'note'],
      ['เมือง,นครปฐม', 'line 1'],
    ]);
  });

  it('detects candidate tables after report title rows', () => {
    const candidates = detectCandidateTables([
      ['รายงานสรุปพื้นที่'],
      ['อำเภอ', 'ตำบล', 'จำนวนไร่', 'หมายเหตุ'],
      ['เมืองนครปฐม', 'พระปฐมเจดีย์', 12, ''],
      ['กำแพงแสน', 'ทุ่งกระพังโหม', 7, ''],
    ], { sheetName: 'Sheet1' });

    expect(candidates[0]).toMatchObject({
      sheetName: 'Sheet1',
      headerRowIndex: 1,
      columnCount: 4,
      dataRowCount: 2,
    });
    expect(candidates[0].headers).toEqual(['อำเภอ', 'ตำบล', 'จำนวนไร่', 'หมายเหตุ']);
  });

  it('sanitizes AI schema suggestion into supported fields', () => {
    const result = parseAiSchemaSuggestion(JSON.stringify({
      confidence: 0.84,
      fields: [
        { label: 'อำเภอ', type: 'select', required: true, options: ['เมือง', 'ดอนตูม'], note: 'district field' },
        { label: 'พื้นที่', type: 'decimal', required: true },
        { label: '', type: 'text' },
      ],
    }));

    expect(result.confidence).toBe(0.84);
    expect(result.schema).toEqual([
      expect.objectContaining({ label: 'อำเภอ', type: 'select', required: true, options: 'เมือง,ดอนตูม', order: 0, note: 'district field' }),
      expect.objectContaining({ label: 'พื้นที่', type: 'number', required: true, options: '', order: 1 }),
    ]);
  });

  it('falls back to typed header fields when AI JSON is invalid', () => {
    const result = parseAiSchemaSuggestion('not json', {
      headers: ['name', 'amount'],
      sampleRows: [['A', '10']],
    });

    expect(result.confidence).toBeLessThan(0.5);
    expect(result.schema).toEqual([
      expect.objectContaining({ label: 'name', type: 'text', required: false, order: 0 }),
      expect.objectContaining({ label: 'amount', type: 'number', required: false, order: 1 }),
    ]);
  });

  it('removes a missing Supabase column from a payload', () => {
    const payload = { title: 'A', sheet_url: 'https://docs.google.com/sheet', status: 'draft' };
    const error = { message: "Could not find the 'sheet_url' column of 'data_requests' in the schema cache" };

    expect(removeMissingSupabaseColumn(payload, error)).toEqual({ title: 'A', status: 'draft' });
  });
});
