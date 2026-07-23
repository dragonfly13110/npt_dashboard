# TBK Cultivation Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strategy dashboard page containing all current-year Nakhon Pathom registrations from the DOAE cultivation report, stored as twice-monthly snapshots.

**Architecture:** Follow the existing rice-harvest implementation: a pure HTML parser, an authenticated HTTP scraper, a protected scheduled Netlify function, a read-only Supabase snapshot table, and one React page. Reuse the installed Ant Design, Supabase, and XLSX dependencies; add no packages.

**Tech Stack:** React 19, React Router, Ant Design, Supabase JS/Postgres, Netlify Functions, native fetch, XLSX, Vitest.

## Global Constraints

- Source is `https://farmer.doae.go.th/plants_detail/plants_select/report_select`.
- Use production year `ปีปัจจุบัน`, province `นครปฐม`, all districts/subdistricts, all item types, all items, and all breeds.
- Include plants, livestock, sea salt, aquaculture, and economic insects.
- Keep the source table's 10 values without estimating or deduplicating households.
- Reject partial/changed source HTML before database writes.
- Run automatically on days 1 and 15 of every month.
- Do not add dependencies or store DOAE credentials in browser code.

---

## File Map

- Create `src/utils/tbkCultivation.js`: parse and validate source rows; filter/summarize dashboard rows.
- Create `src/__tests__/tbk-cultivation.test.js`: parser, validation, and filtered-summary checks.
- Create `supabase/migrations/20260723170000_create_tbk_cultivation_snapshots.sql`: snapshot table and read-only RLS.
- Create `scripts/scrape_tbk_cultivation.js`: authenticated report fetch and atomic snapshot insert.
- Create `netlify/functions/sync-tbk-cultivation.js`: scheduled/admin sync.
- Create `src/__tests__/sync-tbk-cultivation.test.js`: scheduler and invalid-source tests.
- Create `src/pages/strategy/TbkCultivationArea.jsx`: cards, filters, table, sync action, and Excel export.
- Create `src/__tests__/tbk-cultivation-page.test.jsx`: filtered totals and empty-state checks.
- Modify `src/App.jsx`, `src/components/Layout/Sidebar.jsx`, `src/components/Layout/AppLayout.jsx`: route and navigation.
- Modify `src/domain/datasetCatalog.js`: strategy access for the new table.

### Task 1: Parse and validate the exact 10-column report

**Files:**

- Create: `src/utils/tbkCultivation.js`
- Test: `src/__tests__/tbk-cultivation.test.js`

**Interfaces:**

- Produces `parseTbkCultivationTable(html, { dataYear, groupCode, groupName }) -> Row[]`.
- Produces `validateTbkCultivationRows(rows) -> { ok, error }`.
- Produces `summarizeTbkCultivationRows(rows) -> { rowCount, householdCount, plotCount, areaRai, disasterAreaRai, remainingAreaRai }`.

- [ ] **Step 1: Write a failing parser test**

```js
it('parses all ten source cells and comma numbers', () => {
  const [row] = parseTbkCultivationTable(FIXTURE, {
    dataYear: 2569,
    groupCode: '01',
    groupName: 'ข้าว',
  });
  expect(row).toMatchObject({
    locationCode: '2-73',
    locationName: 'นครปฐม',
    itemBreed: 'ข้าวเจ้า (กข41 ไม่ไวแสง)',
    householdCount: 8376,
    plotCount: 17424,
    areaRai: 143062.07,
    disasterHouseholdCount: 0,
    disasterPlotCount: 0,
    disasterAreaRai: 0,
    remainingAreaRai: 143062.07,
  });
});

it('rejects empty, malformed, duplicate, and negative rows', () => {
  expect(validateTbkCultivationRows([]).ok).toBe(false);
});
```

- [ ] **Step 2: Run `npx vitest run src/__tests__/tbk-cultivation.test.js`**

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimum parser and pure summary**

