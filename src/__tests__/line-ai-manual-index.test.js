import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildManualIndex } from '../../scripts/build-line-manual-index.mjs';

describe('LINE manual index', () => {
  it('contains chunks only from registered manuals', () => {
    const generated = buildManualIndex(process.cwd());
    const committed = JSON.parse(
      readFileSync(
        'netlify/functions/lib/line-ai/manual-index.json',
        'utf8'
      )
    );

    expect(committed).toEqual(generated);
    expect(new Set(generated.map((chunk) => chunk.id))).toContain(
      'manual:csv-import'
    );
    expect(generated.every((chunk) => chunk.content.length <= 1600)).toBe(true);
  });
});
