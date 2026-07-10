import { describe, expect, it, vi } from 'vitest';
import { searchSystemKnowledge } from '../../netlify/functions/lib/line-ai/knowledge.js';

function identity(role = 'guest') {
  return { role, profileId: role === 'guest' ? null : 'profile-1', department: null };
}

describe('LINE knowledge gateway', () => {
  it('denies inaccessible datasets before querying Supabase', async () => {
    const supabase = { rpc: vi.fn() };
    const result = await searchSystemKnowledge({
      supabase,
      identity: identity(),
      catalogIds: ['dataset:assets'],
      searchTerms: ['ครุภัณฑ์'],
    });

    expect(result).toEqual({ found: false, evidence: [], records: [] });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('searches a registered manual for a viewer', async () => {
    const result = await searchSystemKnowledge({
      supabase: { rpc: vi.fn() },
      identity: identity('viewer'),
      catalogIds: ['manual:csv-import'],
      searchTerms: ['CSV', 'นำเข้า'],
    });

    expect(result.found).toBe(true);
    expect(result.records[0].url).toBe('/manual/csv-import');
    expect(result.evidence[0].sourceKind).toBe('system');
  });

  it('removes personal fields from public RPC evidence', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{
          table: 'learning_centers',
          totalCount: 1,
          results: [{ center_name: 'ศูนย์ A', manager: 'ชื่อส่วนตัว', district: 'สามพราน' }],
        }],
        error: null,
      }),
    };
    const result = await searchSystemKnowledge({
      supabase,
      identity: identity(),
      catalogIds: ['dataset:learning_centers'],
      searchTerms: ['ศูนย์'],
    });

    expect(JSON.stringify(result)).not.toMatch(/ชื่อส่วนตัว|manager/i);
    expect(result.records[0].url).toBe(
      'https://npt-dashboard.netlify.app/dashboard/strategy/learning-centers'
    );
  });
});