```js
export function parseTbkNumber(value) {
  const number = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .trim()
  );
  return Number.isFinite(number) ? number : null;
}

export function summarizeTbkCultivationRows(rows) {
  return rows.reduce(
    (sum, row) => ({
      rowCount: sum.rowCount + 1,
      householdCount: sum.householdCount + row.householdCount,
      plotCount: sum.plotCount + row.plotCount,
      areaRai: sum.areaRai + row.areaRai,
      disasterAreaRai: sum.disasterAreaRai + row.disasterAreaRai,
      remainingAreaRai: sum.remainingAreaRai + row.remainingAreaRai,
    }),
    {
      rowCount: 0,
      householdCount: 0,
      plotCount: 0,
      areaRai: 0,
      disasterAreaRai: 0,
      remainingAreaRai: 0,
    }
  );
}
```

Parse only `<tr>` rows containing exactly 10 `<td>` cells and a `2-` location code. Decode HTML entities, preserve `itemBreed` as source text, and key duplicates by `groupCode + locationCode + itemBreed`.

- [ ] **Step 4: Run the focused test**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/tbkCultivation.js src/__tests__/tbk-cultivation.test.js
git commit -m "feat: parse tbk cultivation report"
```

### Task 2: Add the snapshot table and twice-monthly sync

**Files:**

- Create: `supabase/migrations/20260723170000_create_tbk_cultivation_snapshots.sql`
- Create: `scripts/scrape_tbk_cultivation.js`
- Create: `netlify/functions/sync-tbk-cultivation.js`
- Test: `src/__tests__/sync-tbk-cultivation.test.js`

**Interfaces:**

- Table `public.tbk_cultivation_snapshots`.
- `scrapeTbkCultivation({ fetchImpl, runSQL }) -> { dataYear, snapshotDate, rowCount }`.
- `scheduledSyncTbkCultivation(event, context) -> Response`.

- [ ] **Step 1: Write failing sync tests**

```js
it('never writes an invalid report', async () => {
  await expect(scrapeTbkCultivation({ fetchImpl, runSQL })).rejects.toThrow(
    'No valid TBK cultivation rows'
  );
  expect(runSQL).not.toHaveBeenCalledWith(
    expect.stringContaining('insert into')
  );
});

