import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import InteractiveDashboard from '../pages/InteractiveDashboard';
import {
  useInteractiveFilters,
  useInteractiveYears,
} from '../pages/interactiveDashboard/useInteractiveFilters';
import {
  ALL_DISTRICTS,
  LATEST_YEAR,
} from '../pages/interactiveDashboard/filters';

const { mockFrom, mockUseApiCache } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUseApiCache: vi.fn(),
}));
const DISTRICT_LABEL =
  '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2d\u0e33\u0e40\u0e20\u0e2d';
const YEAR_LABEL =
  '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1b\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25';
const BANG_LEN = '\u0e1a\u0e32\u0e07\u0e40\u0e25\u0e19';
const LATEST_LABEL =
  '\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14';

vi.mock('../components/widgets/EChart', () => ({ default: () => null }));
vi.mock('../hooks/useApiCache', () => ({ useApiCache: mockUseApiCache }));
vi.mock('../hooks/useDashboardData', async (importOriginal) => ({
  ...(await importOriginal()),
  useDashboardData: () => ({
    loading: false,
    error: null,
    refetch: vi.fn(),
    stats: [{ table: 'learning_centers', count: 0 }],
    districtStats: {},
    instituteStats: {},
    lpStats: {},
    agriStats: {},
    smartFarmers: {},
    enterprises: {},
    tourism: {},
    ceDistrictStats: {},
    agriPie: [],
    lpPie: [],
  }),
}));
vi.mock('../supabaseClient', () => ({
  supabase: { from: mockFrom },
}));

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  mockUseApiCache.mockReset();
  mockUseApiCache.mockReturnValue({ data: [2569], isLoading: false });
  mockFrom.mockReset();
  mockFrom.mockImplementation(() => ({
    select: () => ({
      order: () => ({
        limit: async () => ({ data: [], error: null }),
      }),
    }),
  }));
});

function Location() {
  return <output data-testid="location">{useLocation().search}</output>;
}

function renderDashboard(path) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <InteractiveDashboard />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

it('restores district and year from the URL', async () => {
  renderDashboard(`/interactive-dashboard?district=${BANG_LEN}&year=2569`);
  expect(
    (await screen.findByLabelText(DISTRICT_LABEL)).closest('.ant-select')
  ).toHaveTextContent(BANG_LEN);
  expect(
    screen.getByLabelText(YEAR_LABEL).closest('.ant-select')
  ).toHaveTextContent('2569');
});

it('writes filter changes to the URL and removes default parameters', async () => {
  renderDashboard(
    `/interactive-dashboard?view=map&district=${BANG_LEN}&year=2569`
  );

  fireEvent.mouseDown(screen.getByLabelText(DISTRICT_LABEL));
  fireEvent.click(await screen.findByText(ALL_DISTRICTS));
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?view=map&year=2569'
    )
  );

  fireEvent.mouseDown(screen.getByLabelText(YEAR_LABEL));
  fireEvent.click(await screen.findByText(LATEST_LABEL));
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent('?view=map')
  );
});

it('normalizes invalid district and year filter values', () => {
  const wrapper = ({ children }) => (
    <MemoryRouter
      initialEntries={['/interactive-dashboard?district=invalid&year=3000']}
    >
      {children}
    </MemoryRouter>
  );
  const { result } = renderHook(
    () => ({ filters: useInteractiveFilters(), search: useLocation().search }),
    { wrapper }
  );

  expect(result.current.filters.district).toBe(ALL_DISTRICTS);
  expect(result.current.filters.year).toBe(LATEST_YEAR);

  act(() => {
    result.current.filters.setDistrict('invalid');
  });
  expect(result.current.search).toBe('?year=3000');

  act(() => {
    result.current.filters.setYear('3000');
  });
  expect(result.current.search).toBe('');
});

it('keeps years from successful metadata sources when one source fails', async () => {
  let fetchYears;
  mockUseApiCache.mockImplementation((_key, fetcher) => {
    fetchYears = fetcher;
    return { data: [], isLoading: false };
  });
  mockFrom.mockImplementation((table) => ({
    select: () => {
      if (table === 'tbk_cultivation_snapshots') {
        return Promise.reject(new Error('unavailable'));
      }
      return Promise.resolve({
        data:
          table === 'large_plots'
            ? [{ year: 3000 }, { year: 2568 }]
            : [{ data_year: 2569 }],
      });
    },
  }));

  function YearsProbe() {
    useInteractiveYears();
    return null;
  }

  render(<YearsProbe />);
  await expect(fetchYears()).resolves.toEqual([2569, 2568]);
});
