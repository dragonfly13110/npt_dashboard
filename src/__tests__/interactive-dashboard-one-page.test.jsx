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
import ProtectionDashboard, {
  ProtectionNetworkSummary,
} from '../pages/protection/ProtectionDashboard';
import { useProductionData } from '../hooks/useProductionData';
import { useDevelopmentData } from '../hooks/useDevelopmentData';
import { useProtectionData } from '../hooks/useProtectionData';
import {
  summarizeExtras,
  useInteractiveExtrasData,
} from '../hooks/useInteractiveExtrasData';
import { ExtrasSection } from '../pages/interactiveDashboard/ExtrasSection';
import {
  useInteractiveFilters,
  useInteractiveYears,
} from '../pages/interactiveDashboard/useInteractiveFilters';
import {
  ALL_DISTRICTS,
  LATEST_YEAR,
} from '../pages/interactiveDashboard/filters';

const { mockFrom, mockUseApiCache, mockUseDashboardData } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUseApiCache: vi.fn(),
  mockUseDashboardData: vi.fn(),
}));
const scrollIntoView = vi.fn();
let intersectionObservers = [];
const DISTRICT_LABEL =
  '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2d\u0e33\u0e40\u0e20\u0e2d';
const YEAR_LABEL =
  '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1b\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25';
const BANG_LEN = '\u0e1a\u0e32\u0e07\u0e40\u0e25\u0e19';
const LATEST_LABEL =
  '\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14';

vi.mock('../components/widgets/EChart', () => ({ default: () => null }));
vi.mock('../components/widgets/LandingMap', () => ({
  default: ({ mapData }) => (
    <output data-testid="landing-map">
      {mapData.map((point) => point.district).join('|')}
    </output>
  ),
}));
vi.mock('../hooks/useApiCache', () => ({ useApiCache: mockUseApiCache }));
vi.mock('../hooks/useDashboardData', async (importOriginal) => ({
  ...(await importOriginal()),
  useDashboardData: mockUseDashboardData,
  useInteractiveOverviewData: mockUseDashboardData,
}));
vi.mock('../supabaseClient', () => ({
  supabase: { from: mockFrom },
}));

const overviewData = () => ({
  loading: false,
  error: null,
  refetch: vi.fn(),
  stats: [{ table: 'learning_centers', count: 0 }],
  mapData: [
    { district: BANG_LEN, type: 'gis' },
    { district: 'สามพราน', type: 'gis' },
  ],
  districtStats: { [BANG_LEN]: {} },
  instituteStats: {},
  lpStats: {},
  agriStats: {},
  smartFarmers: {},
  enterprises: {},
  tourism: {},
  ceDistrictStats: {},
  agriPie: [],
  lpPie: [],
});

beforeEach(() => {
  intersectionObservers = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.targets = [];
        intersectionObservers.push(this);
      }

      observe(target) {
        this.targets.push(target);
      }

      unobserve() {}
      disconnect() {
        this.disconnected = true;
      }
    }
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  scrollIntoView.mockReset();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  mockUseApiCache.mockReset();
  mockUseApiCache.mockReturnValue({ data: [2569], isLoading: false });
  mockUseDashboardData.mockReset();
  mockUseDashboardData.mockReturnValue(overviewData());
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
  const location = useLocation();
  return (
    <output data-testid="location" data-pathname={location.pathname}>
      {location.search}
    </output>
  );
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

it('renders the approved module order and keeps expansion on one route', () => {
  const { container } = renderDashboard('/interactive-dashboard');

  expect(screen.getByRole('navigation', { name: 'หมวดข้อมูล' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'พื้นที่' })).toHaveAttribute(
    'href',
    '#land'
  );
  expect(
    [...container.querySelectorAll('.module-section')].map(
      (section) => section.id
    )
  ).toEqual([
    'overview',
    'land',
    'production',
    'groups',
    'networks',
    'risk',
    'extras',
  ]);

  fireEvent.click(container.querySelector('#groups summary'));
  expect(screen.getByTestId('location')).toHaveAttribute(
    'data-pathname',
    '/interactive-dashboard'
  );
});

it('filters map markers and scrolls metric cards instead of routing', async () => {
  renderDashboard(`/interactive-dashboard?district=${BANG_LEN}`);

  expect(await screen.findByTestId('landing-map')).toHaveTextContent(BANG_LEN);
  expect(screen.getByTestId('landing-map')).not.toHaveTextContent('สามพราน');

  fireEvent.click(screen.getByText('พื้นที่เพาะปลูก').closest('button'));
  expect(scrollIntoView).toHaveBeenCalledWith({
    behavior: 'smooth',
    block: 'start',
  });
  expect(screen.getByTestId('location')).toHaveAttribute(
    'data-pathname',
    '/interactive-dashboard'
  );
});

