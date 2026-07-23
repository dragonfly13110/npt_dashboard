# Rice Harvest Situation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production dashboard page that reports expected rice harvest area and estimated tonnes by harvest month and district, backed by weekly DOAE snapshots and future-season discovery.

**Architecture:** Reuse the existing authenticated DOAE HTTP scraper and Netlify scheduled-function pattern. Put parsing/calculation in a small pure module, write append-only snapshots through the existing Supabase Management API convention, and read the latest valid season from the browser using the existing Supabase client. Add one focused page, route, and sidebar item; do not add dependencies.

**Tech Stack:** React 19, React Router, Ant Design, Supabase JS, Netlify Functions, Vitest, native `fetch` and HTML parsing helpers already used in the repository.

## Global Constraints

- Use the DOAE `PD` report grouped by expected harvest month.
- Discover the newest available production season; if its rows are invalid or empty, retain the latest valid season.
- Estimate tonnes as `area_rai * 0.8`.
- Store snapshots keyed by `(snapshot_date, crop_year, district_code, harvest_month)`.
- Enable RLS and expose read access only; server-side code owns writes.
- Never replace the latest valid snapshot with empty or partial data.
- Run the existing relevant tests, lint, and app build before completion.

---

## File Map

- Create `supabase/migrations/20260723080000_create_rice_harvest_snapshots.sql`: table, indexes, RLS, and read policy.
- Create `src/utils/riceHarvest.js`: pure row normalization, season/month parsing, and 0.8-ton calculation.
- Create `scripts/scrape_rice_harvest.js`: DOAE report discovery, authenticated fetch, HTML table extraction, validation, and Supabase writes.
- Create `netlify/functions/sync-rice-harvest.js`: weekly schedule and admin/manual trigger using existing sync conventions.
- Create `src/pages/production/RiceHarvestSituation.jsx`: latest-snapshot dashboard page.
- Create `src/__tests__/rice-harvest.test.js`: parser/calculation and invalid-data checks.
- Create `src/__tests__/sync-rice-harvest.test.js`: scheduled/manual function behavior.
- Modify `src/App.jsx`: lazy import and authenticated route.
- Modify `src/components/Layout/Sidebar.jsx`: production-group menu item.

### Task 1: Add the pure rice report parser and calculation test

**Files:**

- Create: `src/utils/riceHarvest.js`
- Test: `src/__tests__/rice-harvest.test.js`

**Interfaces:**

- Produces `parseRiceHarvestTable(html, options) -> { cropYear, cutoffDate, records, provinceTotal }`.
- Each record has `{ districtCode, district, harvestMonth, householdCount, plotCount, areaRai, estimatedTons }`.
- Produces `validateRiceHarvestRecords(records, provinceTotal) -> { ok, error }`.

- [ ] **Step 1: Write the failing test**

Use a fixture containing the visible table shape: a province row, seven district rows, grouped month headers, and Thai numeric values containing commas and decimal points. Assert that `พฤศจิกายน` with `พื้นที่ (ไร่)` of `61,550.41` becomes `areaRai: 61550.41` and `estimatedTons: 49240.328`, while the province row is not returned as a district record.

```js
it('parses district harvest-month area and estimates tonnes at 0.8 per rai', () => {
  const result = parseRiceHarvestTable(FIXTURE_HTML, { cropYear: '69_1' });
  const bang_len = result.records.find(
    (row) => row.district === 'อำเภอ บางเลน'
  );
  expect(bang_len.harvestMonth).toBe('พฤศจิกายน');
  expect(bang_len.areaRai).toBe(61550.41);
  expect(bang_len.estimatedTons).toBeCloseTo(49240.328, 6);
});

it('rejects empty, duplicate, missing-district, and negative-area snapshots', () => {
  expect(validateRiceHarvestRecords([], null).ok).toBe(false);
  expect(
    validateRiceHarvestRecords([{ districtCode: '1', areaRai: -1 }], null).ok
  ).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run src/__tests__/rice-harvest.test.js`

Expected: FAIL because `src/utils/riceHarvest.js` does not exist.

- [ ] **Step 3: Implement the minimum pure module**

Use `DOMParser` when available and a small table-row traversal compatible with the Netlify Node runtime. Normalize Thai commas, dashes, and blank cells to numbers; map month group headers to their three child columns; skip the province aggregate row; and compute `estimatedTons` in the parser with `Number((areaRai * 0.8).toFixed(6))`.

