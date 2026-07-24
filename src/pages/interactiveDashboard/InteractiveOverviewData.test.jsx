import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import InteractiveDashboard from '../InteractiveDashboard';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
const selectedQueries = [];
let intersectionObservers = [];
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

async function activateModule(id) {
  const observer = await waitFor(() => {
    const candidate = intersectionObservers.find(
      (item) => item.targets.length === 1 && item.targets[0]?.id === id
    );
    expect(candidate).toBeDefined();
    return candidate;
  });
  act(() =>
    observer.callback([
      { isIntersecting: true, target: document.getElementById(id) },
    ])
  );
}

beforeEach(() => {
  selectedQueries.length = 0;
  intersectionObservers = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        this.callback = callback;
        this.targets = [];
        intersectionObservers.push(this);
      }

      observe(target) {
        this.targets.push(target);
      }

      disconnect() {
        this.disconnected = true;
      }
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
    'pest_outbreaks',
    'fire_hotspots',
    'forecast_plots',
    'plant_doctors',
  ].forEach((table) => expect(requestedTables).not.toContain(table));

  expect(selectedQueries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ table: 'crop_production', columns: 'year' }),
      expect.objectContaining({
        table: 'production_costs',
        columns: 'data_year',
      }),
      expect.objectContaining({ table: 'disasters', columns: 'year' }),
      expect.objectContaining({
        table: 'smart_farmer_sf',
        columns: 'data_year',
      }),
      expect.objectContaining({
        table: 'young_smart_farmer_ysf',
        columns: 'data_year',
      }),
      expect.objectContaining({
        table: 'agricultural_career_groups',
        columns: 'data_year',
      }),
      expect.objectContaining({
        table: 'housewife_farmer_groups',
        columns: 'year',
      }),
      expect.objectContaining({
        table: 'young_farmer_groups_detailed',
        columns: 'data_year',
      }),
      expect.objectContaining({
        table: 'rice_harvest_snapshots',
        columns: 'crop_year',
      }),
    ])
  );

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

it('reuses overview rows when lazy domain modules activate', async () => {
  renderPage();
  await screen.findByTestId('overview-map-ready');

  for (const id of [
    'land',
    'production',
    'groups',
    'networks',
    'risk',
    'extras',
  ]) {
    await activateModule(id);
  }
  await waitFor(() =>
    expect(selectedQueries.some(({ table }) => table === 'soil_series')).toBe(
      true
    )
  );

  const requestCount = (table, columns) =>
    selectedQueries.filter(
      (query) => query.table === table && query.columns === columns
    ).length;

  expect(
    requestCount(
      'large_plots',
      'district,member_count,area_rai,commodity_group,year'
    )
  ).toBe(1);
  expect(requestCount('large_plots', 'year')).toBe(1);
  expect(
    requestCount(
      'agricultural_areas',
      'district,farmer_households,total_area_rai,agri_crop_area_rai,rice_in_season_rai,rice_off_season_rai,field_crops_rai,horticulture_rai,fruit_trees_rai,vegetables_rai,flowers_rai,herbs_spices_rai'
    )
  ).toBe(1);
  expect(requestCount('community_enterprises', 'district')).toBe(1);
  expect(requestCount('learning_centers', 'district,featured_product')).toBe(1);
  expect(
    requestCount('pest_centers', 'main_crop_type,district,grade_level')
  ).toBe(1);
  expect(
    requestCount(
      'soil_fertilizer_centers',
      'main_crop_type,district,grade_level'
    )
  ).toBe(1);
  expect(
    requestCount(
      'agri_tourism',
      'spot_name,district,spot_type,latitude,longitude'
    )
  ).toBe(1);
  expect(requestCount('crop_production', 'year')).toBe(1);
  expect(requestCount('crop_production', 'crop_name, district, year')).toBe(1);
  expect(requestCount('production_costs', 'data_year')).toBe(1);
  expect(
    requestCount(
      'production_costs',
      'data_year,crop_name,total_cost_baht,revenue_baht_per_rai'
    )
  ).toBe(1);
  expect(requestCount('disasters', 'year')).toBe(1);
  expect(
    requestCount(
      'disasters',
      'year, district, disaster_type, damaged_area, affected_farmers'
    )
  ).toBe(1);
});