it('keeps the intersecting module set across callbacks and cleans it up', async () => {
  const { unmount } = renderDashboard('/interactive-dashboard');
  const navObserver = await waitFor(() => {
    const observer = intersectionObservers.find(
      (candidate) => candidate.targets.length === 7
    );
    expect(observer).toBeDefined();
    return observer;
  });

  const overview = document.getElementById('overview');
  const risk = document.getElementById('risk');
  const networks = document.getElementById('networks');
  overview.getBoundingClientRect = () => ({ top: 20 });
  risk.getBoundingClientRect = () => ({ top: 90 });
  networks.getBoundingClientRect = () => ({ top: 8 });

  act(() =>
    navObserver.callback([
      {
        isIntersecting: true,
        target: overview,
      },
      {
        isIntersecting: true,
        target: risk,
      },
    ])
  );
  expect(screen.getByRole('link', { name: 'ภาพรวม' })).toHaveAttribute(
    'aria-current',
    'location'
  );

  act(() =>
    navObserver.callback([{ isIntersecting: false, target: overview }])
  );
  expect(screen.getByRole('link', { name: 'ความเสี่ยง' })).toHaveAttribute(
    'aria-current',
    'location'
  );

  act(() =>
    navObserver.callback([
      { isIntersecting: true, target: networks },
      { isIntersecting: false, target: risk },
    ])
  );
  expect(screen.getByRole('link', { name: 'ศูนย์/เครือข่าย' })).toHaveAttribute(
    'aria-current',
    'location'
  );

  unmount();
  expect(navObserver.disconnected).toBe(true);
});

it('keeps the page shell and lazy sections usable when overview fails', async () => {
  const refetch = vi.fn();
  mockUseDashboardData.mockReturnValue({
    ...overviewData(),
    error: new Error('offline'),
    stats: [],
    refetch,
  });

  const { container } = renderDashboard('/interactive-dashboard');

  expect(screen.getByRole('navigation', { name: 'หมวดข้อมูล' })).toBeVisible();
  expect(container.querySelectorAll('.module-section')).toHaveLength(7);
  expect(screen.getByText('ไม่สามารถโหลดข้อมูลได้')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /โหลดข้อมูลใหม่/ }));
  expect(refetch).toHaveBeenCalledOnce();

  await activateModule('networks');
  expect(screen.getAllByText('ไม่พร้อมใช้งาน').length).toBeGreaterThan(0);
});

it('keeps navigation and module shells visible while overview loads', () => {
  mockUseDashboardData.mockReturnValue({
    ...overviewData(),
    loading: true,
    stats: [],
  });

  const { container } = renderDashboard('/interactive-dashboard');

  expect(screen.getByRole('navigation', { name: 'หมวดข้อมูล' })).toBeVisible();
  expect(container.querySelectorAll('.module-section')).toHaveLength(7);
  expect(
    screen.getByText('กำลังโหลดข้อมูล Interactive Dashboard...')
  ).toBeVisible();
});

it('does not mount duplicated detailed overview blocks before lazy modules', async () => {
  renderDashboard('/interactive-dashboard');

  expect(
    screen.queryByText('🍚 ผลผลิตข้าว — นาปี vs นาปรัง รายอำเภอ')
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('🌾 แปลงใหญ่ — ประเภทสินค้า')
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('👥 สถาบันเกษตรกร — ประเภทกลุ่ม')
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('🗂️ ภาพรวมข้อมูลในระบบ — Treemap ตามกลุ่มงาน')
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('🌾 ภาพรวมสัดส่วนแต่ละกลุ่มสินค้าแปลงใหญ่')
  ).not.toBeInTheDocument();

  fireEvent.click(document.querySelector('#production summary'));
  await activateModule('production');
  expect(
    screen.getByText('🌾 ภาพรวมสัดส่วนแต่ละกลุ่มสินค้าแปลงใหญ่')
  ).toBeVisible();
});

it('labels the latest-only overview while retaining the selected year for print', () => {
  const { container } = renderDashboard(
    '/interactive-dashboard?district=บางเลน&year=2569'
  );

  expect(container.querySelector('#overview summary')).toHaveTextContent(
    'ข้อมูลล่าสุด'
  );
  expect(container.querySelector('#overview summary')).not.toHaveTextContent(
    'ปี 2569'
  );
  expect(container.querySelector('.dashboard-print-meta')).toHaveTextContent(
    'ปี 2569'
  );
});

