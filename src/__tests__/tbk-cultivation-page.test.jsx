import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TbkCultivationArea from '../pages/strategy/TbkCultivationArea';

const rows = [
  {
    id: 1,
    snapshot_date: '2026-07-23',
    scraped_at: '2026-07-23T01:00:00Z',
    data_year: 2569,
    group_code: '01',
    group_name: 'ข้าว',
    location_code: '2-73',
    location_name: 'นครปฐม',
    item_breed: 'ข้าวเจ้า (กข41)',
    household_count: 10,
    plot_count: 20,
    area_rai: 100,
    disaster_household_count: 1,
    disaster_plot_count: 1,
    disaster_area_rai: 5,
    remaining_area_rai: 95,
  },
  {
    id: 2,
    snapshot_date: '2026-07-23',
    scraped_at: '2026-07-23T01:00:00Z',
    data_year: 2569,
    group_code: '10',
    group_name: 'ปศุสัตว์',
    location_code: '2-73',
    location_name: 'นครปฐม',
    item_breed: 'ไก่ (ไก่ไข่)',
    household_count: 2,
    plot_count: 2,
    area_rai: 1.5,
    disaster_household_count: 0,
    disaster_plot_count: 0,
    disaster_area_rai: 0,
    remaining_area_rai: 1.5,
  },
];

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { getSession: vi.fn() },
}));

vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: () => false }),
}));
vi.mock('../components/widgets/SharedDashboardUI', () => ({
  PageHeader: ({ title, subtitle }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));
vi.mock('../components/widgets/EChart', () => ({
  default: ({ option }) => (
    <div data-testid="tbk-chart">{option.series[0].data.join(',')}</div>
  ),
}));

function mockQuery(data = rows) {
  const rowQuery = {
    eq: vi.fn(),
    order: vi.fn(),
  };
  rowQuery.eq.mockReturnValueOnce(rowQuery).mockReturnValueOnce(rowQuery);
  rowQuery.order
    .mockReturnValueOnce(rowQuery)
    .mockResolvedValueOnce({ data, error: null });

  mockSupabase.from
    .mockReturnValueOnce({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: data.length
                ? { data_year: 2569, snapshot_date: '2026-07-23' }
                : null,
              error: null,
            }),
          })),
        })),
      })),
    })
    .mockReturnValueOnce({ select: vi.fn(() => rowQuery) });
}

describe('TbkCultivationArea page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReset();
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    mockQuery();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the latest snapshot and filters cards with the table', async () => {
    render(<TbkCultivationArea />);

    await screen.findByText('พื้นที่เพาะปลูกตาม ทบก.');
    expect(screen.getByText('101.50')).toBeInTheDocument();
    expect(screen.getByTestId('tbk-chart')).toHaveTextContent('100,1.5');
    expect(screen.getByText('ข้าวเจ้า (กข41)')).toBeInTheDocument();
    expect(screen.getByText('ไก่ (ไก่ไข่)')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText('กลุ่มข้อมูล'));
    const riceLabels = await screen.findAllByText('ข้าว');
    fireEvent.click(riceLabels.at(-1));

    await waitFor(() =>
      expect(screen.queryByText('ไก่ (ไก่ไข่)')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('tbk-chart')).toHaveTextContent('100');
    expect(screen.getAllByText('100.00')).not.toHaveLength(0);
  });

  it('shows an explicit empty state', async () => {
    mockSupabase.from.mockReset();
    mockQuery([]);
    render(<TbkCultivationArea />);

    expect(
      await screen.findByText('ยังไม่มี snapshot ข้อมูลพื้นที่ตาม ทบก.')
    ).toBeInTheDocument();
  });
});
