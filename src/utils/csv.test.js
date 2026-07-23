import { describe, expect, it } from 'vitest';
import {
  csvMatrixToObjects,
  MAX_TABLE_IMPORT_BYTES,
  parseCsv,
  parseCsvTable,
  toCsvValue,
  validateTableImportFile,
} from './csv';

describe('csv utilities', () => {
  it('parses quoted comma values', () => {
    expect(parseCsv('name,note\r\nA,"one, two"')).toEqual([
      ['name', 'note'],
      ['A', 'one, two'],
    ]);
  });

  it('prevents spreadsheet formulas in exported cells', () => {
    expect(toCsvValue('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(toCsvValue('  +1')).toBe("'  +1");
    expect(toCsvValue('@cmd')).toBe("'@cmd");
  });

  it('detects semicolon-delimited CSV files', () => {
    expect(parseCsvTable('name;year\r\nA;2569')).toEqual({
      headers: ['name', 'year'],
      rows: [{ name: 'A', year: '2569', _rowNum: 2 }],
    });
  });

  it('normalizes worksheet matrices into headers and rows', () => {
    expect(
      csvMatrixToObjects([
        ['ชื่อ\nกลุ่ม', 'ปีข้อมูล'],
        ['กลุ่ม A', 2569],
        ['', ''],
      ])
    ).toEqual({
      headers: ['ชื่อกลุ่ม', 'ปีข้อมูล'],
      rows: [{ ชื่อกลุ่ม: 'กลุ่ม A', ปีข้อมูล: '2569', _rowNum: 2 }],
    });
  });

  it('rejects Excel uploads', () => {
    expect(() =>
      validateTableImportFile({ name: 'upload.xlsx', size: 10 })
    ).toThrow('รองรับเฉพาะไฟล์ CSV หรือ TXT');
  });

  it('rejects unsupported or oversized table imports before parsing', () => {
    expect(() =>
      validateTableImportFile({ name: 'upload.exe', size: 10 })
    ).toThrow('CSV หรือ TXT');
    expect(() =>
      validateTableImportFile({
        name: 'upload.csv',
        size: MAX_TABLE_IMPORT_BYTES + 1,
      })
    ).toThrow('ไม่เกิน 4 MB');
  });
});
