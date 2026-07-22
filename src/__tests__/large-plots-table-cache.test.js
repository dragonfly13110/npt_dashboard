import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('large plots table cache', () => {
  it('invalidates the table query when its source data is refreshed', () => {
    const crudTable = readFileSync(
      resolve('src/components/DataTable/CrudTable.jsx'),
      'utf8'
    );
    const largePlots = readFileSync(
      resolve('src/pages/production/LargePlots.jsx'),
      'utf8'
    );

    expect(crudTable).toContain('fetchDataVersion = null');
    expect(crudTable.match(/fetchDataVersion/g)).toHaveLength(3);
    expect(largePlots).toContain('dataUpdatedAt: dashboardDataUpdatedAt');
    expect(largePlots).toContain('fetchDataVersion={dashboardDataUpdatedAt}');
    expect(largePlots).not.toContain(
      'key={`large-plots-${role}-${dashboardData.length}`}'
    );
  });
});