```js
export const RICE_TONS_PER_RAI = 0.8;

export function estimateRiceTons(areaRai) {
  return Number((Number(areaRai) * RICE_TONS_PER_RAI).toFixed(6));
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run src/__tests__/rice-harvest.test.js`

Expected: PASS with parser and invalid-data assertions passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/riceHarvest.js src/__tests__/rice-harvest.test.js
git commit -m "feat: parse rice harvest report data"
```

### Task 2: Create the Supabase snapshot table with read-only RLS

**Files:**

- Create: `supabase/migrations/20260723080000_create_rice_harvest_snapshots.sql`

**Interfaces:**

- Table `public.rice_harvest_snapshots` is readable by the same public/authenticated dashboard users and writable by the server role only.

- [ ] **Step 1: Create the migration through the repository's Supabase migration workflow**

Run the available CLI discovery first: `supabase migration new create_rice_harvest_snapshots --help`, then use the generated migration path. If the CLI is unavailable, create the migration file with the next repository timestamp and preserve the SQL below.

- [ ] **Step 2: Add the exact schema and policies**

```sql
create table public.rice_harvest_snapshots (
  id bigint generated by default as identity primary key,
  snapshot_date date not null default current_date,
  scraped_at timestamptz not null default now(),
  source_cutoff_date date,
  crop_year text not null,
  district_code text not null,
  district text not null,
  harvest_month smallint not null check (harvest_month between 1 and 12),
  household_count integer not null check (household_count >= 0),
  plot_count integer not null check (plot_count >= 0),
  area_rai numeric(14, 2) not null check (area_rai >= 0),
  estimated_tons numeric(16, 6) not null check (estimated_tons >= 0),
  unique (snapshot_date, crop_year, district_code, harvest_month)
);

create index rice_harvest_latest_idx
  on public.rice_harvest_snapshots (crop_year, snapshot_date desc, harvest_month, district_code);

alter table public.rice_harvest_snapshots enable row level security;
grant select on public.rice_harvest_snapshots to anon, authenticated;
create policy "Rice harvest snapshots are readable"
  on public.rice_harvest_snapshots for select
  to anon, authenticated using (true);
```

- [ ] **Step 3: Apply and verify the schema**

Run the repository's existing SQL execution command after checking its `--help`, then run a read-only query:

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'rice_harvest_snapshots'
order by ordinal_position;
```

