import { describe, expect, it } from 'vitest';
import {
  buildBudgetDirectAnswer,
  mergeBudgetSeedRows,
  summarizeBudgetRows,
} from '../chatbotBudgetService';

describe('chatbotBudgetService', () => {
  it('replaces stale rows with the round 2 fiscal year 2569 budget seed when forced', () => {
    const rows = mergeBudgetSeedRows([{ id: 'old-row', fiscal_year: 2568 }], {
      force: true,
    });

    expect(rows).toHaveLength(123);
    expect(rows.every((row) => row._seedFallback)).toBe(true);
    expect(rows.every((row) => row.fiscal_year === 2569)).toBe(true);
  });

  it('summarizes budget seed rows for direct AI answers', () => {
    const rows = mergeBudgetSeedRows([], { force: true });
    const stats = summarizeBudgetRows(rows);
    const answer = buildBudgetDirectAnswer({
      query: '2569',
      results: [
        {
          table: 'budgets',
          seedFallback: true,
          count: rows.length,
          aggregatedStats: stats,
        },
      ],
      forceBudgetSeed: true,
    });

    expect(stats.totals.budget_amount).toBe(767495);
    expect(answer).toContain('767,495');
    expect(answer).toContain('123');
  });
});
