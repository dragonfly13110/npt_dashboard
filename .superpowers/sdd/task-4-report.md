# Task 4 Report: Embeddable, filter-aware group dashboards

## Status

Implemented and verified against base commit `579f5f6`.

## Implementation

- Added the requested `{ district, year }` filter contract to `useProductionData`, `useDevelopmentData`, and `useProtectionData`.
- Applied client-side filtering before existing selectors:
  - Production: `year` for `large_plots` and `crop_production`; district-only via `plot_district` for certifications.
  - Development: `data_year` for SF, YSF, career, and young groups; `year` for housewife groups and disasters; district-only for undated tables.
  - Protection: district only for all observation tables; establishment-like years are not treated as report years.
  - Strategy: `data_year` for farmer registry; `year` for parcel progress only when present; district/latest-only handling for agricultural area, learning centers, weather, and prices.
- Added `error`, `refetch`, and `yearSupported` to the three group-data hook returns.
- Made all four dashboards accept `{ embedded = false, filters = {} }`, hide only `PageHeader` when embedded, preserve standalone headers/content, and render local `Result` retry states.
- Added an explicit Thai disclosure when a specific year is selected for protection observations.
- Added latest-data labels to undated Strategy summaries.
- Supabase result errors now reject each group query so React Query can expose the isolated module error.

## TDD evidence

### RED

- `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`
  - Exit 1: 13 of 17 tests failed for missing filtering, embedding, year disclosure, and error/retry behavior.
- Self-review follow-up with the same command:
  - Exit 1: 1 of 17 tests failed because undated Strategy summaries lacked explicit latest-data labels.

### GREEN

- `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`
  - Exit 0: 17 of 17 tests passed after each RED cycle.
- `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx src/__tests__/system-health.test.js src/__tests__/tbk-cultivation-page.test.jsx src/__tests__/guest-public-tables.test.js src/__tests__/dashboard-error-state.test.js`
  - Exit 0: 5 files, 28 tests passed.
- `npm run lint:src`
  - Exit 0: ESLint completed with zero warnings.
- `npm test`
  - Exit 0: 100 files passed, 1 skipped; 461 tests passed, 17 skipped.

## Files

- `src/hooks/useProductionData.js`
- `src/hooks/useDevelopmentData.js`
- `src/hooks/useProtectionData.js`
- `src/pages/strategy/StrategyDashboard.jsx`
- `src/pages/production/ProductionDashboard.jsx`
- `src/pages/development/DevelopmentDashboard.jsx`
- `src/pages/protection/ProtectionDashboard.jsx`
- `src/__tests__/interactive-dashboard-one-page.test.jsx`
- `.superpowers/sdd/task-4-report.md`

## Self-review

- Standards: no remaining findings; the diff follows the repository's minimal-change guidance, passes ESLint, and keeps UTF-8 Thai intact.
- Spec: one partial finding (missing latest labels for undated Strategy summaries) was reproduced with a failing test and fixed. No remaining missing requirements or scope creep found.
- Kept the existing cards/charts JSX in each dashboard instead of extracting four file-local content components. Extraction would only move unchanged JSX and increase churn; the requested prop, header, error, and content-preservation contracts are met without it.
- Confirmed no `ModuleSection`, extras, or Module Stream assembly was added.

## Concerns

- Test runs warn that local `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are absent; mocked/unit tests still pass and no credentials were added.
