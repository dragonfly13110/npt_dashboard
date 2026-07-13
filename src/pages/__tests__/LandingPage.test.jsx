import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

// Mock Supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        neq: () => Promise.resolve({ data: [], error: null }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

// Mock the components inside sections that lazy-load or fetch API
vi.mock('../../hooks/landing/useLandingSummaries', () => ({
  useWeatherSummary: () => ({
    data: {
      value: 31,
      unit: '°C',
      status: 'success',
      statusLabel: 'ร้อนจัด',
      secondaryText: 'ความชื้น 60%',
      sourceLabel: 'Open-Meteo',
    },
    isLoading: false,
    error: null,
  }),
  useAirQualitySummary: () => ({
    data: {
      value: 12,
      unit: 'มคก./ลบ.ม.',
      status: 'success',
      statusLabel: 'ดีมาก',
      secondaryText: 'AQI: 20',
      sourceLabel: 'Open-Meteo',
    },
    isLoading: false,
    error: null,
  }),
  useHotspotSummary: () => ({
    data: {
      value: 1,
      unit: 'จุด',
      status: 'normal',
      statusLabel: 'พบจุดความร้อน 1 จุด',
      secondaryText: 'VIIRS',
      sourceLabel: 'GISTDA',
    },
    isLoading: false,
    error: null,
  }),
  useDiseaseForecastSummary: () => ({
    data: {
      value: 'เพลี้ยกระโดดสีน้ำตาล',
      unit: '',
      status: 'warning',
      statusLabel: 'เฝ้าระวัง',
      secondaryText: 'พืชเสี่ยง: ข้าว',
      sourceLabel: 'กรมส่งเสริมการเกษตร (AI)',
    },
    isLoading: false,
    error: null,
  }),
  useSoilMoistureSummary: () => ({
    data: {
      value: 24,
      unit: '%',
      status: 'normal',
      statusLabel: 'ปานกลาง',
      secondaryText: 'แบบจำลอง',
      sourceLabel: 'Open-Meteo',
    },
    isLoading: false,
    error: null,
  }),
  useReservoirSummary: () => ({
    data: {
      value: 65,
      unit: '%',
      status: 'normal',
      statusLabel: 'น้ำปานกลาง',
      secondaryText: 'ศรีนครินทร์',
      sourceLabel: 'กรมชลประทาน',
    },
    isLoading: false,
    error: null,
  }),
  useAgriPriceSummary: () => ({
    data: {
      value: '14,500',
      unit: 'บาท/ตัน',
      status: 'normal',
      statusLabel: 'ข้าวหอมมะลิ',
      secondaryText: 'ราคาแนะนำ',
      sourceLabel: 'กระทรวงพาณิชย์',
    },
    isLoading: false,
    error: null,
  }),
  useOilPriceSummary: () => ({
    data: {
      value: '31.94',
      unit: 'บาท/ลิตร',
      status: 'normal',
      statusLabel: 'ดีเซล B7',
      secondaryText: 'บางจาก',
      sourceLabel: 'บางจาก',
    },
    isLoading: false,
    error: null,
  }),
  useProvinceOverviewSummary: () => ({
    data: {
      agriArea: { value: 850000, unit: 'ไร่' },
      farmerHouseholds: { value: 72000, unit: 'ราย' },
      largePlots: { value: 45, unit: 'กลุ่ม' },
      communityEnterprises: { value: 120, unit: 'แห่ง' },
      farmerInstitutes: { value: 85, unit: 'แห่ง' },
      agriTourism: { value: 12, unit: 'แห่ง' },
    },
    isLoading: false,
    error: null,
  }),
}));

// Mock Lazy Loaded Widgets to keep tests light
vi.mock('../../components/widgets/WeatherWidget', () => ({
  default: () => <div>WeatherWidget</div>,
}));
vi.mock('../../components/widgets/AirQualityWidget', () => ({
  default: () => <div>AirQualityWidget</div>,
}));
vi.mock('../../components/widgets/AgriPricesWidget', () => ({
  default: () => <div>AgriPricesWidget</div>,
}));
vi.mock('../../components/widgets/HotspotWidget', () => ({
  default: () => <div>HotspotWidget</div>,
}));

describe('LandingPage Integration & Accessibility Tests', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.resetAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders landing page sections properly', () => {
    renderComponent();
    expect(
      screen.getByRole('heading', { name: /สถานการณ์วันนี้/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /ภาพรวมการเกษตรจังหวัดนครปฐม/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /ดิน น้ำ ตลาด/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /เครื่องมือและฐานข้อมูล/ })
    ).toBeInTheDocument();
  });

  it('renders KPI card values and units correctly', () => {
    renderComponent();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('°C')).toBeInTheDocument();
    expect(screen.getByText('ร้อนจัด')).toBeInTheDocument();
  });

  it('opens detail modal on KPI card click', async () => {
    renderComponent();

    const weatherCard = screen.getByRole('button', { name: /สภาพอากาศ/i });
    fireEvent.click(weatherCard);

    // Should render detail host modal with the title
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('รายละเอียดสภาพอากาศ')).toBeInTheDocument();
    });
  });

  it('restores focus back to triggering card on close', async () => {
    renderComponent();

    const weatherCard = screen.getByRole('button', { name: /สภาพอากาศ/i });
    weatherCard.focus();
    expect(document.activeElement).toBe(weatherCard);

    fireEvent.click(weatherCard);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const closeBtn = screen.getByLabelText('ปิดรายละเอียด');
    fireEvent.click(closeBtn);

    // Modal closes and focus is restored
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(weatherCard);
    });
  });
});
