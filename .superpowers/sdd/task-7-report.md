# Task 7 report

- Replaced separate district/subdistrict state with one `areaSelection` state.
- Summary now returns scope-matched breakdowns for Farmer Registry, GEOPLOTS progress, group count, and hotspot count; legend unit follows selected metric.
- Subdistrict selection requests its own summary. `district_only` uses district values only with an explicit label. Boundary toggle remains display-only.

Checks: focused Vitest (11), `npm run lint:src`, `npm run build`, live district summary API.
