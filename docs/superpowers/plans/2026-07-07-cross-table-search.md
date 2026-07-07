# Cross-Table Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phase 1-3 cross-table search: complete coverage, ranked results, and small smart query parsing.

**Architecture:** Keep current Supabase RPC + React service flow. Improve the existing contract instead of adding a new search engine. Add a tiny JS parser that sends hints to the service and use SQL scoring metadata to improve result order.

**Tech Stack:** React 19, Supabase RPC/Postgres, `pg_trgm`, Vitest, no new dependency.

## Global Constraints

- Scope is phases 1-3 only: coverage, relevance ranking, smart query parsing.
- Out of scope: embeddings, semantic vector search, AI-generated answers.
- Guest search must never select or display private columns.
- No new dependency.
- Use existing `globalSearch()` flow in `src/services/globalSearchService.js`.
- Keep changes small; no new search engine.

---

## File Structure

- `src/utils/chatbotConstants.js`: app-side table search column metadata.
- `src/domain/datasetCatalog.js`: existing helpers for labels/routes/search columns/privacy.
- `src/domain/datasetCatalog.test.js`: contract drift checks.
- `src/services/searchQueryParser.js`: new pure parser for query terms, districts, crops, years, table hints.
- `src/services/__tests__/searchQueryParser.test.js`: parser checks.
- `src/services/globalSearchService.js`: pass parsed hints, preserve privacy, sort by score.
- `src/services/__tests__/globalSearchService.test.js`: service behavior checks.
- `src/pages/SearchResults.jsx`: show ranked matches and snippets.
- `src/components/Search/GlobalSearch.jsx`: honest placeholder copy.
- `supabase/global_search.sql`: RPC coverage, result limit, scoring metadata.
- `supabase/full_text_search_indexes.sql`: trigram indexes for searchable columns.

---

### Task 1: Finish Phase 1 Coverage Fixes

**Files:**

- Modify: `src/utils/chatbotConstants.js`
- Modify: `src/domain/datasetCatalog.test.js`
- Modify: `src/pages/SearchResults.jsx`
- Modify: `src/components/Search/GlobalSearch.jsx`
- Modify: `supabase/global_search.sql`
- Modify: `supabase/full_text_search_indexes.sql`

**Interfaces:**

- Consumes: existing `getSearchColumns(table, role)` from `src/domain/datasetCatalog.js`.
- Produces: aligned app/RPC coverage for `soil_series` and `ai_disease_forecasts`.

- [ ] **Step 1: Keep targeted coverage assertions**

`src/domain/datasetCatalog.test.js` must contain:

```js
import { readFileSync } from 'node:fs';

it('keeps RPC global search aligned with app search metadata', () => {
  const sql = readFileSync('supabase/global_search.sql', 'utf8');

  expect(sql).toContain("'soil_series'::text");
  expect(sql).toContain("'soil_series','fire_hotspots'");
  expect(sql).toContain(
    'safe_limit INTEGER := GREATEST(COALESCE(result_limit, 3), 1);'
  );
});
```

- [ ] **Step 2: Keep minimal implementation**

Required implementation state:

```js
// src/utils/chatbotConstants.js
ai_disease_forecasts: ['name', 'description', 'target_crop', 'risk_level'],
```

```sql
-- supabase/global_search.sql
safe_limit INTEGER := GREATEST(COALESCE(result_limit, 3), 1);

('soil_series'::text, ARRAY['soil_series_name','soil_series_code','soil_group','texture','fertility','ph_top','district']::text[], ARRAY['id','soil_series_name','soil_series_code','soil_group','texture','fertility','ph_top','district','area_rai','created_at','updated_at']::text[]),
```

- [ ] **Step 3: Run targeted tests**

Run:

```bash
npx vitest run src/domain/datasetCatalog.test.js src/services/__tests__/globalSearchService.test.js
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/utils/chatbotConstants.js src/domain/datasetCatalog.test.js src/pages/SearchResults.jsx src/components/Search/GlobalSearch.jsx supabase/global_search.sql supabase/full_text_search_indexes.sql
git commit -m "fix: align cross-table search coverage"
```

---

### Task 2: Add Smart Query Parser

**Files:**

