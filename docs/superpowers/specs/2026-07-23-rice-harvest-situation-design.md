# Rice Harvest Situation Design

## Goal

Add a page under the production group that answers:

- In which month will rice be harvested in Nakhon Pathom?
- How many tonnes are expected province-wide and in each district?
- How have the registered harvest figures changed between weekly data pulls?

The estimate is intentionally simple: `harvest area (rai) × 0.8 tonnes/rai`.

## Source

Use the authenticated DOAE farmer registry report whose path ends in:

`report6x/rice_pv_mm_1/73/{season}/PD`

`PD` is the report grouped by expected harvest month at the plot location. The
sync must discover the newest available production season from DOAE rather than
derive it from the current date. If a newly discovered season has no usable
rows, retain the latest valid season and data.

For every district and harvest month, ingest:

- household count
- plot count
- harvest area in rai
- source cutoff date
- production season

The province total row is used only as a validation total; district rows are
the stored source of dashboard totals.

## Data Model

Create one append-only public table, `rice_harvest_snapshots`, with:

- `id`
- `snapshot_date`
- `scraped_at`
- `source_cutoff_date`
- `crop_year`
- `district_code`
- `district`
- `harvest_month`
- `household_count`
- `plot_count`
- `area_rai`
- `estimated_tons`

The unique key is
`(snapshot_date, crop_year, district_code, harvest_month)`, making retries for
the same day idempotent. Enable RLS. Allow read-only access to roles already
used by production dashboard pages; writes remain server-side only.

Store the calculated tonnage for transparent exports, and calculate it again
from area in the scraper's runnable check to detect formula regressions.

## Sync

Add a Netlify scheduled function that runs once every seven days and reuses the
existing DOAE authentication and Supabase server-write conventions.

The sync flow is:

1. Authenticate with the existing DOAE credentials.
2. Discover the newest available production season.
3. Fetch and parse its `PD` report.
4. Validate that all seven Nakhon Pathom districts are present, monthly values
   are non-negative, and district sums reasonably match the province total.
5. Upsert one snapshot per district and harvest month.
6. Verify the newly stored row count and totals.

Authentication, parsing, validation, or database failures must leave the last
valid snapshot untouched and produce an actionable server log. No empty or
partial snapshot may become the latest dashboard state.

## Page

Add `/dashboard/production/rice-harvest-situation` and a matching sidebar item
labelled `สถานการณ์การเพาะปลูกข้าว`.

The page shows:

1. Data freshness: crop year, DOAE cutoff date, and last successful sync.
2. Province summary: total expected area and estimated tonnes.
3. Monthly chart: expected tonnes by harvest month.
4. District-by-month table: area and estimated tonnes, with province totals.
5. Weekly progress: change in area and estimated tonnes versus the immediately
   preceding snapshot for the same crop year.

The default view uses the newest crop year and latest snapshot. Older crop
years and snapshots remain selectable. Empty, loading, and sync-failure states
must keep the last valid data understandable.

## Checks

Use the repository's existing Vitest setup for one focused parser/calculation
test covering the supplied DOAE table shape and the 0.8 tonnes/rai formula.
Add a scheduled-sync test that proves invalid or empty source data is not
written. Run the relevant tests, lint changed files, and build the app.

## Explicit Non-goals

- No planting-area target or target-completion percentage.
- No agronomic yield model beyond the agreed 800 kg/rai estimate.
- No manual data-entry workflow.
- No additional scheduler or dependency when the installed Netlify scheduling,
  fetch, Supabase client, and existing chart/UI packages already cover the work.
