# Cross-Table Search Phase 1-3 Design

## Goal

Make cross-table search feel complete, accurate, and smart without adding a new search engine.

Scope covers phases 1-3 only:

1. Search coverage: every intended dataset and searchable column is covered.
2. Search relevance: better ranking and match metadata.
3. Smart query parsing: understand common user terms like districts, crops, years, and domain keywords.

Out of scope: embeddings, semantic vector search, AI-generated answers.

## Current State

Search uses `globalSearch()` in `src/services/globalSearchService.js`.

Authenticated users call Supabase RPC `global_search()`. Guest users use parallel Supabase queries so private columns can be filtered in the app.

Database search uses `ILIKE '%term%'` with `pg_trgm` indexes. This is good enough for this phase if coverage and ranking improve.

## Phase 1: Search Coverage

Create one reviewed search contract for:

- table name
- label
- route
- district column
- searchable columns
- return columns
- private columns excluded for guest

The app and SQL must stay aligned. Minimum check:

- every table in app search metadata appears in RPC if public/auth search should cover it
- every RPC table has app metadata for labels/routes
- every search table has at least one searchable column unless intentionally skipped

Intentional skips must have a short comment explaining why.

## Phase 2: Relevance Ranking

RPC should return these fields per result row:

- `score`
- `match_column`
- `match_value`
- `match_type`

Ranking order:

1. exact match
2. prefix match
3. substring match
4. trigram similarity
5. latest-year boost for yearly tables
6. domain boost from query parser

UI should sort table groups and rows by score, not only by total count.

Snippet display should show why a result matched.

## Phase 3: Smart Query Parsing

Add a small query parser in JS first. No new dependency.

Parser output:

```js
{
  terms: [],
  districts: [],
  crops: [],
  years: [],
  tableHints: [],
}
```

Known dictionaries:

- 7 Nakhon Pathom districts
- common crops/products
- domain keywords:
  - `งบ`, `งบประมาณ` -> budgets
  - `GAP`, `มาตรฐาน` -> certifications
  - `ดิน`, `ชุดดิน` -> soil_series
  - `โรค`, `แมลง`, `พยากรณ์` -> ai_disease_forecasts, forecast_plots
  - `แปลงใหญ่` -> large_plots
  - `วิสาหกิจ` -> community_enterprises

Parser should not hide results outside hints. It only boosts likely tables and adds structured filters when safe.

## Data Flow

1. User types search.
2. App parses query.
3. App calls search service with raw query plus parsed hints.
4. RPC searches allowed tables/columns.
5. RPC returns rows with score and match metadata.
6. Service enriches rows with labels/routes and privacy filtering.
7. UI shows ranked results and matched snippets.

## Privacy

Guest search must never select or display private columns.

Private matching is allowed only for authenticated roles that can view those columns. Guest matching must use public columns only.

## Tests

Small tests only:

- contract drift test for app metadata vs RPC SQL
- query parser test for district/crop/year/table hints
- ranking test for exact > prefix > substring
- guest privacy test for private column exclusion

No new test framework.

## Acceptance Criteria

- Search page no longer claims unsupported coverage.
- Soil series and AI disease forecast searches work consistently between RPC and fallback.
- Result page can show why a row matched.
- Exact result appears above weaker matches.
- Query like `ข้าว สามพราน งบ 2569` boosts budget-related rows for Sam Phran rice/year context.
- Guest results do not expose private fields.