- Create: `src/services/searchQueryParser.js`
- Create: `src/services/__tests__/searchQueryParser.test.js`

**Interfaces:**

- Produces: `parseSearchQuery(query: string): { raw: string, terms: string[], districts: string[], crops: string[], years: number[], tableHints: string[] }`.
- Consumes later: `globalSearch(query, limitPerTable, role)` will call `parseSearchQuery(query)`.

- [ ] **Step 1: Write failing parser tests**

Create `src/services/__tests__/searchQueryParser.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { parseSearchQuery } from '../searchQueryParser';

describe('parseSearchQuery', () => {
  it('extracts district, crop, year, and budget table hint', () => {
    expect(parseSearchQuery('ข้าว สามพราน งบ 2569')).toEqual({
      raw: 'ข้าว สามพราน งบ 2569',
      terms: ['ข้าว'],
      districts: ['สามพราน'],
      crops: ['ข้าว'],
      years: [2569],
      tableHints: ['budgets'],
    });
  });

  it('maps soil and protection keywords to table hints', () => {
    expect(parseSearchQuery('ชุดดิน บางเลน').tableHints).toEqual([
      'soil_series',
    ]);
    expect(parseSearchQuery('โรค แมลง ข้าว').tableHints).toEqual([
      'ai_disease_forecasts',
      'forecast_plots',
    ]);
  });
});
```

- [ ] **Step 2: Run parser tests to verify failure**

Run:

```bash
npx vitest run src/services/__tests__/searchQueryParser.test.js
```

Expected: fail because file/function does not exist.

- [ ] **Step 3: Implement parser**

Create `src/services/searchQueryParser.js`:

```js
const DISTRICTS = [
  'เมืองนครปฐม',
  'กำแพงแสน',
  'นครชัยศรี',
  'ดอนตูม',
  'บางเลน',
  'สามพราน',
  'พุทธมณฑล',
];

const CROPS = ['ข้าว', 'กล้วยไม้', 'กล้วย', 'มะพร้าว', 'ผัก', 'มะม่วง'];

const TABLE_HINTS = [
  { terms: ['งบ', 'งบประมาณ'], tables: ['budgets'] },
  { terms: ['gap', 'มาตรฐาน'], tables: ['certifications'] },
  { terms: ['ดิน', 'ชุดดิน'], tables: ['soil_series'] },
  {
    terms: ['โรค', 'แมลง', 'พยากรณ์'],
    tables: ['ai_disease_forecasts', 'forecast_plots'],
  },
  { terms: ['แปลงใหญ่'], tables: ['large_plots'] },
  { terms: ['วิสาหกิจ'], tables: ['community_enterprises'] },
];

const unique = (values) => [...new Set(values.filter(Boolean))];

export function parseSearchQuery(query = '') {
  const raw = String(query || '').trim();
  const lower = raw.toLowerCase();
  const years = unique((raw.match(/\b25\d{2}\b/g) || []).map(Number));
  const districts = DISTRICTS.filter((district) => raw.includes(district));
  const crops = CROPS.filter((crop) => raw.includes(crop));
  const tableHints = unique(
    TABLE_HINTS.flatMap(({ terms, tables }) =>
      terms.some((term) => lower.includes(term.toLowerCase())) ? tables : []
    )
  );

  const consumed = unique([
    ...districts,
    ...crops,
    ...years.map(String),
    ...TABLE_HINTS.flatMap(({ terms }) => terms),
  ]);
  const terms = unique(
    raw
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2)
      .filter((part) => !consumed.some((value) => part === value))
  );

  return { raw, terms, districts, crops, years, tableHints };
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
npx vitest run src/services/__tests__/searchQueryParser.test.js
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/searchQueryParser.js src/services/__tests__/searchQueryParser.test.js
git commit -m "feat: parse smart search queries"
```

---

### Task 3: Add SQL Relevance Metadata

**Files:**

- Modify: `supabase/global_search.sql`
- Modify: `src/domain/datasetCatalog.test.js`

**Interfaces:**

- Produces RPC row fields: `score numeric`, `match_column text`, `match_value text`, `match_type text`.
- Consumes parser hints in Task 4 through existing raw search term first; table boost can be app-side first.

- [ ] **Step 1: Add SQL contract test**