Expected: all columns above are present, RLS is enabled, and no insert policy exists for `anon` or `authenticated`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260723080000_create_rice_harvest_snapshots.sql
git commit -m "feat: add rice harvest snapshot table"
```

### Task 3: Implement authenticated DOAE discovery, scraping, validation, and weekly sync

**Files:**

- Create: `scripts/scrape_rice_harvest.js`
- Create: `netlify/functions/sync-rice-harvest.js`
- Test: `src/__tests__/sync-rice-harvest.test.js`

**Interfaces:**

- `discoverLatestRiceReport(fetchImpl) -> { reportUrl, cropYear }`.
- `scrapeRiceHarvest({ fetchImpl, runSQL }) -> { cropYear, snapshotDate, rowCount }`.
- `scheduledSyncRiceHarvest(event, context) -> Response`.

- [ ] **Step 1: Write failing sync tests**

Mock `fetch`, the DOAE session/login responses, the discovered `PD` report, and `runSQL`. Assert that a valid report writes rows containing `estimated_tons`; assert that an empty report throws before any insert SQL; assert that a scheduled call runs without an Authorization header.

```js
it('does not write an empty or partial source report', async () => {
  mockDoaeReport('<table><tbody></tbody></table>');
  await expect(
    scrapeRiceHarvest({ fetchImpl: fetchMock, runSQL })
  ).rejects.toThrow('No valid rice harvest rows');
  expect(runSQL).not.toHaveBeenCalledWith(
    expect.stringContaining('insert into rice_harvest_snapshots')
  );
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npx vitest run src/__tests__/sync-rice-harvest.test.js`

Expected: FAIL because the scraper and function exports do not exist.

- [ ] **Step 3: Implement discovery and scraper using existing conventions**

Reuse the session-cookie/login flow and environment names from `scripts/scrape_farmer_registry.js`. Discover report links by fetching the DOAE report index, selecting the newest valid `rice_pv_mm_1/73/{season}/PD` path, and parsing the season code from the path. Fetch the report, pass HTML to `parseRiceHarvestTable`, require seven districts and non-negative values, then build one SQL insert/upsert with conflict key `(snapshot_date, crop_year, district_code, harvest_month)`.

Use `source_cutoff_date`, `scraped_at`, and `snapshot_date` in every row. Before writing, reject any set with fewer than seven district codes or with no harvest-month rows. After writing, verify the inserted count with `select count(*)` for the exact crop year and snapshot date.

- [ ] **Step 4: Implement the Netlify function**

Follow `netlify/functions/sync-farmer-registry.js`: allow admin `POST` with Supabase token validation, allow scheduled invocation without browser auth, return `{ ok: true, skipped: true }` when the latest successful snapshot is less than seven days old, and schedule with `schedule('0 0 * * 0', scheduledSyncRiceHarvest)`.

Use the existing CORS/security/error-alert helpers. Never return credentials or raw source HTML in logs.

- [ ] **Step 5: Run focused tests and verify pass**

Run: `npx vitest run src/__tests__/rice-harvest.test.js src/__tests__/sync-rice-harvest.test.js`

Expected: PASS, including no-write-on-invalid-source behavior.

- [ ] **Step 6: Commit**

```bash
git add scripts/scrape_rice_harvest.js netlify/functions/sync-rice-harvest.js src/__tests__/sync-rice-harvest.test.js
git commit -m "feat: sync rice harvest snapshots weekly"
```

### Task 4: Add the dashboard page, route, and production navigation

**Files:**

- Create: `src/pages/production/RiceHarvestSituation.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Layout/Sidebar.jsx`

**Interfaces:**

- The page queries `rice_harvest_snapshots` with the existing `supabase` client and renders only validated rows.
- Route: `/dashboard/production/rice-harvest-situation`.
- Sidebar label: `สถานการณ์การเพาะปลูกข้าว`.

- [ ] **Step 1: Add the route and menu item test coverage**

Extend the existing route/navigation test pattern if present; otherwise add one small assertion in the page test that the route component can render with mocked Supabase data.

- [ ] **Step 2: Implement the page with the existing Ant Design and chart patterns**

Query the latest `crop_year` and `snapshot_date`, then fetch all rows for that pair ordered by `harvest_month` and `district_code`. Derive province monthly totals, district-by-month rows, and previous-snapshot deltas in pure local functions. Render: freshness card, total area/tonnes cards, monthly tonnes chart, district table, and change versus previous snapshot. Add crop-year and snapshot selectors only if the data query returns more than one season/snapshot; otherwise show the current season directly.

Display `estimated_tons` to two decimals and area to two decimals. Use Thai month labels. Show explicit loading, empty, and error states; do not show a false zero when the query fails.

- [ ] **Step 3: Wire lazy import and route**

Add `const RiceHarvestSituation = lazy(() => import('./pages/production/RiceHarvestSituation'));` beside the other production imports and add the route beside `production/crop-production`.

- [ ] **Step 4: Add the menu item**

Insert the item under the `production` children in `src/components/Layout/Sidebar.jsx` with a chart icon and key `/dashboard/production/rice-harvest-situation`.

- [ ] **Step 5: Run focused page tests, lint, and build**

Run:

```bash
npx vitest run src/pages/production src/__tests__/rice-harvest.test.js
npm run lint:src -- --quiet
npm run build
```

Expected: PASS, zero lint errors in changed source, and a successful Vite build.

- [ ] **Step 6: Commit**

```bash
git add src/pages/production/RiceHarvestSituation.jsx src/App.jsx src/components/Layout/Sidebar.jsx
git commit -m "feat: add rice harvest situation dashboard"
```

### Task 5: End-to-end verification and handoff

**Files:**

- Modify only if verification exposes a defect.

- [ ] **Step 1: Run the complete existing test suite**

Run: `npm test`

Expected: existing suite remains green with no unexpected failures.

- [ ] **Step 2: Verify the production route manually**

Run: `npm run dev -- --host 127.0.0.1`

Open `/dashboard/production/rice-harvest-situation` as an authenticated dashboard user and verify the page shows the latest valid season, monthly tonnes, district rows, and the last-successful-update date. Verify an empty/error response displays a state message rather than zero totals.

- [ ] **Step 3: Verify the scheduler and database read path**

Invoke the scheduled function test export with mocked DOAE data and query Supabase for the exact `crop_year` and `snapshot_date`. Expected: seven districts are represented, `estimated_tons = area_rai * 0.8`, and a second run on the same snapshot date does not duplicate rows.

- [ ] **Step 4: Commit any verification-only fix**

```bash
git add $(git diff --name-only)
git commit -m "fix: verify rice harvest dashboard integration"
```

Do not commit generated build output or credentials.
