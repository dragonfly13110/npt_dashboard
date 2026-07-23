import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RiceHarvestSituation from '../pages/production/RiceHarvestSituation';

const rows = [
  {
    snapshot_date: '2026-07-23',
    scraped_at: '2026-07-23T01:00:00Z',
    source_cutoff_date: '2026-07-23',
    crop_year: '2569/70',
    district_code: '2-730100',
    district: 'district 1',
    harvest_month: 2,
    household_count: 1,
    plot_count: 1,
    area_rai: 10,
    estimated_tons: 8,
  },
  ...Array.from({ length: 7 }, (_, index) => ({
    snapshot_date: '2026-07-23',
    scraped_at: '2026-07-23T01:00:00Z',
    source_cutoff_date: '2026-07-23',
    crop_year: '2569/70',
    district_code: `2-730${index + 1}00`,
    district: `district ${index + 1}`,
    harvest_month: 11,
    household_count: 1,
    plot_count: 1,
    area_rai: 10,
    estimated_tons: 8,
  })),
  ...Array.from({ length: 7 }, (_, index) => ({
    snapshot_date: '2026-07-16',
    scraped_at: '2026-07-16T01:00:00Z',
    source_cutoff_date: '2026-07-16',
    crop_year: '2569/70',
    district_code: `2-730${index + 1}00`,
    district: `district ${index + 1}`,
    harvest_month: 11,
    household_count: 1,
    plot_count: 1,
    area_rai: 5,
    estimated_tons: 4,
  })),
];

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));
vi.mock('../components/widgets/EChart', () => ({
  default: () => <div data-testid="rice-harvest-chart" />,
}));
vi.mock('../components/widgets/SharedDashboardUI', () => ({
  PageHeader: ({ title }) => <h1>{title}</h1>,
}));

describe('RiceHarvestSituation page', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          })),
        })),
      })),
    });
  });

  it('shows latest monthly estimate, district rows, and previous snapshot delta', async () => {
    render(<RiceHarvestSituation />);

    await waitFor(() =>
      expect(
        screen.getByText(
          /\u0e02\u0e49\u0e32\u0e27\u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e23\u0e27\u0e21/
        )
      ).toBeInTheDocument()
    );

    expect(screen.getByText('2569/70')).toBeInTheDocument();
    expect(
      screen.getByText(
        /\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e23\u0e32\u0e22\u0e2d\u0e33\u0e40\u0e20\u0e2d\u0e41\u0e25\u0e30\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27 \(\u0e1b\u0e35 2569\/70\)/
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('district 1')).not.toHaveLength(0);
    expect(
      screen.getByText('\u0e01\u0e23\u0e2d\u0e07\u0e2d\u0e33\u0e40\u0e20\u0e2d')
    ).toBeInTheDocument();
    expect(
      screen.getByText('\u0e01\u0e23\u0e2d\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e08\u0e32\u0e01/
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('rice-harvest-chart')).toBeInTheDocument();

    expect(
      screen
        .getAllByText('district 1')
        .map((cell) => cell.closest('tr').children[1].textContent)
    ).toEqual(['\u0e01.\u0e1e. (70)', '\u0e1e.\u0e22. (69)']);
  });

  it('renders Thai UI copy instead of literal Unicode escape sequences', async () => {
    render(<RiceHarvestSituation />);

    await waitFor(() =>
      expect(screen.getAllByText('district 1')).not.toHaveLength(0)
    );

    expect(screen.queryByText(/\\u0e[0-9a-f]{2}/i)).not.toBeInTheDocument();
  });
});
