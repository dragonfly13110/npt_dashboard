import { describe, expect, it } from 'vitest';
import { csvMatrixToObjects, parseCsv, parseCsvTable } from './csv';

describe('csv utilities', () => {
  it('parses quoted comma values', () => {
    expect(parseCsv('name,note\r\nA,"one, two"')).toEqual([
      ['name', 'note'],
      ['A', 'one, two'],
    ]);
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
});
