import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi, it, expect } from 'vitest';
import InteractiveDashboard from '../pages/InteractiveDashboard';

vi.mock('../components/widgets/EChart', () => ({ default: () => null }));
vi.mock('../hooks/useApiCache', () => ({
  useApiCache: () => ({ data: [2569], isLoading: false }),
}));
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
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

function renderDashboard(path) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <InteractiveDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

it('restores district and year from the URL', async () => {
  renderDashboard(
    '/interactive-dashboard?district=\u0e1a\u0e32\u0e07\u0e40\u0e25\u0e19&year=2569'
  );
  expect(
    (
      await screen.findByLabelText(
        '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2d\u0e33\u0e40\u0e20\u0e2d'
      )
    ).closest('.ant-select')
  ).toHaveTextContent('\u0e1a\u0e32\u0e07\u0e40\u0e25\u0e19');
  expect(
    screen
      .getByLabelText(
        '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1b\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25'
      )
      .closest('.ant-select')
  ).toHaveTextContent('2569');
});
