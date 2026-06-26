import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as globalSearchService from '../globalSearchService';
import { supabase } from '../../supabaseClient';

// Mock Supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          limit: vi.fn(() => ({ data: [], count: 0, error: null })),
        })),
      })),
    })),
  },
}));

describe('globalSearchService', () => {
  let storage = {};

  beforeEach(() => {
    vi.clearAllMocks();
    storage = {};

    // Mock browser storage with real storage objects
    const createMockStorage = () => ({
      getItem: vi.fn((key) => storage[key] || null),
      setItem: vi.fn((key, value) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete storage[key];
      }),
    });
    vi.stubGlobal('localStorage', createMockStorage());
    vi.stubGlobal('sessionStorage', createMockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('globalSearch', () => {
    it('performs RPC search successfully', async () => {
      const mockData = [
        {
          table: 'agricultural_areas',
          results: [{ id: 1, district: 'เมืองนครปฐม' }],
          totalCount: 1,
        },
      ];
      supabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await globalSearchService.globalSearch('test', 5);
      expect(supabase.rpc).toHaveBeenCalledWith('global_search', {
        search_term: 'test',
        result_limit: 5,
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('falls back to parallel search when RPC fails', async () => {
      supabase.rpc.mockRejectedValue(new Error('RPC failed'));

      const result = await globalSearchService.globalSearch('test', 5);
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array for short query', async () => {
      const result = await globalSearchService.globalSearch('a');
      expect(result).toEqual([]);
    });

    it('reuses cached results for repeated query', async () => {
      const mockData = [
        {
          table: 'agricultural_areas',
          results: [{ id: 2, district: 'กำแพงแสน' }],
          totalCount: 1,
        },
      ];
      supabase.rpc.mockResolvedValue({ data: mockData, error: null });

      await globalSearchService.globalSearch('cache-query-1', 5);
      await globalSearchService.globalSearch('cache-query-1', 5);

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('deduplicates in-flight searches for the same query', async () => {
      const mockData = [
        {
          table: 'agricultural_areas',
          results: [{ id: 3, district: 'เมืองนครปฐม' }],
          totalCount: 1,
        },
      ];
      supabase.rpc.mockResolvedValue({ data: mockData, error: null });

      await Promise.all([
        globalSearchService.globalSearch('inflight-query-1', 5),
        globalSearchService.globalSearch('inflight-query-1', 5),
      ]);

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('handles results with enrichment', async () => {
      const mockData = [
        {
          table: 'agricultural_areas',
          results: [{ id: 1, district: 'เมืองนครปฐม', area_name: 'Test Area' }],
          totalCount: 1,
        },
      ];
      supabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await globalSearchService.globalSearch('test query');
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('table');
        expect(result[0]).toHaveProperty('results');
      }
    });

    it('formats soil_series search rows with correct subtitle layout', async () => {
      const mockData = [
        {
          table: 'soil_series',
          results: [
            {
              id: 99,
              soil_series_name: 'บางเลน',
              soil_series_code: 'Bl',
              soil_group: '6',
              texture: 'ดินเหนียว',
              fertility: 'สูง',
              ph_top: '6.0-6.5',
              district: 'บางเลน',
              area_rai: 1234,
            },
          ],
          totalCount: 1,
        },
      ];
      supabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await globalSearchService.globalSearch('บางเลน', 5);
      expect(result).toBeDefined();
      expect(result[0].table).toBe('soil_series');

      const soilRow = result[0].results[0];
      expect(soilRow.title).toBe('บางเลน');
      expect(soilRow.subtitle).toBe('อ.บางเลน • Bl • 6');
    });

    it('formats budget search rows without exposing raw notes JSON', async () => {
      const mockData = [
        {
          table: 'budgets',
          results: [
            {
              id: 74,
              project_name: 'รายการงบประมาณ',
              budget_source: 'แผนงานยุทธศาสตร์การเกษตรสร้างมูลค่า',
              budget_amount: 12000,
              spent_amount: 0,
              status: 'รอบ 2',
              notes: JSON.stringify({
                plan: 'แผนงานยุทธศาสตร์การเกษตรสร้างมูลค่า',
                project: 'โครงการส่งเสริมและพัฒนาผู้ประกอบการวิสาหกิจชุมชน',
                activity: 'ข้าวเจ้า',
                district: 'กำแพงแสน',
                detail: 'อบรมเกษตรกร',
                target: '20 ราย',
                owner: 'กลุ่มส่งเสริมอาชีพ',
              }),
            },
          ],
          totalCount: 1,
        },
      ];
      supabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await globalSearchService.globalSearch('budget row', 5);
      const budgetRow = result[0].results[0].raw;

      expect(budgetRow.project_name).toContain('โครงการส่งเสริม');
      expect(budgetRow.activity).toBe('ข้าวเจ้า');
      expect(budgetRow.district).toBe('กำแพงแสน');
      expect(budgetRow.notes).toBe('อบรมเกษตรกร • 20 ราย • กลุ่มส่งเสริมอาชีพ');
      expect(budgetRow.notes).not.toContain('{"');
    });
  });

  describe('recent searches', () => {
    it('adds and retrieves recent searches', () => {
      globalSearchService.addRecentSearch('test query');
      const recent = globalSearchService.getRecentSearches();
      expect(recent).toContain('test query');
    });

    it('does not add short or empty searches', () => {
      globalSearchService.addRecentSearch('a');
      const recent = globalSearchService.getRecentSearches();
      expect(recent).not.toContain('a');
    });

    it('clears recent searches', () => {
      globalSearchService.addRecentSearch('test query');
      globalSearchService.clearRecentSearches();
      const recent = globalSearchService.getRecentSearches();
      expect(recent).toEqual([]);
    });
  });
});