Extend `src/domain/datasetCatalog.test.js`:

```js
it('returns search relevance metadata from RPC SQL', () => {
  const sql = readFileSync('supabase/global_search.sql', 'utf8');

  expect(sql).toContain('score');
  expect(sql).toContain('match_column');
  expect(sql).toContain('match_value');
  expect(sql).toContain('match_type');
  expect(sql).toContain('similarity(');
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npx vitest run src/domain/datasetCatalog.test.js
```

Expected: fail until SQL metadata exists.

- [ ] **Step 3: Add metadata in SQL**

In `supabase/global_search.sql`, add metadata columns inside dynamic query by selecting best matching searchable column through a lateral subquery:

```sql
LEFT JOIN LATERAL (
  SELECT
    m.column_name AS match_column,
    m.column_value AS match_value,
    CASE
      WHEN lower(m.column_value) = lower($3) THEN 'exact'
      WHEN lower(m.column_value) LIKE lower($3) || '%' THEN 'prefix'
      WHEN lower(m.column_value) LIKE '%' || lower($3) || '%' THEN 'substring'
      ELSE 'trigram'
    END AS match_type,
    CASE
      WHEN lower(m.column_value) = lower($3) THEN 100
      WHEN lower(m.column_value) LIKE lower($3) || '%' THEN 80
      WHEN lower(m.column_value) LIKE '%' || lower($3) || '%' THEN 60
      ELSE round((similarity(m.column_value, $3) * 40)::numeric, 2)
    END AS score
  FROM (
    SELECT *
    FROM jsonb_each_text(to_jsonb(src))
    WHERE key = ANY($4::text[])
  ) AS m(column_name, column_value)
  WHERE m.column_value ILIKE '%' || $3 || '%'
     OR similarity(m.column_value, $3) > 0.2
  ORDER BY score DESC
  LIMIT 1
) match ON TRUE
```

Use aliases `src` for table rows and return:

```sql
match.score,
match.match_column,
match.match_value,
match.match_type
```

- [ ] **Step 4: Run tests**

Run:

```bash
npx vitest run src/domain/datasetCatalog.test.js
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/global_search.sql src/domain/datasetCatalog.test.js
git commit -m "feat: return search relevance metadata"
```

---

### Task 4: Use Parser Hints And Scores In Service

**Files:**

- Modify: `src/services/globalSearchService.js`
- Modify: `src/services/__tests__/globalSearchService.test.js`

**Interfaces:**

- Consumes: `parseSearchQuery(query)` from Task 2.
- Consumes: `raw.score`, `raw.match_column`, `raw.match_value`, `raw.match_type` from Task 3.
- Produces enriched row fields: `score`, `matchColumn`, `matchValue`, `matchType`.

- [ ] **Step 1: Add service tests**

Extend `src/services/__tests__/globalSearchService.test.js`:

```js
it('sorts table groups by score and exposes match metadata', async () => {
  supabase.rpc.mockResolvedValue({
    data: [
      {
        table: 'budgets',
        totalCount: 1,
        results: [
          {
            id: 1,
            project_name: 'งบข้าวสามพราน',
            score: 100,
            match_column: 'project_name',
            match_value: 'งบข้าวสามพราน',
            match_type: 'exact',
          },
        ],
      },
      {
        table: 'large_plots',
        totalCount: 1,
        results: [
          {
            id: 2,
            plot_name: 'ข้าว',
            score: 60,
            match_column: 'plot_name',
            match_value: 'ข้าว',
            match_type: 'substring',
          },
        ],
      },
    ],
    error: null,
  });

  const result = await globalSearchService.globalSearch('ข้าว สามพราน งบ', 5);

  expect(result[0].table).toBe('budgets');
  expect(result[0].results[0]).toMatchObject({
    score: 100,
    matchColumn: 'project_name',
    matchValue: 'งบข้าวสามพราน',
    matchType: 'exact',
  });
});
```

- [ ] **Step 2: Run service test to verify failure**

Run:

```bash
npx vitest run src/services/__tests__/globalSearchService.test.js
```

Expected: fail until metadata mapping/sort exists.

- [ ] **Step 3: Map and sort metadata**

Modify `enrichResults()` in `src/services/globalSearchService.js`:

