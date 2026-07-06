import { describe, expect, it } from 'vitest';
import { summarizeLocalRows } from '../chatbotAggregationService';

describe('chatbotAggregationService', () => {
  it('summarizes local numeric rows with totals, averages, percentages, and rankings', () => {
    const stats = summarizeLocalRows(
      'production_costs',
      [
        {
          crop_name: 'rice',
          yield_kg_per_rai: 100,
          revenue_baht_per_rai: 1000,
        },
        {
          crop_name: 'rice',
          yield_kg_per_rai: 200,
          revenue_baht_per_rai: 3000,
        },
        {
          crop_name: 'corn',
          yield_kg_per_rai: 400,
          revenue_baht_per_rai: 2000,
        },
      ],
      'crop_name'
    );

    expect(stats.total_rows).toBe(3);
    expect(stats.totals.yield_kg_per_rai).toBe(700);
    expect(stats.averages.revenue_baht_per_rai).toBe(2000);
    expect(stats.by_district.rice.count).toBe(2);
    expect(stats.district_percentages.rice.yield_kg_per_rai).toBe(42.86);
    expect(stats.rankings.yield_kg_per_rai.top).toEqual({
      district: 'corn',
      value: 400,
    });
  });
});
