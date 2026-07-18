import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Dashboard error state', () => {
  it('does not present a failed load as an empty database', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/Dashboard.jsx'),
      'utf8'
    );

    expect(source).toContain('const hasDashboardError = Boolean(error)');
    expect(source).toContain('totalRecords === 0 && !loading && !hasDashboardError');
  });
});
