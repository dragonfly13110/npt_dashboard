import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrapeRiceHarvest } from '../../scripts/scrape_rice_harvest.js';

const MONTHS = [
  '\u0e01\u0e23\u0e01\u0e0e\u0e32\u0e04\u0e21',
  '\u0e2a\u0e34\u0e07\u0e2b\u0e32\u0e04\u0e21',
  '\u0e01\u0e31\u0e19\u0e22\u0e32\u0e22\u0e19',
  '\u0e15\u0e38\u0e25\u0e32\u0e04\u0e21',
  '\u0e1e\u0e24\u0e28\u0e08\u0e34\u0e01\u0e32\u0e22\u0e19',
  '\u0e18\u0e31\u0e19\u0e27\u0e32\u0e04\u0e21',
  '\u0e21\u0e01\u0e23\u0e32\u0e04\u0e21',
  '\u0e01\u0e38\u0e21\u0e20\u0e32\u0e1e\u0e31\u0e19\u0e18\u0e4c',
  '\u0e21\u0e35\u0e19\u0e32\u0e04\u0e21',
  '\u0e40\u0e21\u0e29\u0e32\u0e22\u0e19',
  '\u0e1e\u0e24\u0e29\u0e20\u0e32\u0e04\u0e21',
  '\u0e21\u0e34\u0e16\u0e38\u0e19\u0e32\u0e22\u0e19',
];

function validReportHtml() {
  const headers = MONTHS.map((month) => `<th colspan="3">${month}</th>`).join('');
  const cells = MONTHS.map(() => '<td>1</td><td>1</td><td>1</td>').join('');
  const rows = Array.from(
    { length: 7 },
    (_, index) =>
      `<tr><td>2-730${index + 1}00</td><td>district ${index + 1}</td>${cells}</tr>`
  ).join('');
  return `<table id="table_id"><thead><tr><th>รหัส</th><th>อำเภอ</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

function configureEnv() {
  process.env.DOAE_USERNAME = 'doae-user';
  process.env.DOAE_PASSWORD = 'doae-pass';
  process.env.SUPABASE_PROJECT_REF = 'project-ref';
  process.env.SUPABASE_ACCESS_TOKEN = 'access-token';
}

function response(body, headers = {}) {
  return new Response(body, { status: 200, headers });
}

describe('scrape rice harvest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of [
      'DOAE_USERNAME',
      'DOAE_PASSWORD',
      'SUPABASE_PROJECT_REF',
      'SUPABASE_ACCESS_TOKEN',
    ]) delete process.env[key];
  });

  it('does not write an empty source report', async () => {
    configureEnv();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response('', { 'set-cookie': 'sid=initial' }))
      .mockResolvedValueOnce(response('', { 'set-cookie': 'sid=authenticated' }))
      .mockResolvedValueOnce(response('<table><tbody></tbody></table>'));
    const runSQL = vi.fn();

    await expect(
      scrapeRiceHarvest({
        fetchImpl,
        runSQL,
        candidateSeasonCodes: ['69_1'],
      })
    ).rejects.toThrow('No usable DOAE rice harvest report found');
    expect(runSQL).not.toHaveBeenCalled();
  });

  it('writes a validated 84-row snapshot with the calculated tonnage', async () => {
    configureEnv();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response('', { 'set-cookie': 'sid=initial' }))
      .mockResolvedValueOnce(response('', { 'set-cookie': 'sid=authenticated' }))
      .mockResolvedValueOnce(response(validReportHtml()));
    const runSQL = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ row_count: 84 }]);

    const result = await scrapeRiceHarvest({
      fetchImpl,
      runSQL,
      candidateSeasonCodes: ['69_1'],
      currentDate: new Date('2026-07-23T00:00:00Z'),
    });

    expect(result.rowCount).toBe(84);
    expect(runSQL).toHaveBeenCalledTimes(2);
    expect(runSQL.mock.calls[0][0]).toContain('estimated_tons');
    expect(runSQL.mock.calls[0][0]).toContain('0.8');
  });
});
