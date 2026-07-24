import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import InteractiveDashboard from '../InteractiveDashboard';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
const selectedQueries = [];
const BANG_LEN = 'บางเลน';

vi.mock('../../components/widgets/EChart', () => ({ default: () => null }));
vi.mock('../../components/widgets/LandingMap', () => ({
  default: ({ mapData }) => (
    <output data-testid="overview-map-ready">{mapData.length}</output>
  ),
}));
vi.mock('../../supabaseClient', () => ({
  supabase: { from: mockFrom },
}));

const rowsByTable = {
  agricultural_areas: [
    {
      district: BANG_LEN,
      farmer_households: 10,
      total_area_rai: 20,
      agri_crop_area_rai: 15,
      rice_in_season_rai: 10,
      rice_off_season_rai: 5,
      field_crops_rai: 0,
      horticulture_rai: 0,
      fruit_trees_rai: 0,
      vegetables_rai: 0,
      flowers_rai: 0,
      herbs_spices_rai: 0,
    },
  ],
  large_plots: [
    {
      district: BANG_LEN,
      year: 2568,
      commodity_group: 'ข้าว',
      member_count: 10,
      area_rai: 20,
    },
    {
      district: BANG_LEN,
      year: 2568,
      commodity_group: 'ข้าว',
      member_count: 10,
      area_rai: 20,
    },
    {
      district: BANG_LEN,
      year: 2569,
      commodity_group: 'ไม้ผล',
      member_count: 5,
      area_rai: 8,
    },
    {
      district: 'สามพราน',
      year: 2569,
      commodity_group: 'ไม้ผล',
      member_count: 6,
      area_rai: 9,
    },
  ],
  gis_areas: [
    {
      area_name: 'แปลงตัวอย่าง',
      district: BANG_LEN,
      latitude: 14,
      longitude: 100,
    },
  ],
};

function makeQuery(result) {
  const query = {
    neq: () => query,
    not: () => query,
    order: () => query,
    limit: () => query,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function renderPage(path = '/interactive-dashboard') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <InteractiveDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  selectedQueries.length = 0;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ count: 0 }),
    })
  );
  mockFrom.mockReset();
  mockFrom.mockImplementation((table) => ({
    select: (columns, options) => {
      selectedQueries.push({ table, columns, options });
      const rows = rowsByTable[table] || [];
      const result =
        table === 'ai_disease_forecasts'
          ? { data: [], error: null }
          : { data: rows, count: rows.length, error: null };
      return makeQuery(result);
    },
  }));
});

it('initial overview requests only minimal public summary datasets', async () => {
  renderPage();

  await screen.findByTestId('overview-map-ready');

  const requestedTables = new Set(selectedQueries.map(({ table }) => table));
  [
    'certifications',
    'crop_production',
    'smart_farmer_sf',
    'young_smart_farmer_ysf',
    'disasters',
    'pest_outbreaks',
    'fire_hotspots',
    'forecast_plots',
    'plant_doctors',
  ].forEach((table) => expect(requestedTables).not.toContain(table));

  expect(selectedQueries).toContainEqual(
    expect.objectContaining({
      table: 'large_plots',
      columns: 'district,member_count,area_rai,commodity_group,year',
    })
  );
  const overviewQueries = selectedQueries.filter(({ table }) =>
    [
      'community_enterprises',
      'large_plots',
      'agricultural_areas',
      'learning_centers',
      'pest_centers',
      'soil_fertilizer_centers',
      'gis_areas',
      'agri_tourism',
    ].includes(table)
  );
  expect(overviewQueries.every(({ columns }) => columns !== '*')).toBe(true);
});

it('uses the global latest large-plot year before district aggregation', async () => {
  renderPage(`/interactive-dashboard?district=${BANG_LEN}`);

  const title = await screen.findByText('แปลงใหญ่', {
    selector: '.metric-title',
  });
  const card = title.closest('button');

  await waitFor(() => expect(within(card).getByText('1')).toBeVisible());
  expect(within(card).queryByText('3')).not.toBeInTheDocument();
});