it('runs from the scheduler without a browser token', async () => {
  const response = await scheduledSyncTbkCultivation();
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run `npx vitest run src/__tests__/sync-tbk-cultivation.test.js`**

Expected: FAIL because the scraper/function do not exist.

- [ ] **Step 3: Add the exact snapshot schema**

```sql
create table public.tbk_cultivation_snapshots (
  id bigint generated by default as identity primary key,
  snapshot_date date not null default current_date,
  scraped_at timestamptz not null default now(),
  data_year integer not null,
  group_code text not null,
  group_name text not null,
  location_code text not null,
  location_name text not null,
  item_breed text not null,
  household_count integer not null check (household_count >= 0),
  plot_count integer not null check (plot_count >= 0),
  area_rai numeric(14,2) not null check (area_rai >= 0),
  disaster_household_count integer not null check (disaster_household_count >= 0),
  disaster_plot_count integer not null check (disaster_plot_count >= 0),
  disaster_area_rai numeric(14,2) not null check (disaster_area_rai >= 0),
  remaining_area_rai numeric(14,2) not null check (remaining_area_rai >= 0),
  unique (snapshot_date, data_year, group_code, location_code, item_breed)
);

alter table public.tbk_cultivation_snapshots enable row level security;
grant select on public.tbk_cultivation_snapshots to anon, authenticated;
create policy "TBK cultivation snapshots are readable"
  on public.tbk_cultivation_snapshots for select
  to anon, authenticated using (true);
```

- [ ] **Step 4: Implement authenticated scraping**

Reuse the login/session-cookie sequence and environment names from `scripts/scrape_farmer_registry.js`. Fetch the unfiltered control report plus the 13 visible `TypeCode` values (`01`–`09`, `10`, `12`, `20`, `30`) so each row retains its source group. Require every response to contain the 10-column table headers and require the combined grouped-row count to equal the unfiltered control-row count, then insert the complete snapshot in one SQL transaction/upsert. A valid empty group is allowed. Never delete a prior snapshot.

- [ ] **Step 5: Implement protected manual sync and schedule**

Reuse admin-token, CORS, alert, and logging code from `sync-rice-harvest.js`. Export:

```js
export const handler = schedule('0 0 1,15 * *', scheduledSyncTbkCultivation);
```

Manual `POST` requires admin authentication; scheduled execution does not.

- [ ] **Step 6: Apply migration and run focused tests**

Run:

```bash
npx vitest run src/__tests__/tbk-cultivation.test.js src/__tests__/sync-tbk-cultivation.test.js
```

Expected: PASS and the Supabase table is readable but not writable by `anon`/`authenticated`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260723170000_create_tbk_cultivation_snapshots.sql scripts/scrape_tbk_cultivation.js netlify/functions/sync-tbk-cultivation.js src/__tests__/sync-tbk-cultivation.test.js
git commit -m "feat: sync tbk cultivation twice monthly"
```

### Task 3: Add the strategy dashboard page

**Files:**

- Create: `src/pages/strategy/TbkCultivationArea.jsx`
- Create: `src/__tests__/tbk-cultivation-page.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Layout/Sidebar.jsx`
- Modify: `src/components/Layout/AppLayout.jsx`
- Modify: `src/domain/datasetCatalog.js`

**Interfaces:**

- Route `/dashboard/strategy/tbk-cultivation-area`.
- Sidebar label `พื้นที่เพาะปลูกตาม ทบก.`
- Reads the latest `(data_year, snapshot_date)` from `tbk_cultivation_snapshots`.

- [ ] **Step 1: Write a failing page test**

Mock Supabase with two groups. Select `ข้าว` and assert that cards and table show only rice rows; clear the filter and assert that all rows return. Mock an empty result and assert `ยังไม่มี snapshot ข้อมูลพื้นที่ตาม ทบก.`.

- [ ] **Step 2: Run `npx vitest run src/__tests__/tbk-cultivation-page.test.jsx`**

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement the page**

Use existing Ant Design patterns from `RiceHarvestSituation.jsx`. Query the latest snapshot, then render:

- top filters for group and text search;
- cards for filtered row count, plots, registered area, disaster area, and remaining area;
- warning that summed households can repeat across item/breed rows;
- paginated 10-column table;
- source year and last update;
- admin sync button calling `/.netlify/functions/sync-tbk-cultivation`;
- Excel export using the installed `xlsx` dynamic import and only filtered rows.

Excel columns use the same Thai labels as the source and add `กลุ่มข้อมูล`; apply header fill, bold font, borders, number formats, widths, freeze row, and autofilter following `RiceHarvestSituation.jsx`.

- [ ] **Step 4: Add route, menu, breadcrumb, and access table**

Add the lazy import and route in `src/App.jsx`, the strategy child in `Sidebar.jsx`, the breadcrumb label in `AppLayout.jsx`, and `tbk_cultivation_snapshots` to the strategy table list in `datasetCatalog.js`.

- [ ] **Step 5: Run focused tests, lint, and build**

```bash
npx vitest run src/__tests__/tbk-cultivation-page.test.jsx src/__tests__/tbk-cultivation.test.js
npm run lint:src -- --quiet
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/strategy/TbkCultivationArea.jsx src/__tests__/tbk-cultivation-page.test.jsx src/App.jsx src/components/Layout/Sidebar.jsx src/components/Layout/AppLayout.jsx src/domain/datasetCatalog.js
git commit -m "feat: add tbk cultivation dashboard"
```

### Task 4: Load the first snapshot and verify end to end

**Files:**

- Modify only if verification exposes a defect.

- [ ] **Step 1: Run the scraper against the live DOAE report**

Run `node scripts/scrape_tbk_cultivation.js`.

Expected: at least 448 rows, all 13 groups represented, and no credentials/raw HTML printed.

- [ ] **Step 2: Verify Supabase**

```sql
select data_year, snapshot_date, count(*) as rows, count(distinct group_code) as groups
from public.tbk_cultivation_snapshots
group by data_year, snapshot_date
order by snapshot_date desc
limit 1;
```

Expected: current year, at least 448 rows, and 13 groups.

- [ ] **Step 3: Run the complete suite**

Run `npm test`.

Expected: all existing and new tests pass.

- [ ] **Step 4: Verify the page**

Open `/dashboard/strategy/tbk-cultivation-area`; verify filters change cards/table, Excel contains filtered rows, and empty/error states never display false zero totals.

- [ ] **Step 5: Commit verification fixes if needed**

```bash
git add -p
git commit -m "fix: verify tbk cultivation integration"
```

Do not commit credentials or generated build output.
