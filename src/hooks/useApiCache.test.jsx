import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useApiCache } from './useApiCache';
import React from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useApiCache', () => {
  it('fetches data successfully', async () => {
    const mockData = { message: 'hello' };
    const fetchFn = vi.fn().mockResolvedValue(mockData);
    
    const { result } = renderHook(() => useApiCache('test-key', fetchFn), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });
    expect(result.current.data).toEqual(mockData);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('handles error', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Failed'));
    
    const { result } = renderHook(() => useApiCache('error-key', fetchFn, { retry: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(result.current.error.message).toBe('Failed');
  });

  it('parameters pass correctly to useQuery', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ status: 'ok' });
      const { result } = renderHook(() => useApiCache(['param-key', 1], fetchFn, { enabled: false }), {
          wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
  });
});
