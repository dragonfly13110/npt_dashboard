import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import InteractiveDashboard from '../pages/InteractiveDashboard';
import StrategyDashboard from '../pages/strategy/StrategyDashboard';
import ProductionDashboard from '../pages/production/ProductionDashboard';
import DevelopmentDashboard from '../pages/development/DevelopmentDashboard';
import ProtectionDashboard from '../pages/protection/ProtectionDashboard';
import { useProductionData } from '../hooks/useProductionData';
import { useDevelopmentData } from '../hooks/useDevelopmentData';
import { useProtectionData } from '../hooks/useProtectionData';
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

function renderGroup(Component, props = {}) {
  return render(
    <MemoryRouter>
      <Component {...props} />
    </MemoryRouter>
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

it('filters production summaries by district and each table report-year contract', () => {
  mockUseApiCache.mockReturnValue({
    data: {
      largePlots: [
        {
          commodity_group: 'ข้าว',
          district: BANG_LEN,
          year: 2569,
          member_count: 4,
          area_rai: 10,
        },
        {
          commodity_group: 'ผัก/สมุนไพร',
          district: BANG_LEN,
          year: 2568,
        },
        { commodity_group: 'ไม้ผล', district: 'สามพราน', year: 2569 },
      ],
      certs: [
        { crop_name: 'ส้มโอ', plot_district: BANG_LEN, area_rai: 3 },
        { crop_name: 'ฝรั่ง', plot_district: 'สามพราน', area_rai: 5 },
      ],
      crops: [
        { crop_name: 'ข้าว', district: BANG_LEN, year: 2569 },
        { crop_name: 'อ้อย', district: BANG_LEN, year: 2568 },
        { crop_name: 'ฝรั่ง', district: 'สามพราน', year: 2569 },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  const { result } = renderHook(() =>
    useProductionData({ district: BANG_LEN, year: '2569' })
  );

  expect(result.current.lpStats).toMatchObject({ total: 1, members: 4 });
  expect(result.current.certStats).toMatchObject({ total: 1, area: 3 });
  expect(result.current.cropStats.total).toBe(1);
  expect(result.current.yearSupported).toBe(true);
});

it('filters development summaries with the actual year key for every dated table', () => {
  const datedRows = (yearKey) => [
    { district: BANG_LEN, [yearKey]: 2569, member_count: 2, income: 10 },
    { district: BANG_LEN, [yearKey]: 2568, member_count: 20, income: 100 },
    { district: 'สามพราน', [yearKey]: 2569, member_count: 30, income: 1000 },
  ];
  mockUseApiCache.mockReturnValue({
    data: {
      communityData: [{ district: BANG_LEN }, { district: 'สามพราน' }],
      sfData: datedRows('data_year'),
      ysfData: datedRows('data_year'),
      careerData: datedRows('data_year'),
      housewifeData: datedRows('year'),
      youngGroupData: datedRows('data_year'),
      farmerInstData: [
        { district: BANG_LEN, total_groups: 2 },
        { district: 'สามพราน', total_groups: 20 },
      ],
      tourismData: [
        { district: BANG_LEN, spot_type: 'สวน' },
        { district: 'สามพราน', spot_type: 'ตลาด' },
      ],
      disasterData: datedRows('year').map((row) => ({
        ...row,
        disaster_type: 'น้ำท่วม',
        damaged_area: row.member_count,
        affected_farmers: row.member_count,
      })),
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  const { result } = renderHook(() =>
    useDevelopmentData({ district: BANG_LEN, year: '2569' })
  );

  expect(result.current.ceStats.total).toBe(1);
  expect(result.current.peopleStats).toMatchObject({
    sfTotal: 1,
    sfYear: 2569,
    ysfTotal: 1,
    ysfYear: 2569,
  });
  expect(result.current.groupStats).toMatchObject({
    totalGroups: 3,
    totalMembers: 6,
  });
  expect(result.current.fiStats.total).toBe(2);
  expect(result.current.tourismStats.total).toBe(1);
  expect(result.current.disasterStats).toMatchObject({
    year: 2569,
    total: 1,
  });
  expect(result.current.yearSupported).toBe(true);
});

it('applies only district filtering to protection observations', () => {
  const districtRows = [
    { district: BANG_LEN, establishment_year: 2568 },
    { district: BANG_LEN, establishment_year: 2567 },
    { district: 'สามพราน', establishment_year: 2569 },
  ];
  mockUseApiCache.mockReturnValue({
    data: {
      pestOutbreaks: districtRows.map((row) => ({
        ...row,
        crop_type: 'ข้าว',
        plot_type: 'พื้นที่เสี่ยง',
      })),
      pestCenters: districtRows.map((row) => ({
        ...row,
        main_crop_type: 'ข้าว',
        grade_level: 'A',
      })),
      plantDoctors: districtRows.map((row) => ({
        ...row,
        subdistrict: 'บางปลา',
      })),
      soilFertilizer: districtRows.map((row) => ({
        ...row,
        main_crop_type: 'ข้าว',
        grade_level: 'A',
      })),
      fireHotspots: districtRows,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  const { result } = renderHook(() =>
    useProtectionData({ district: BANG_LEN, year: '2569' })
  );

  expect(result.current.poStats.total).toBe(2);
  expect(result.current.pcStats.total).toBe(2);
  expect(result.current.plantDoctorStats.total).toBe(2);
  expect(result.current.sfStats.total).toBe(2);
  expect(result.current.yearSupported).toBe(false);
});

it('filters strategy rows before calculating the existing summaries', () => {
  mockUseApiCache.mockReturnValue({
    data: {
      agriData: [
        { district: BANG_LEN, rice_in_season_rai: 5 },
        { district: 'สามพราน', rice_in_season_rai: 50 },
      ],
      learningData: [
        { district: BANG_LEN, featured_product: 'ข้าว' },
        { district: 'สามพราน', featured_product: 'ฝรั่ง' },
      ],
      registryData: [
        {
          district: BANG_LEN,
          data_year: 2569,
          target: 8,
          total_updated_households: 4,
        },
        {
          district: BANG_LEN,
          data_year: 2568,
          target: 80,
          total_updated_households: 40,
        },
        {
          district: 'สามพราน',
          data_year: 2569,
          target: 800,
          total_updated_households: 400,
        },
      ],
      weatherData: [],
      geoplotsData: [
        {
          district: BANG_LEN,
          year: 2569,
          target_plots: 4,
          drawn_plots: 2,
        },
        {
          district: BANG_LEN,
          year: 2568,
          target_plots: 40,
          drawn_plots: 20,
        },
        {
          district: 'สามพราน',
          year: 2569,
          target_plots: 400,
          drawn_plots: 200,
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  renderGroup(StrategyDashboard, {
    embedded: true,
    filters: { district: BANG_LEN, year: '2569' },
  });

  const summary = within(screen.getByLabelText('สัญญาณภาพรวมกลุ่มยุทธศาสตร์'));
  expect(summary.getByText('ทะเบียนคืบหน้า').parentElement).toHaveTextContent(
    '4 / 8 ครัวเรือน'
  );
  expect(summary.getByText('วาดแปลง').parentElement).toHaveTextContent(
    '2 / 4 แปลง'
  );
  expect(summary.getByText('พื้นที่เพาะปลูก').parentElement).toHaveTextContent(
    '5'
  );
  expect(summary.getByText('พื้นที่เพาะปลูก').parentElement).toHaveTextContent(
    'ข้อมูลล่าสุด'
  );
  expect(summary.getByText('ศพก.').parentElement).toHaveTextContent('1');
  expect(summary.getByText('ศพก.').parentElement).toHaveTextContent(
    'ข้อมูลล่าสุด'
  );
  expect(summary.getByText('ราคาเกษตร').parentElement).toHaveTextContent(
    'ข้อมูลล่าสุด'
  );
});

it.each([
  [StrategyDashboard, 'ยุทธศาสตร์และสารสนเทศ'],
  [ProductionDashboard, '🌱 ส่งเสริมและพัฒนาการผลิต'],
  [DevelopmentDashboard, 'กลุ่มส่งเสริมและพัฒนาเกษตรกร'],
  [ProtectionDashboard, '🛡️ กลุ่มอารักขาพืช'],
])(
  '%s keeps its standalone header and omits it when embedded',
  (Component, title) => {
    mockUseApiCache.mockReturnValue({
      data: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const standalone = renderGroup(Component);
    expect(screen.getByText(title)).toBeVisible();
    standalone.unmount();

    const embedded = renderGroup(Component, { embedded: true });
    expect(screen.queryByText(title)).not.toBeInTheDocument();
    expect(embedded.container.firstElementChild).toHaveClass(
      'embedded-dashboard'
    );
  }
);

it('discloses that protection observations do not support the selected year', () => {
  mockUseApiCache.mockReturnValue({
    data: {},
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  renderGroup(ProtectionDashboard, {
    embedded: true,
    filters: { district: BANG_LEN, year: '2569' },
  });

  expect(
    screen.getByText('ข้อมูลชุดนี้ไม่รองรับตัวกรองปี แสดงข้อมูลล่าสุด')
  ).toBeVisible();
});

it.each([
  [StrategyDashboard, 'โหลดข้อมูลยุทธศาสตร์ไม่สำเร็จ'],
  [ProductionDashboard, 'โหลดข้อมูลการผลิตไม่สำเร็จ'],
  [DevelopmentDashboard, 'โหลดข้อมูลกลุ่มพัฒนาไม่สำเร็จ'],
  [ProtectionDashboard, 'โหลดข้อมูลอารักขาพืชไม่สำเร็จ'],
])(
  '%s keeps query errors and retry isolated inside the dashboard',
  (Component, title) => {
    const refetch = vi.fn();
    mockUseApiCache.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('offline'),
      refetch,
    });

    renderGroup(Component, { embedded: true });

    expect(screen.getByText(title)).toBeVisible();
    expect(screen.getByText('offline')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    expect(refetch).toHaveBeenCalledOnce();
  }
);
