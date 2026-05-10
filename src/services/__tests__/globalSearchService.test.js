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
                    limit: vi.fn(() => ({ data: [], count: 0, error: null }))
                }))
            }))
        }))
    }
}));

describe('globalSearchService', () => {
    let storage = {};

    beforeEach(() => {
        vi.clearAllMocks();
        storage = {};
        
        // Mock localStorage with a real storage object
        const mockLocalStorage = {
            getItem: vi.fn((key) => storage[key] || null),
            setItem: vi.fn((key, value) => { storage[key] = value; }),
            removeItem: vi.fn((key) => { delete storage[key]; }),
        };
        vi.stubGlobal('localStorage', mockLocalStorage);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('globalSearch', () => {
        it('performs RPC search successfully', async () => {
            const mockData = [
                {
                    table: 'agricultural_areas',
                    results: [
                        { id: 1, district: 'เมืองนครปฐม' }
                    ],
                    totalCount: 1
                }
            ];
            supabase.rpc.mockResolvedValue({ data: mockData, error: null });

            const result = await globalSearchService.globalSearch('test', 5);
            expect(supabase.rpc).toHaveBeenCalledWith('global_search', {
                search_term: 'test',
                result_limit: 5
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

        it('handles results with enrichment', async () => {
            const mockData = [
                {
                    table: 'agricultural_areas',
                    results: [
                        { id: 1, district: 'เมืองนครปฐม', area_name: 'Test Area' }
                    ],
                    totalCount: 1
                }
            ];
            supabase.rpc.mockResolvedValue({ data: mockData, error: null });

            const result = await globalSearchService.globalSearch('test query');
            expect(Array.isArray(result)).toBe(true);
            if (result.length > 0) {
                expect(result[0]).toHaveProperty('table');
                expect(result[0]).toHaveProperty('results');
            }
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
