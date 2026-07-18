import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dataFetchers from '../dataFetchers';
import { allTables } from '../config';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to create a complete mock supabase from() chain
function createMockSupabase() {
    // Helper to create a chain that resolves with data
    const createChain = (finalResolveValue = { data: [], count: 0, error: null }) => {
        const chain = {
            select: vi.fn(() => chain),
            count: vi.fn(() => Promise.resolve(finalResolveValue)),
            not: vi.fn(() => chain),
            order: vi.fn(() => chain),
            eq: vi.fn(() => Promise.resolve({ data: [] })),
            neq: vi.fn(() => Promise.resolve({ data: [] })),
            limit: vi.fn(() => Promise.resolve(finalResolveValue)),
            insert: vi.fn(() => Promise.resolve({ data: [] })),
            update: vi.fn(() => Promise.resolve({ data: [] })),
            delete: vi.fn(() => Promise.resolve({ data: [] })),
            upsert: vi.fn(() => Promise.resolve({ data: [] })),
            ...finalResolveValue,
        };
        return chain;
    };

    const from = vi.fn((tableName) => {
        // Return different chains for different tables if needed
        return createChain({ data: [], count: 0, error: null });
    });

    return {
        from,
        rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };
}

describe('dataFetchers', () => {
    let mockSupabase;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
    });

    describe('fetchPublicCertificationsCount', () => {
        it('fetches and returns count from API', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ count: 42 })
            });

            const result = await dataFetchers.fetchPublicCertificationsCount();
            expect(result).toBe(42);
            expect(mockFetch).toHaveBeenCalledWith('/api/public-certifications?count=1');
        });

        it('returns null on error', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const result = await dataFetchers.fetchPublicCertificationsCount();
            expect(result).toBeNull();
        });
    });

    describe('fetchAllCounts', () => {
        it('fetches counts for all tables', async () => {
            const result = await dataFetchers.fetchAllCounts(mockSupabase);
            expect(result).toHaveLength(allTables.length);
            result.forEach(item => {
                expect(item).toHaveProperty('table');
                expect(item).toHaveProperty('label');
                expect(item).toHaveProperty('count');
            });
        });
    });

    describe('fetchMapData', () => {
        it('fetches map data with coordinates', async () => {
            const result = await dataFetchers.fetchMapData(mockSupabase);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('fetchCommunityData', () => {
        it('fetches community and stats data', async () => {
            const result = await dataFetchers.fetchCommunityData(mockSupabase);
            expect(result).toHaveProperty('sfData');
            expect(result).toHaveProperty('ceData');
            expect(result).toHaveProperty('atData');
            expect(result).toHaveProperty('lpData');
            expect(result).toHaveProperty('instData');
            expect(result).toHaveProperty('agriAreaData');
            expect(result).toHaveProperty('lcData');
            expect(result).toHaveProperty('pcData');
            expect(result).toHaveProperty('sfcData');
        });
    });
});
