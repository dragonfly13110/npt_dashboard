import { useQuery } from '@tanstack/react-query';

/**
 * Custom hook for cached API fetching using TanStack React Query.
 * 
 * @param {string|Array} queryKey - Unique cache key (string or array for parameterized queries)
 * @param {Function} fetchFn - Async function that returns the data
 * @param {Object} options - Additional options
 * @param {number} options.staleMinutes - Minutes before data is considered stale (default: 15)
 * @param {number} options.cacheMinutes - Minutes to keep unused data in cache (default: 60)
 * @param {boolean} options.enabled - Whether to run the query (default: true)
 * @param {boolean} options.refetchOnWindowFocus - Refetch when window regains focus (default: false)
 */
export function useApiCache(queryKey, fetchFn, options = {}) {
    const {
        staleMinutes = 15,
        cacheMinutes = 60,
        enabled = true,
        refetchOnWindowFocus = false,
        ...restOptions
    } = options;

    const key = Array.isArray(queryKey) ? queryKey : [queryKey];

    return useQuery({
        queryKey: key,
        queryFn: fetchFn,
        staleTime: staleMinutes * 60 * 1000,
        gcTime: cacheMinutes * 60 * 1000,
        enabled,
        refetchOnWindowFocus,
        retry: 1,
        ...restOptions,
    });
}
