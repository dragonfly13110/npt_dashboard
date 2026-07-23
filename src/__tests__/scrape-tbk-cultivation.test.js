import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTbkReportUrl,
  scrapeTbkCultivation,
  TBK_GROUPS,
} from '../../scripts/scrape_tbk_cultivation';

const header = `
<table id="table_id_1"><thead>
<tr><th>รหัส</th><th>จังหวัด/อำเภอ/ตำบล/หมู่</th><th>พืช/พันธ์พืช</th><th>จำนวน</th><th>ภัยธรรมชาติ</th><th>คงเหลือ</th></tr>
</thead><tbody>`;
const row = (name) =>
  `<tr><td>2-73</td><td>นครปฐม</td><td>${name}</td><td>1</td><td>2</td><td>3.50</td><td>0</td><td>0</td><td>0</td><td>3.50</td></tr>`;
const page = (rows = '') => `${header}${rows}</tbody></table>`;

describe('TBK cultivation scraper', () => {
  beforeEach(() => {
    process.env.DOAE_USERNAME = 'user';
    process.env.DOAE_PASSWORD = 'pass';
    process.env.SUPABASE_PROJECT_REF = 'project';
    process.env.SUPABASE_ACCESS_TOKEN = 'token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of [
      'DOAE_USERNAME',
      'DOAE_PASSWORD',
      'SUPABASE_PROJECT_REF',
      'SUPABASE_ACCESS_TOKEN',
    ]) {
      delete process.env[key];
    }
  });

  it('builds the current-year Nakhon Pathom report query', () => {
    const url = new URL(buildTbkReportUrl('01', 69));
    expect(url.searchParams.get('year')).toBe('69');
    expect(url.searchParams.get('ProvinceCode')).toBe('73');
    expect(url.searchParams.get(' TypeCode')).toBe('01');
    expect(url.searchParams.get('DetailCodeShow')).toBe('1');
    expect(url.searchParams.get('BreedCodeShow')).toBe('1');
  });

  it('does not write when grouped rows differ from the control report', async () => {
    const fetchImpl = vi.fn();
    fetchImpl
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 302 }))
      .mockResolvedValueOnce(new Response(page(row('ข้าว')), { status: 200 }));
    for (const group of TBK_GROUPS) {
      fetchImpl.mockResolvedValueOnce(
        new Response(page(group.code === '01' ? '' : ''), { status: 200 })
      );
    }
    const runSQL = vi.fn();

    await expect(
      scrapeTbkCultivation({
        fetchImpl,
        runSQL,
        currentDate: new Date('2026-07-23'),
      })
    ).rejects.toThrow('Grouped TBK row count');
    expect(runSQL).not.toHaveBeenCalled();
  });

  it('writes one validated snapshot transaction', async () => {
    const fetchImpl = vi.fn();
    fetchImpl
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 302 }))
      .mockResolvedValueOnce(new Response(page(row('ข้าว')), { status: 200 }));
    for (const group of TBK_GROUPS) {
      fetchImpl.mockResolvedValueOnce(
        new Response(page(group.code === '01' ? row('ข้าว') : ''), {
          status: 200,
        })
      );
    }
    const runSQL = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ row_count: 1 }]);

    await expect(
      scrapeTbkCultivation({
        fetchImpl,
        runSQL,
        currentDate: new Date('2026-07-23'),
      })
    ).resolves.toMatchObject({ dataYear: 2569, rowCount: 1 });
    expect(runSQL.mock.calls[0][0]).toContain(
      'insert into public.tbk_cultivation_snapshots'
    );
  });
});
