import { describe, expect, it } from 'vitest';
import catalog from '../domain/datasetCatalog.json';
import { getPublicSelectColumns, isPrivateColumn } from '../utils/dataPrivacy';

const entries = new Map(
  [...catalog.LINE_DATASETS, ...catalog.SYSTEM_PAGES, ...catalog.MANUALS].map(
    (entry) => [entry.id, entry]
  )
);

describe('LINE system knowledge acceptance matrix', () => {
  it('covers representative system questions', () => {
    for (const id of [
      'dataset:large_plots',
      'dataset:personnel',
      'dataset:daily_weather',
      'dataset:fire_hotspots',
      'dataset:ai_disease_forecasts',
      'manual:csv-import',
      'page:data-dictionary',
    ]) {
      expect(entries.get(id)).toBeTruthy();
      expect(entries.get(id).route).toMatch(/^\//);
    }
  });

  it('keeps public identity fields private', () => {
    for (const [table, field] of [
      ['smart_farmer_sf', 'full_name'],
      ['learning_centers', 'manager'],
      ['pest_centers', 'chairman'],
      ['personnel', 'full_name'],
    ]) {
      expect(isPrivateColumn(table, { dataIndex: field })).toBe(true);
    }
  });

  it('allows household count and totals to be public-safe', () => {
    expect(
      isPrivateColumn('farmer_registry', { dataIndex: 'household_count' })
    ).toBe(false);
    expect(
      isPrivateColumn('farmer_registry', {
        dataIndex: 'total_updated_households',
      })
    ).toBe(false);
  });

  it('keeps unreviewed custom fields out of guest selects', () => {
    const select = getPublicSelectColumns(
      'farmer_registry',
      [{ dataIndex: 'district' }],
      'guest',
      ['custom_fields', 'updated_at']
    );

    expect(select).toContain('district');
    expect(select).toContain('updated_at');
    expect(select).not.toContain('custom_fields');
  });

  it('has explicit system-first and external disclosure policy in code', async () => {
    const { readFileSync } = await import('node:fs');
    const orchestrator = readFileSync(
      'netlify/functions/lib/line-ai/orchestrator.js',
      'utf8'
    );
    expect(orchestrator).toContain('searchSystemKnowledge');
    expect(orchestrator).toContain(
      'ไม่พบข้อมูลนี้ในระบบ คำตอบต่อไปนี้ค้นจากอินเทอร์เน็ต'
    );
    expect(orchestrator).toContain("sourceType: 'internet'");
  });
});
