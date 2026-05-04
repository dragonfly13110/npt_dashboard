import { describe, expect, it } from 'vitest';
import { applyGridPaste, googleSheetUrlToCsvUrl, parseCsv, validateRows } from './dataRequestGrid';

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
});