it('propagates filters to lazy modules without embedded detail-route actions', async () => {
  mockUseApiCache.mockImplementation((key) => {
    if (key === 'interactive-dashboard-years') {
      return { data: [2569], isLoading: false };
    }
    if (key === 'strategy-dashboard-data-v3') {
      return {
        data: {
          agriData: [{ district: BANG_LEN, rice_in_season_rai: 5 }],
          learningData: [{ district: BANG_LEN, featured_product: 'ข้าว' }],
          registryData: [
            {
              district: BANG_LEN,
              data_year: 2569,
              target: 8,
              total_updated_households: 4,
            },
          ],
          weatherData: [],
          geoplotsData: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return {
      data: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  renderDashboard(`/interactive-dashboard?district=${BANG_LEN}&year=2569`);
  await activateModule('land');
  await activateModule('groups');

  const summary = within(screen.getByLabelText('สัญญาณภาพรวมกลุ่มยุทธศาสตร์'));
  expect(summary.getByText('ทะเบียนคืบหน้า').parentElement).toHaveTextContent(
    '4 / 8 ครัวเรือน'
  );
  expect(
    screen.queryByRole('link', { name: 'เปิดหน้าราคาสินค้าเกษตรและพลังงาน' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'เปิดหน้าSF / YSF' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'เปิดหน้ากลุ่มเกษตรกร' })
  ).not.toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveAttribute(
    'data-pathname',
    '/interactive-dashboard'
  );
});

it('opens real agricultural price content inline without leaving the page', async () => {
  mockUseApiCache.mockImplementation((key) => {
    if (key === 'strategy-dashboard-data-v3') {
      return {
        data: {
          agriData: [],
          learningData: [],
          registryData: [],
          weatherData: [],
          geoplotsData: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (Array.isArray(key) && key[0] === 'moc-agri-prices') {
      return {
        data: {
          category: 'ผลไม้',
          items: [
            {
              id: 1,
              product_name: 'ส้มโอขาวน้ำผึ้ง',
              price_range: '45 - 55',
              unit: 'บาท/กก.',
            },
          ],
        },
        isLoading: false,
        error: null,
      };
    }
    if (Array.isArray(key) && key[0] === 'bangchak-oil-prices-api-v2') {
      return {
        data: { items: [{ name: 'ไฮดีเซล S', today: '32.94' }] },
        isLoading: false,
        error: null,
      };
    }
    return { data: [2569], isLoading: false };
  });

  renderDashboard('/interactive-dashboard');
  fireEvent.click(document.querySelector('#land summary'));
  await activateModule('land');
  fireEvent.click(screen.getByText('ดูรายละเอียดราคาภายในหน้านี้'));

  expect(await screen.findByText('ส้มโอขาวน้ำผึ้ง')).toBeVisible();
  expect(screen.getByText('32.94')).toBeVisible();
  expect(screen.getByTestId('location')).toHaveAttribute(
    'data-pathname',
    '/interactive-dashboard'
  );
});

it('loads a district-filtered plant-doctor summary only with networks', async () => {
  mockUseApiCache.mockImplementation((key, _fetcher, options) => {
    if (key === 'interactive-dashboard-years') {
      return { data: [2569], isLoading: false };
    }
    if (key === 'protection-dashboard-data') {
      expect(options).toMatchObject({ enabled: true });
      return {
        data: {
          pestOutbreaks: [],
          pestCenters: [],
          plantDoctors: [
            { district: BANG_LEN, subdistrict: 'บางปลา' },
            { district: BANG_LEN, subdistrict: 'บางภาษี' },
            { district: 'สามพราน', subdistrict: 'ไร่ขิง' },
          ],
          soilFertilizer: [],
          fireHotspots: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return { data: {}, isLoading: false, error: null, refetch: vi.fn() };
  });

  renderDashboard(`/interactive-dashboard?district=${BANG_LEN}`);
  expect(
    mockUseApiCache.mock.calls.some(
      ([key]) => key === 'protection-dashboard-data'
    )
  ).toBe(false);

  await activateModule('networks');
  const doctorSummary = screen.getByLabelText('สรุปหมอพืชชุมชน');
  expect(doctorSummary).toHaveTextContent('2 ราย');
  expect(doctorSummary).toHaveTextContent('2 ตำบล');
});

it('selects only public forecast fields for the overview warning', async () => {
  let forecastColumns;
  mockFrom.mockImplementation((table) => ({
    select: (columns) => {
      if (table === 'ai_disease_forecasts') forecastColumns = columns;
      const result = { data: [], error: null };
      const query = {
        order: () => query,
        limit: () => query,
        then: (resolve, reject) =>
          Promise.resolve(result).then(resolve, reject),
      };
      return query;
    },
  }));

  renderDashboard('/interactive-dashboard');

  await waitFor(() => expect(forecastColumns).toBe('forecast_date,details'));
});

it('shows overview AI forecast failures as unavailable instead of zero', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockFrom.mockImplementation((table) => ({
    select: () => {
      const result =
        table === 'ai_disease_forecasts'
          ? { data: null, error: new Error('offline') }
          : { data: [], error: null };
      const query = {
        order: () => query,
        limit: () => query,
        then: (resolve, reject) =>
          Promise.resolve(result).then(resolve, reject),
      };
      return query;
    },
  }));

  renderDashboard('/interactive-dashboard');

  const card = screen
    .getByText('เฝ้าระวังโรค/แมลง (AI)', { selector: '.metric-title' })
    .closest('button');
  await waitFor(() => expect(errorSpy).toHaveBeenCalled());
  await waitFor(() =>
    expect(within(card).getByText('ไม่พร้อมใช้งาน')).toBeVisible()
  );
});

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
  fireEvent.click(await screen.findByRole('option', { name: LATEST_LABEL }));
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
  expect(result.current.yearSupported).toEqual({
    large_plots: true,
    certifications: false,
    crop_production: true,
  });
});

it('uses each production dataset maximum year for the latest filter', async () => {
  const rowsByTable = {
    large_plots: [
      { commodity_group: 'ข้าว', district: BANG_LEN, year: 2568 },
      { commodity_group: 'ผัก/สมุนไพร', district: BANG_LEN, year: 2567 },
      { commodity_group: 'ไม้ผล', district: 'สามพราน', year: 2569 },
    ],
    certifications: [
      { crop_name: 'ส้มโอ', plot_district: BANG_LEN, area_rai: 3 },
      { crop_name: 'ฝรั่ง', plot_district: 'สามพราน', area_rai: 5 },
    ],
    crop_production: [
      { crop_name: 'ข้าว', district: BANG_LEN, year: 2569 },
      { crop_name: 'อ้อย', district: BANG_LEN, year: 2568 },
      { crop_name: 'ทุเรียน', district: 'สามพราน', year: 2570 },
    ],
  };
  let fetchProductionData;
  mockFrom.mockImplementation((table) => ({
    select: () => Promise.resolve({ data: rowsByTable[table], error: null }),
  }));
  mockUseApiCache.mockImplementation((_key, fetcher) => {
    fetchProductionData = fetcher;
    return {
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    };
  });
  const { result, rerender } = renderHook(() =>
    useProductionData({ district: BANG_LEN, year: LATEST_YEAR })
  );

  const data = await fetchProductionData();
  mockUseApiCache.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  rerender();

  expect(result.current.lpStats.total).toBe(0);
  expect(result.current.cropStats.total).toBe(0);
  expect(result.current.certStats).toMatchObject({ total: 1, area: 3 });

  const allDistricts = renderHook(() =>
    useProductionData({ district: ALL_DISTRICTS, year: LATEST_YEAR })
  );
  expect(allDistricts.result.current.lpStats).toMatchObject({
    total: 1,
    fruit: 1,
  });
  expect(allDistricts.result.current.cropStats).toMatchObject({
    total: 1,
    topCrops: [['ทุเรียน', 1]],
  });
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
  expect(result.current.yearSupported).toEqual({
    community_enterprises: false,
    smart_farmer_sf: true,
    young_smart_farmer_ysf: true,
    agricultural_career_groups: true,
    housewife_farmer_groups: true,
    young_farmer_groups_detailed: true,
    farmer_institutes: false,
    agri_tourism: false,
    disasters: true,
  });
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
  expect(result.current.yearSupported).toEqual({
    forecast_plots: false,
    pest_centers: false,
    plant_doctors: false,
    soil_fertilizer_centers: false,
    fire_hotspots: false,
  });
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
          year: 2568,
          target_plots: 4,
          drawn_plots: 2,
          snapshot_date: '2026-07-24',
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
  expect(summary.getByText('วาดแปลง').parentElement).toHaveTextContent(
    'ข้อมูลล่าสุด'
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

it('selects only public learning-center fields for the strategy module', async () => {
  const selectedColumns = {};
  let fetchStrategyData;
  mockFrom.mockImplementation((table) => ({
    select: (columns) => {
      selectedColumns[table] = columns;
      const result = { data: [], error: null };
      const query = {
        order: () => query,
        limit: () => query,
        then: (resolve, reject) =>
          Promise.resolve(result).then(resolve, reject),
      };
      return query;
    },
  }));
  mockUseApiCache.mockImplementation((_key, fetcher) => {
    fetchStrategyData = fetcher;
    return {
      data: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  renderGroup(StrategyDashboard, { embedded: true });
  await fetchStrategyData();

  expect(selectedColumns.learning_centers).toBe('district, featured_product');
  expect(selectedColumns.learning_centers).not.toMatch(
    /chairman_name|phone|custom_fields/
  );
  expect(selectedColumns.farmer_registry).toBe(
    'district,data_year,target,total_updated_households,total_updated_area_rai,cutoff_date'
  );
});

it('selects only public protection fields used by network summaries', async () => {
  const selectedColumns = {};
  let fetchProtectionData;
  mockFrom.mockImplementation((table) => ({
    select: (columns) => {
      selectedColumns[table] = columns;
      return Promise.resolve({ data: [], error: null });
    },
  }));
  mockUseApiCache.mockImplementation((_key, fetcher) => {
    fetchProtectionData = fetcher;
    return {
      data: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  renderHook(() => useProtectionData());
  await fetchProtectionData();

  expect(selectedColumns).toMatchObject({
    forecast_plots: 'crop_type, district, plot_type',
    pest_centers: 'main_crop_type, district, grade_level',
    plant_doctors: 'district, subdistrict',
    soil_fertilizer_centers: 'main_crop_type, district, grade_level',
    fire_hotspots: 'district, subdistrict',
  });
  Object.values(selectedColumns).forEach((columns) =>
    expect(columns).not.toContain('*')
  );
});

it('labels every undated production certification view for a specific year', () => {
  mockUseApiCache.mockReturnValue({
    data: {},
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  renderGroup(ProductionDashboard, {
    embedded: true,
    filters: { district: BANG_LEN, year: '2569' },
  });

  [
    '✅ การรับรองมาตรฐาน (GAP) · ข้อมูลล่าสุด',
    '✅ จำนวนรายการรับรอง GAP แยกตามชนิดพืช (Top 10) · ข้อมูลล่าสุด',
    '✅ จำนวนรายการรับรองแยกตามอำเภอ (Top 10 พืชมาตรฐาน GAP) · ข้อมูลล่าสุด',
    '✅ ปริมาณผลผลิตรวม GAP (กิโลกรัม) - 10 อันดับแรก · ข้อมูลล่าสุด',
    '✅ แนวโน้มใบรับรอง GAP หมดอายุ (แบ่งตามปี) · ข้อมูลล่าสุด',
  ].forEach((label) => expect(screen.getByText(label)).toBeVisible());
});

it('labels every undated development card and chart for a specific year', () => {
  mockUseApiCache.mockReturnValue({
    data: {},
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  renderGroup(DevelopmentDashboard, {
    embedded: true,
    filters: { district: BANG_LEN, year: '2569' },
  });

  expect(screen.getByText('วิสาหกิจชุมชน · ข้อมูลล่าสุด')).toBeVisible();
  [
    '🤝 วิสาหกิจชุมชน · ข้อมูลล่าสุด',
    'ท่องเที่ยวเกษตร · ข้อมูลล่าสุด',
    '👥 สถาบันเกษตรกร · ข้อมูลล่าสุด',
    '🗺️ ท่องเที่ยวและภัยพิบัติ (ท่องเที่ยว: ข้อมูลล่าสุด)',
    'ภาพรวมประเภทข้อมูลในกลุ่มพัฒนา (วิสาหกิจ/ท่องเที่ยว: ข้อมูลล่าสุด)',
    'ข้อมูลกลุ่มและเหตุการณ์แยกตามอำเภอ (วิสาหกิจ/ท่องเที่ยว: ข้อมูลล่าสุด)',
    'สัดส่วนประเภทกลุ่มสถาบันเกษตรกร · ข้อมูลล่าสุด',
    'แหล่งท่องเที่ยวเกษตรแยกตามอำเภอ · ข้อมูลล่าสุด',
  ].forEach((label) => expect(screen.getByText(label)).toBeVisible());
});

it('labels every parcel-progress view as latest for a specific year', () => {
  mockUseApiCache.mockReturnValue({
    data: {},
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  renderGroup(StrategyDashboard, {
    embedded: true,
    filters: { district: BANG_LEN, year: '2569' },
  });

  expect(
    screen.getByText('🗺️ การวาดผังแปลงเกษตรกรรมดิจิทัล · ข้อมูลล่าสุด')
  ).toBeVisible();
  expect(
    screen.getByText(
      '🗺️ การวาดผังแปลงเกษตรกรรมดิจิทัล: เป้าหมายเทียบวาดแล้วรายอำเภอ · ข้อมูลล่าสุด'
    )
  ).toBeVisible();
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

it.each([
  [StrategyDashboard, 'เปิดหน้าราคาสินค้าเกษตรและพลังงาน'],
  [DevelopmentDashboard, 'เปิดหน้าSF / YSF'],
])('%s keeps standalone detail actions', (Component, actionName) => {
  mockUseApiCache.mockReturnValue({
    data: {},
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  renderGroup(Component);

  expect(screen.getByRole('link', { name: actionName })).toBeVisible();
});

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

it('offers retry when the network plant-doctor summary fails', () => {
  const refetch = vi.fn();
  mockUseApiCache.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error('offline'),
    refetch,
  });

  renderGroup(ProtectionNetworkSummary, { enabled: true });

  fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
  expect(refetch).toHaveBeenCalledOnce();
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

it('summarizes the newest filtered public extras without inventing zeroes', () => {
  const summary = summarizeExtras(
    {
      tbk: [
        {
          data_year: 2569,
          snapshot_date: '2026-07-23',
          location_name: BANG_LEN,
          household_count: 1,
          plot_count: 2,
          area_rai: 3,
        },
        {
          data_year: 2569,
          snapshot_date: '2026-07-24',
          location_name: BANG_LEN,
          household_count: 4,
          plot_count: 5,
          area_rai: 6,
        },
        {
          data_year: 2569,
          snapshot_date: '2026-07-24',
          location_name: 'สามพราน',
          household_count: 40,
          plot_count: 50,
          area_rai: 60,
        },
      ],
      rice: [
        {
          snapshot_date: '2026-07-23',
          crop_year: '2568/69',
          district: BANG_LEN,
          household_count: 1,
          plot_count: 1,
          area_rai: 1,
          estimated_tons: 1,
        },
        {
          snapshot_date: '2026-07-24',
          crop_year: '2568/69',
          district: BANG_LEN,
          household_count: 2,
          plot_count: 3,
          area_rai: 4,
          estimated_tons: 5,
        },
        {
          snapshot_date: '2026-07-24',
          crop_year: '2568/69',
          district: BANG_LEN,
          household_count: 6,
          plot_count: 7,
          area_rai: 8,
          estimated_tons: 9,
        },
        {
          snapshot_date: '2026-07-24',
          crop_year: '2568/69',
          district: 'สามพราน',
          household_count: 60,
          plot_count: 70,
          area_rai: 80,
          estimated_tons: 90,
        },
      ],
      costs: [
        {
          data_year: 2569,
          crop_name: 'ข้าว',
          total_cost_baht: 100,
          revenue_baht_per_rai: 150,
        },
        {
          data_year: 2569,
          crop_name: 'ฝรั่ง',
          total_cost_baht: 300,
          revenue_baht_per_rai: 450,
        },
        {
          data_year: 2568,
          crop_name: 'อ้อย',
          total_cost_baht: 999,
          revenue_baht_per_rai: 999,
        },
      ],
      forecast: {
        forecast_date: '2026-07-24',
        details: [
          { risk_level: 'สูง' },
          { risk_level: 'ต่ำ' },
          { risk_level: 'ต่ำ' },
        ],
      },
      soils: [
        {
          district: BANG_LEN,
          soil_series_name: 'ชุดดินบางเลน',
          soil_group: 'กลุ่ม 1',
          area_rai: 5,
        },
        {
          district: BANG_LEN,
          soil_series_name: 'ชุดดินบางเลน',
          soil_group: 'กลุ่ม 1',
          area_rai: 7,
        },
        {
          district: 'สามพราน',
          soil_series_name: 'ชุดดินสามพราน',
          soil_group: 'กลุ่ม 2',
          area_rai: 100,
        },
      ],
    },
    { district: BANG_LEN, year: '2569' }
  );

  expect(summary).toMatchObject({
    tbk: {
      dataYear: 2569,
      snapshotDate: '2026-07-24',
      householdCount: 4,
      plotCount: 5,
      areaRai: 6,
    },
    rice: {
      cropYear: '2568/69',
      snapshotDate: '2026-07-24',
      householdCount: 8,
      plotCount: 10,
      areaRai: 12,
      estimatedTons: 14,
    },
    costs: {
      dataYear: 2569,
      cropCount: 2,
      averageCostBaht: 200,
      averageRevenueBahtPerRai: 300,
    },
    forecast: {
      forecastDate: '2026-07-24',
      total: 3,
      high: 1,
      medium: 0,
      low: 2,
      status: LATEST_LABEL,
    },
    soils: {
      seriesCount: 1,
      groupCount: 1,
      areaRai: 12,
      status: LATEST_LABEL,
    },
  });
  expect(
    summarizeExtras(
      { tbk: [], rice: [], costs: [], forecast: null, soils: [] },
      { district: BANG_LEN, year: '2569' }
    )
  ).toEqual({
    tbk: null,
    rice: null,
    costs: null,
    forecast: null,
    soils: null,
  });
});

it('keeps missing extra metrics null when their records exist', () => {
  const summary = summarizeExtras(
    {
      tbk: [
        {
          data_year: 2569,
          snapshot_date: '2026-07-24',
          location_name: BANG_LEN,
          household_count: null,
          plot_count: null,
          area_rai: null,
        },
      ],
      rice: [
        {
          snapshot_date: '2026-07-24',
          crop_year: '2568/69',
          district: BANG_LEN,
          household_count: null,
          plot_count: null,
          area_rai: null,
          estimated_tons: null,
        },
      ],
      costs: [
        {
          data_year: 2569,
          crop_name: 'ข้าว',
          total_cost_baht: null,
          revenue_baht_per_rai: null,
        },
      ],
      forecast: null,
      soils: [
        {
          district: BANG_LEN,
          soil_series_name: null,
          soil_group: null,
          area_rai: null,
        },
      ],
    },
    { district: BANG_LEN, year: '2569' }
  );

  expect(summary.tbk).toMatchObject({
    householdCount: null,
    plotCount: null,
    areaRai: null,
  });
  expect(summary.rice).toMatchObject({
    householdCount: null,
    plotCount: null,
    areaRai: null,
    estimatedTons: null,
  });
  expect(summary.costs).toMatchObject({
    cropCount: 1,
    averageCostBaht: null,
    averageRevenueBahtPerRai: null,
  });
  expect(summary.soils).toMatchObject({
    seriesCount: null,
    groupCount: null,
    areaRai: null,
  });
  const missingYears = summarizeExtras(
    {
      tbk: [
        {
          data_year: null,
          snapshot_date: '2026-07-24',
          location_name: BANG_LEN,
          area_rai: 1,
        },
      ],
      rice: [
        {
          crop_year: null,
          snapshot_date: '2026-07-24',
          district: BANG_LEN,
          area_rai: 1,
        },
      ],
      costs: [],
      forecast: null,
      soils: [],
    },
    { district: BANG_LEN, year: LATEST_YEAR }
  );
  expect(missingYears.tbk).toBeNull();
  expect(missingYears.rice).toBeNull();
});

it('treats an AI forecast with no details as unavailable', () => {
  const summary = summarizeExtras(
    {
      tbk: [],
      rice: [],
      costs: [],
      forecast: { forecast_date: '2026-07-24', details: [] },
      soils: [],
    },
    { district: BANG_LEN, year: '2569' }
  );

  expect(summary.forecast).toBeNull();
});

it.each(['2568', '2569'])(
  'matches rice crop-year 2568/69 when selected year is %s',
  (year) => {
    const summary = summarizeExtras(
      {
        tbk: [],
        rice: [
          {
            snapshot_date: '2026-07-24',
            crop_year: '2568/69',
            district: BANG_LEN,
            area_rai: 1,
          },
        ],
        costs: [],
        forecast: null,
        soils: [],
      },
      { district: BANG_LEN, year }
    );

    expect(summary.rice).toMatchObject({
      cropYear: '2568/69',
      areaRai: 1,
    });
  }
);

it('keeps extras lazy and public-only while retaining keyed failures', async () => {
  const columnsByTable = {};
  const results = {
    tbk_cultivation_snapshots: {
      data: [
        {
          data_year: 2569,
          snapshot_date: '2026-07-24',
          location_name: BANG_LEN,
          household_count: 1,
          plot_count: 2,
          area_rai: 3,
        },
      ],
      error: null,
    },
    rice_harvest_snapshots: {
      data: [],
      error: null,
    },
    production_costs: {
      data: null,
      error: new Error('costs unavailable'),
    },
    ai_disease_forecasts: {
      data: null,
      error: new Error('forecast unavailable'),
    },
    soil_series: {
      data: [
        {
          district: BANG_LEN,
          soil_series_name: 'ชุดดินบางเลน',
          soil_group: 'กลุ่ม 1',
          area_rai: 8,
        },
      ],
      error: null,
    },
  };
  let fetchExtras;
  let cacheOptions;
  let cacheResult = {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  mockFrom.mockImplementation((table) => {
    const query = {
      select: (columns) => {
        columnsByTable[table] = columns;
        return query;
      },
      order: () => query,
      limit: () => query,
      then: (resolve, reject) =>
        Promise.resolve(results[table]).then(resolve, reject),
    };
    return query;
  });
  mockUseApiCache.mockImplementation((_key, fetcher, options) => {
    fetchExtras = fetcher;
    cacheOptions = options;
    return cacheResult;
  });

  const { result, rerender } = renderHook(() =>
    useInteractiveExtrasData(
      { district: BANG_LEN, year: '2569' },
      { enabled: false }
    )
  );

  expect(cacheOptions).toEqual({ enabled: false });
  expect(mockFrom).not.toHaveBeenCalled();

  cacheResult = {
    data: await fetchExtras(),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  rerender();

  expect(columnsByTable).toEqual({
    tbk_cultivation_snapshots:
      'data_year,snapshot_date,location_name,area_rai,household_count,plot_count',
    rice_harvest_snapshots:
      'snapshot_date,crop_year,district,household_count,plot_count,area_rai,estimated_tons',
    production_costs:
      'data_year,crop_name,total_cost_baht,revenue_baht_per_rai',
    ai_disease_forecasts: 'forecast_date,details',
    soil_series: 'district,soil_series_name,soil_group,area_rai',
  });
  Object.values(columnsByTable).forEach((columns) => {
    expect(columns).not.toContain('*');
    expect(columns).not.toMatch(
      /admin|personnel|budget|phone|email|created_by|updated_by/
    );
  });
  expect(result.current.tbk).toMatchObject({ areaRai: 3 });
  expect(result.current.rice).toBeNull();
  expect(result.current.costs).toBeNull();
  expect(result.current.forecast).toBeNull();
  expect(result.current.soils).toMatchObject({ areaRai: 8 });
  expect(result.current.errors).toMatchObject({
    costs: expect.objectContaining({ message: 'costs unavailable' }),
    forecast: expect.objectContaining({ message: 'forecast unavailable' }),
  });
  expect(result.current.errors.rice).toBeUndefined();
  expect(result.current.error).toHaveProperty('message', 'costs unavailable');
});

it('distinguishes a failed extra card from a successful empty card', () => {
  const refetch = vi.fn();
  mockUseApiCache.mockReturnValue({
    data: {
      tbk: {
        dataYear: 2569,
        snapshotDate: '2026-07-24',
        householdCount: 4,
        plotCount: 5,
        areaRai: 6,
      },
      rice: {
        cropYear: '2568/69',
        snapshotDate: '2026-07-24',
        householdCount: 8,
        plotCount: 10,
        areaRai: 12,
        estimatedTons: 14,
      },
      costs: null,
      forecast: null,
      soils: {
        seriesCount: 1,
        groupCount: 1,
        areaRai: 12,
        status: LATEST_LABEL,
      },
      errors: { costs: new Error('costs unavailable') },
      error: new Error('costs unavailable'),
    },
    isLoading: false,
    error: null,
    refetch,
  });

  render(
    <ExtrasSection filters={{ district: BANG_LEN, year: '2569' }} enabled />
  );

  [
    'พื้นที่ตาม ทบก.',
    'สถานการณ์เก็บเกี่ยวข้าว',
    'ต้นทุนการผลิต',
    'โรคและแมลง AI',
    'ชุดดิน',
  ].forEach((name) =>
    expect(screen.getByRole('heading', { level: 3, name })).toBeVisible()
  );
  expect(screen.getByText('ปี 2569 · รอบ 2026-07-24')).toBeVisible();
  expect(screen.getByText('ปีเพาะปลูก 2568/69 · รอบ 2026-07-24')).toBeVisible();
  const costsCard = screen
    .getByRole('heading', { level: 3, name: 'ต้นทุนการผลิต' })
    .closest('.ant-card, .bento-card');
  const forecastCard = screen
    .getByRole('heading', { level: 3, name: 'โรคและแมลง AI' })
    .closest('.ant-card, .bento-card');
  expect(within(costsCard).getByText('โหลดไม่สำเร็จ')).toBeVisible();
  expect(within(forecastCard).getByText('ไม่พร้อมใช้งาน')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
  expect(refetch).toHaveBeenCalledOnce();
});
