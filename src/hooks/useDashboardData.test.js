import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryFn: null,
  from: vi.fn(),
}));

vi.mock('../supabaseClient', () => ({
  supabase: { from: mocks.from },
}));

vi.mock('./useApiCache', () => ({
  useApiCache: vi.fn((_key, queryFn) => {
    mocks.queryFn = queryFn;
    return { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
  }),
}));

vi.mock('./dashboard/dataFetchers', () => ({
  fetchPublicCertificationsCount: vi.fn(() => Promise.resolve(null)),
  fetchChartData: vi.fn(() => Promise.resolve({})),
  fetchMapData: vi.fn(() => Promise.resolve([])),
  fetchCommunityData: vi.fn(() =>
    Promise.resolve({
      ceData: { data: [], count: 0 },
    })
  ),
}));

import { useDashboardData } from './useDashboardData';

describe('useDashboardData', () => {
  beforeEach(() => {
    mocks.from.mockImplementation((table) => ({
      select: vi.fn(() =>
        Promise.resolve(
          table === 'agricultural_career_groups'
            ? { count: null, error: new Error('Request failed') }
            : { count: 0, error: null }
        )
      ),
    }));
  });

  it('keeps a failed table separate from tables with zero records', async () => {
    renderHook(() => useDashboardData());

    const data = await mocks.queryFn();

    expect(data.stats.find((item) => item.table === 'agricultural_career_groups')).toMatchObject({ count: 0 });
    expect(data.failedTables).toContain('agricultural_career_groups');
  });
});