```js
const getRowScore = (row, tableHints = [], table) =>
  Number(row.score || 0) + (tableHints.includes(table) ? 20 : 0);
```

Inside mapped result rows:

```js
const score = getRowScore(row, tableHints, entry.table);
return {
  id: row.id,
  title: getResultLabel(row, entry.table),
  subtitle: getResultSubtitle(row, entry.table),
  score,
  matchColumn: row.match_column || null,
  matchValue: row.match_value || null,
  matchType: row.match_type || null,
  raw: row,
};
```

Sort rows and groups:

```js
results: safeRows
  .map(...)
  .sort((a, b) => b.score - a.score),
```

```js
.sort((a, b) => (b.results[0]?.score || 0) - (a.results[0]?.score || 0));
```

- [ ] **Step 4: Parse query once**

At start of `globalSearch()`:

```js
const parsedQuery = parseSearchQuery(searchTerm);
```

Pass `parsedQuery.tableHints` into `enrichResults(rawResults, role, parsedQuery.tableHints)`.

- [ ] **Step 5: Run tests**

Run:

```bash
npx vitest run src/services/__tests__/globalSearchService.test.js src/services/__tests__/searchQueryParser.test.js
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/globalSearchService.js src/services/__tests__/globalSearchService.test.js
git commit -m "feat: rank global search results"
```

---

### Task 5: Show Match Snippets In UI

**Files:**

- Modify: `src/pages/SearchResults.jsx`
- Modify: `src/components/Search/GlobalSearch.jsx`

**Interfaces:**

- Consumes enriched row fields: `matchColumn`, `matchValue`, `matchType`, `score`.
- Produces visible result reason without exposing private fields already removed by service.

- [ ] **Step 1: Add compact match text helper**

In `SearchResults.jsx`, add:

```js
const MATCH_LABELS = {
  exact: 'ตรงคำ',
  prefix: 'ขึ้นต้น',
  substring: 'มีคำนี้',
  trigram: 'ใกล้เคียง',
};

function getMatchText(item) {
  if (!item.matchValue) return null;
  return `${MATCH_LABELS[item.matchType] || 'พบคำ'}: ${item.matchValue}`;
}
```

- [ ] **Step 2: Render match text below row title**

In preview item render:

```jsx
{
  getMatchText(item) && (
    <div style={{ marginTop: 2, fontSize: 11, color: '#57606a' }}>
      {highlightText(getMatchText(item), query)}
    </div>
  );
}
```

In table columns, keep existing column display; no new table column required.

- [ ] **Step 3: Add dropdown match hint**

In `GlobalSearch.jsx`, inside each `.global-search-item`:

```jsx
{
  item.matchValue && (
    <div className="item-subtitle">
      {highlightMatch(item.matchValue, query)}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npx vitest run src/services/__tests__/globalSearchService.test.js
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SearchResults.jsx src/components/Search/GlobalSearch.jsx
git commit -m "feat: show global search match context"
```

---

### Task 6: Final Verification

**Files:**

- Verify: all changed files
- Optional modify: `docs/superpowers/specs/2026-07-07-cross-table-search-design.md` only if implementation changes scope

**Interfaces:**

- Consumes all previous tasks.
- Produces verified phase 1-3 implementation.

- [ ] **Step 1: Run targeted tests**

```bash
npx vitest run src/domain/datasetCatalog.test.js src/services/__tests__/globalSearchService.test.js src/services/__tests__/searchQueryParser.test.js
```

Expected: pass.

- [ ] **Step 2: Run full tests**

```bash
npm test
```

Expected: pass.

- [ ] **Step 3: Inspect diff**

```bash
git diff --stat HEAD
git status --short
```

Expected: only intended files changed, or clean if each task was committed.

- [ ] **Step 4: Manual smoke checklist**

Use deployed/local app after SQL migration:

- Search `ข้าว สามพราน งบ 2569`.
- Search `ชุดดิน บางเลน`.
- Search `โรค แมลง ข้าว`.
- Confirm result reason/snippet visible.
- Confirm guest result hides private fields.

- [ ] **Step 5: Commit final fixes if any**

```bash
git add <changed-files>
git commit -m "test: verify cross-table search improvements"
```

Skip this commit when no files changed.
