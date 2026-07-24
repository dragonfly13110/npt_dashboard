# Interactive Dashboard One-Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/interactive-dashboard` with a SaaS-style Module Stream that exposes every public agricultural category on one filterable, expandable page.

**Architecture:** Keep Supabase and the existing domain hooks as the source of truth. Add one shared filter contract, make the four group dashboard hooks filter-aware, lazy-mount each module near the viewport, and add a small extras hook for public datasets missing from group overview dashboards. Existing detail routes remain untouched.

**Tech Stack:** React 19, React Router 7, Ant Design 6, TanStack React Query 5, ECharts 6, Supabase JS 2, Vitest, Testing Library.

## Global Constraints

- Public agricultural data only; never expose administration, personnel, budgets, permissions, or audit data.
- Global filters are district and data year.
- Unsupported year filtering must display `ข้อมูลล่าสุด` instead of silently treating values as zero.
- Expanded detail stays on `/interactive-dashboard`.
- Reuse existing hooks, chart helpers, React Query, and Supabase client.
- Add no dependency.
- A failed module must not block other modules.
- Do not mount or fetch every detail module on the first render.
- Preserve the current print action and existing public/detail routes.
- Support keyboard navigation, visible focus, screen readers, and mobile.

---

## File Map

- Create `src/pages/interactiveDashboard/filters.js`: pure filter/year helpers shared by all dashboard hooks.
- Create `src/pages/interactiveDashboard/filters.test.js`: helper contract.
- Create `src/pages/interactiveDashboard/useInteractiveFilters.js`: URL-backed district/year state.
- Create `src/pages/interactiveDashboard/ModuleSection.jsx`: native expandable module plus intersection-based lazy mounting.
- Create `src/pages/interactiveDashboard/ModuleSection.test.jsx`: expansion and lazy-mount checks.
- Create `src/hooks/useInteractiveExtrasData.js`: TBK, rice harvest, production cost, AI forecast, and soil summaries absent from group overview hooks.
- Create `src/pages/interactiveDashboard/ExtrasSection.jsx`: compact cards/charts for the extras hook.
- Modify `src/hooks/useProductionData.js`: accept and apply shared filters.
- Modify `src/hooks/useDevelopmentData.js`: accept and apply shared filters instead of forcing latest year.
- Modify `src/hooks/useProtectionData.js`: accept district/year and report unsupported-year status.
- Modify `src/pages/strategy/StrategyDashboard.jsx`: accept embedded mode and shared filters.
- Modify `src/pages/production/ProductionDashboard.jsx`: accept embedded mode and shared filters.
- Modify `src/pages/development/DevelopmentDashboard.jsx`: accept embedded mode and shared filters.
- Modify `src/pages/protection/ProtectionDashboard.jsx`: accept embedded mode and shared filters.
- Modify `src/pages/InteractiveDashboard.jsx`: SaaS shell, sticky navigation, overview, lazy modules, URL filters.
- Modify `src/pages/InteractiveDashboard.css`: Module Stream, responsive, focus, empty/error, and print styling.
- Create `src/__tests__/interactive-dashboard-one-page.test.jsx`: one integration test for filter, expansion, unsupported year, and isolated failure.

---

### Task 1: Shared filter contract

**Files:**

- Create: `src/pages/interactiveDashboard/filters.js`
- Create: `src/pages/interactiveDashboard/filters.test.js`

**Interfaces:**

- Produces: `ALL_DISTRICTS`, `LATEST_YEAR`, `normalizeYear`, `filterRows`, `collectYears`, `yearStatus`.
- Consumes: row arrays already returned by existing Supabase queries.

- [ ] **Step 1: Write the failing helper tests**

```js
import { describe, expect, it } from 'vitest';
import {
  LATEST_YEAR,
  collectYears,
  filterRows,
  normalizeYear,
  yearStatus,
} from './filters';

describe('interactive dashboard filters', () => {
  const rows = [
    { district: 'เมืองนครปฐม', data_year: 2569, value: 1 },
    { district: 'บางเลน', data_year: 2568, value: 2 },
  ];

  it('filters supported district and year fields', () => {
    expect(filterRows(rows, { district: 'เมืองนครปฐม', year: '2569' })).toEqual(
      [rows[0]]
    );
  });

  it('keeps rows when a dataset has no year field', () => {
    expect(
      filterRows(
        [{ district: 'บางเลน', value: 2 }],
        { district: 'บางเลน', year: '2569' },
        { yearKey: null }
      )
    ).toHaveLength(1);
  });

  it('collects Buddhist years and defaults invalid values to latest', () => {
    expect(collectYears([{ rows, yearKey: 'data_year' }])).toEqual([
      2569, 2568,
    ]);
    expect(normalizeYear('bad')).toBe(LATEST_YEAR);
  });

  it('discloses unsupported year filters', () => {
    expect(yearStatus('2569', null)).toEqual({
      supported: false,
      label: 'ข้อมูลล่าสุด',
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/pages/interactiveDashboard/filters.test.js`

Expected: FAIL because `./filters` does not exist.

- [ ] **Step 3: Implement the pure helpers**

```js
export const ALL_DISTRICTS = 'ทั้งหมด';
export const LATEST_YEAR = 'latest';

export function normalizeYear(value) {
  if (value === LATEST_YEAR) return value;
  const year = Number(value);
  return Number.isInteger(year) && year > 2400 && year < 2700
    ? String(year)
    : LATEST_YEAR;
}

export function filterRows(
  rows,
  { district = ALL_DISTRICTS, year = LATEST_YEAR } = {},
  { districtKey = 'district', yearKey = 'data_year' } = {}
) {
  return rows.filter((row) => {
    if (
      district !== ALL_DISTRICTS &&
      districtKey &&
      row[districtKey] !== district
    ) {
      return false;
    }
    if (year === LATEST_YEAR || !yearKey) return true;
    return Number(row[yearKey]) === Number(year);
  });
}

export function collectYears(sources) {
  return [
    ...new Set(
      sources.flatMap(({ rows, yearKey }) =>
        yearKey
          ? rows.map((row) => Number(row[yearKey])).filter(Number.isFinite)
          : []
      )
    ),
  ].sort((a, b) => b - a);
}

export function yearStatus(selectedYear, yearKey) {
  return yearKey
    ? { supported: true, label: selectedYear }
    : { supported: false, label: 'ข้อมูลล่าสุด' };
}
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- src/pages/interactiveDashboard/filters.test.js`

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/interactiveDashboard/filters.js src/pages/interactiveDashboard/filters.test.js
git commit -m "feat: add interactive dashboard filter contract"
```

---

### Task 2: URL-backed filters

**Files:**

- Create: `src/pages/interactiveDashboard/useInteractiveFilters.js`
- Test: `src/__tests__/interactive-dashboard-one-page.test.jsx`

**Interfaces:**

- Consumes: `DISTRICT_LIST`, `normalizeYear`, router search params.
- Produces: `useInteractiveFilters()` and `useInteractiveYears()`.

- [ ] **Step 1: Add the failing URL-state assertion to the integration test**

```jsx
it('restores district and year from the URL', async () => {
  renderDashboard('/interactive-dashboard?district=บางเลน&year=2569');
  expect(await screen.findByLabelText('เลือกอำเภอ')).toHaveTextContent(
    'บางเลน'
  );
  expect(screen.getByLabelText('เลือกปีข้อมูล')).toHaveTextContent('2569');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`

Expected: FAIL because the year filter is absent.

- [ ] **Step 3: Implement the hook**

```js
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DISTRICT_LIST } from '../../hooks/useDashboardData';
import { useApiCache } from '../../hooks/useApiCache';
import { supabase } from '../../supabaseClient';
import {
  ALL_DISTRICTS,
  LATEST_YEAR,
  collectYears,
  normalizeYear,
} from './filters';

export function useInteractiveFilters() {
  const [params, setParams] = useSearchParams();
  const requestedDistrict = params.get('district');
  const district = DISTRICT_LIST.includes(requestedDistrict)
    ? requestedDistrict
    : ALL_DISTRICTS;
  const year = normalizeYear(params.get('year') || LATEST_YEAR);

  const update = useCallback(
    (key, value, defaultValue) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (value === defaultValue) next.delete(key);
        else next.set(key, value);
        return next;
      });
    },
    [setParams]
  );

  return {
    district,
    year,
    districts: [ALL_DISTRICTS, ...DISTRICT_LIST],
    setDistrict: (value) => update('district', value, ALL_DISTRICTS),
    setYear: (value) => update('year', normalizeYear(value), LATEST_YEAR),
  };
}

export function useInteractiveYears() {
  const query = useApiCache('interactive-dashboard-years', async () => {
    const results = await Promise.all([
      supabase.from('farmer_registry').select('data_year'),
      supabase.from('tbk_cultivation_snapshots').select('data_year'),
      supabase.from('large_plots').select('year'),
      supabase.from('crop_production').select('year'),
      supabase.from('production_costs').select('data_year'),
      supabase.from('disasters').select('year'),
    ]);
    return collectYears([
      { rows: results[0].data || [], yearKey: 'data_year' },
      { rows: results[1].data || [], yearKey: 'data_year' },
      { rows: results[2].data || [], yearKey: 'year' },
      { rows: results[3].data || [], yearKey: 'year' },
      { rows: results[4].data || [], yearKey: 'data_year' },
      { rows: results[5].data || [], yearKey: 'year' },
    ]);
  });
  return { years: query.data || [], loading: query.isLoading };
}
```

- [ ] **Step 4: Wire temporary district/year selects in `InteractiveDashboard.jsx` and rerun**

The year select options are:

```js
[
  { label: 'ข้อมูลล่าสุด', value: LATEST_YEAR },
  ...years.map((year) => ({ label: String(year), value: String(year) })),
];
```

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`

Expected: URL-state test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/interactiveDashboard/useInteractiveFilters.js src/pages/InteractiveDashboard.jsx src/__tests__/interactive-dashboard-one-page.test.jsx
git commit -m "feat: persist dashboard filters in URL"
```

---

### Task 3: Native expandable lazy module

**Files:**

- Create: `src/pages/interactiveDashboard/ModuleSection.jsx`
- Create: `src/pages/interactiveDashboard/ModuleSection.test.jsx`

**Interfaces:**

- Produces: `<ModuleSection id title summary status defaultOpen>{children}</ModuleSection>`.
- Uses: native `<details>` for keyboard/accessibility and `IntersectionObserver` only to delay child mounting.

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ModuleSection } from './ModuleSection';

beforeEach(() => {
  global.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback([{ isIntersecting: true }]);
    }
    disconnect() {}
  };
});

it('expands details without navigation', async () => {
  const user = userEvent.setup();
  render(
    <ModuleSection id="groups" title="กลุ่มเกษตรกร" summary="608 กลุ่ม">
      <p>รายละเอียดกลุ่ม</p>
    </ModuleSection>
  );
  await user.click(screen.getByRole('button', { name: 'กลุ่มเกษตรกร' }));
  expect(screen.getByText('รายละเอียดกลุ่ม')).toBeVisible();
  expect(location.pathname).not.toContain('development');
});

it('shows the supplied module status', () => {
  render(
    <ModuleSection id="soil" title="ชุดดิน" status="ข้อมูลล่าสุด">
      <p>ชุดดิน</p>
    </ModuleSection>
  );
  expect(screen.getByText('ข้อมูลล่าสุด')).toBeVisible();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/pages/interactiveDashboard/ModuleSection.test.jsx`

Expected: FAIL because `ModuleSection` does not exist.

- [ ] **Step 3: Implement with `<details>` and one observer**

```jsx
import { useEffect, useRef, useState } from 'react';

export function ModuleSection({
  id,
  title,
  summary,
  status,
  defaultOpen = false,
  children,
}) {
  const rootRef = useRef(null);
  const [nearViewport, setNearViewport] = useState(defaultOpen);

  useEffect(() => {
    if (nearViewport || !rootRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNearViewport(true),
      { rootMargin: '500px 0px' }
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [nearViewport]);

  return (
    <section id={id} ref={rootRef} className="module-section">
      <details open={defaultOpen}>
        <summary aria-label={title}>
          <span>
            <strong>{title}</strong>
            {summary && <small>{summary}</small>}
          </span>
          {status && <span className="module-status">{status}</span>}
        </summary>
        <div className="module-section-body">
          {nearViewport ? children : <div className="module-skeleton" />}
        </div>
      </details>
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/pages/interactiveDashboard/ModuleSection.test.jsx`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/interactiveDashboard/ModuleSection.jsx src/pages/interactiveDashboard/ModuleSection.test.jsx
git commit -m "feat: add lazy dashboard module section"
```

---

### Task 4: Make existing group dashboards embeddable and filter-aware

**Files:**

- Modify: `src/hooks/useProductionData.js`
- Modify: `src/hooks/useDevelopmentData.js`
- Modify: `src/hooks/useProtectionData.js`
- Modify: `src/pages/strategy/StrategyDashboard.jsx`
- Modify: `src/pages/production/ProductionDashboard.jsx`
- Modify: `src/pages/development/DevelopmentDashboard.jsx`
- Modify: `src/pages/protection/ProtectionDashboard.jsx`
- Test: `src/__tests__/interactive-dashboard-one-page.test.jsx`

**Interfaces:**

- All hooks accept `filters = { district: 'ทั้งหมด', year: 'latest' }`.
- All group dashboards accept `embedded = false` and `filters`.
- Embedded dashboards omit `PageHeader` but keep their cards and charts.
- Hook return values add `error`, `refetch`, and `yearSupported`.

- [ ] **Step 1: Add failing hook/component expectations**

```jsx
it('passes the same filters to every public group module', async () => {
  renderDashboard('/interactive-dashboard?district=บางเลน&year=2569');
  await userEvent.click(await screen.findByRole('button', { name: 'การผลิต' }));
  expect(mockUseProductionData).toHaveBeenCalledWith({
    district: 'บางเลน',
    year: '2569',
  });
  expect(mockUseDevelopmentData).toHaveBeenCalledWith({
    district: 'บางเลน',
    year: '2569',
  });
  expect(mockUseProtectionData).toHaveBeenCalledWith({
    district: 'บางเลน',
    year: '2569',
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`

Expected: FAIL because hooks currently accept no filters.

- [ ] **Step 3: Filter fetched rows before existing memoized selectors**

Use the same pattern in all three hooks:

```js
export function useProductionData(filters = {}) {
  // keep the existing query and include `year` for large_plots and crop_production
  const visibleLargePlots = useMemo(
    () => filterRows(largePlots, filters, { yearKey: 'year' }),
    [largePlots, filters]
  );
  const visibleCerts = useMemo(
    () =>
      filterRows(certs, filters, {
        districtKey: 'plot_district',
        yearKey: null,
      }),
    [certs, filters]
  );
  const visibleCrops = useMemo(
    () => filterRows(crops, filters, { yearKey: 'year' }),
    [crops, filters]
  );
  // replace downstream largePlots/certs/crops reads with visible arrays
}
```

For development tables, map each table to its actual year key:

```js
const visibleSf = filterRows(sfData, filters, { yearKey: 'data_year' });
const visibleYsf = filterRows(ysfData, filters, { yearKey: 'data_year' });
const visibleCareer = filterRows(careerData, filters, { yearKey: 'data_year' });
const visibleHousewife = filterRows(housewifeData, filters, {
  yearKey: 'year',
});
const visibleYoung = filterRows(youngGroupData, filters, {
  yearKey: 'data_year',
});
const visibleDisasters = filterRows(disasterData, filters, { yearKey: 'year' });
```

Protection tables currently have no report-year contract. Apply district only and return `yearSupported: false`; do not filter establishment-year fields as if they were observation years.

- [ ] **Step 4: Add `embedded` rendering to each group dashboard**

```jsx
export default function ProductionDashboard({
  embedded = false,
  filters = {},
}) {
  const {
    loading,
    error,
    refetch,
    lpPie,
    lpBar,
    lpGroups,
    lpStats,
    certPie,
    certBar,
    certGroups,
    certVolumeData,
    certExpireData,
    certStats,
    cropBar,
    cropStats,
  } = useProductionData(filters);

  return (
    <div className={embedded ? 'embedded-dashboard' : undefined}>
      {!embedded && (
        <PageHeader
          title="🌱 ส่งเสริมและพัฒนาการผลิต"
          subtitle="ภาพรวมข้อมูลแปลงใหญ่ มาตรฐาน GAP และผลผลิตพืช"
          icon={PieChartOutlined}
        />
      )}
      {error ? (
        <Result
          status="warning"
          title="โหลดข้อมูลการผลิตไม่สำเร็จ"
          subTitle={error.message}
          extra={<Button onClick={refetch}>ลองใหม่</Button>}
        />
      ) : loading ? (
        <Spin />
      ) : (
        <ProductionDashboardContent
          lpPie={lpPie}
          lpBar={lpBar}
          lpGroups={lpGroups}
          lpStats={lpStats}
          certPie={certPie}
          certBar={certBar}
          certGroups={certGroups}
          certVolumeData={certVolumeData}
          certExpireData={certExpireData}
          certStats={certStats}
          cropBar={cropBar}
          cropStats={cropStats}
        />
      )}
    </div>
  );
}
```

Extract the current post-loading cards/charts JSX without changing it into the file-local `ProductionDashboardContent` function shown above. Apply the same prop contract and file-local content extraction to strategy, development, and protection. In `StrategyDashboard`, filter the fetched row arrays before its existing summary `useMemo` blocks; use `data_year` for farmer registry, `year` for parcel progress when present, and district-only/latest labels for weather, prices, agricultural area, and learning centers.

- [ ] **Step 5: Expose isolated errors**

Destructure React Query’s `error` and `refetch` in each hook. Render an inline `Result` with retry in each embedded dashboard instead of throwing.

- [ ] **Step 6: Run focused and existing dashboard tests**

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx src/__tests__/system-health.test.js src/__tests__/tbk-cultivation-page.test.jsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useProductionData.js src/hooks/useDevelopmentData.js src/hooks/useProtectionData.js src/pages/strategy/StrategyDashboard.jsx src/pages/production/ProductionDashboard.jsx src/pages/development/DevelopmentDashboard.jsx src/pages/protection/ProtectionDashboard.jsx src/__tests__/interactive-dashboard-one-page.test.jsx
git commit -m "feat: filter embedded group dashboards"
```

---

### Task 5: Add public datasets missing from group overview dashboards

**Files:**

- Create: `src/hooks/useInteractiveExtrasData.js`
- Create: `src/pages/interactiveDashboard/ExtrasSection.jsx`
- Test: `src/__tests__/interactive-dashboard-one-page.test.jsx`

**Interfaces:**

- Produces: `useInteractiveExtrasData(filters, { enabled })`.
- Returns `{ loading, error, refetch, tbk, rice, costs, forecast, soils }`.
- `enabled` prevents Supabase requests before the module approaches the viewport.

- [ ] **Step 1: Add a failing extras summary test**

```jsx
it('shows TBK, rice, cost, AI, and soil summaries inside the page', async () => {
  renderDashboard('/interactive-dashboard?district=บางเลน&year=2569');
  await userEvent.click(
    await screen.findByRole('button', { name: 'ข้อมูลเพิ่มเติม' })
  );
  expect(await screen.findByText('พื้นที่ตาม ทบก.')).toBeVisible();
  expect(screen.getByText('สถานการณ์เก็บเกี่ยวข้าว')).toBeVisible();
  expect(screen.getByText('ต้นทุนการผลิต')).toBeVisible();
  expect(screen.getByText('โรคและแมลง AI')).toBeVisible();
  expect(screen.getByText('ชุดดิน')).toBeVisible();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`

Expected: FAIL because the extras section is absent.

- [ ] **Step 3: Query only fields required for summaries**

```js
export function useInteractiveExtrasData(filters, { enabled = true } = {}) {
  const query = useApiCache(
    ['interactive-extras', filters.district, filters.year],
    async () => {
      const [tbk, rice, costs, forecast, soils] = await Promise.all([
        supabase
          .from('tbk_cultivation_snapshots')
          .select(
            'data_year,snapshot_date,location_name,area_rai,household_count,plot_count'
          )
          .order('snapshot_date', { ascending: false }),
        supabase
          .from('rice_harvest_snapshots')
          .select(
            'snapshot_date,crop_year,district,household_count,plot_count,area_rai,estimated_tons'
          )
          .order('snapshot_date', { ascending: false }),
        supabase
          .from('production_costs')
          .select('data_year,crop_name,total_cost_baht,revenue_baht_per_rai')
          .order('data_year', { ascending: false }),
        supabase
          .from('ai_disease_forecasts')
          .select('forecast_date,details')
          .order('forecast_date', { ascending: false })
          .limit(1),
        supabase
          .from('soil_series')
          .select('district,soil_series_name,soil_group,area_rai'),
      ]);
      const firstError = [tbk, rice, costs, forecast, soils].find(
        (result) => result.error
      )?.error;
      if (firstError) throw firstError;
      return summarizeExtras(
        {
          tbk: tbk.data || [],
          rice: rice.data || [],
          costs: costs.data || [],
          forecast: forecast.data?.[0] || null,
          soils: soils.data || [],
        },
        filters
      );
    },
    { enabled }
  );
  return {
    ...(query.data || {}),
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
```

Keep `summarizeExtras` pure in the same file. It must:

- Select the newest snapshot within the chosen TBK year.
- Match TBK `location_name` to the selected district.
- Match a rice `crop_year` such as `2568/69` when the selected year equals either Buddhist year represented by that crop-year label, then select its newest snapshot and district.
- Sum rice households, plots, rai, and estimated tons.
- Filter production costs by `data_year`.
- Treat AI forecast and soil series as district/latest-only data and label them `ข้อมูลล่าสุด`.
- Return `null` values for unavailable metrics; never turn failed/missing data into zero.

- [ ] **Step 4: Render five compact accessible summary cards**

`ExtrasSection.jsx` uses existing `CategoryBentoCard`, `CategoryChartCard`, and chart option helpers. Each card includes its source year/date status. Use semantic `<h3>` headings and text equivalents for chart values.

- [ ] **Step 5: Run the focused test**

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`

Expected: extras summary test PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useInteractiveExtrasData.js src/pages/interactiveDashboard/ExtrasSection.jsx src/__tests__/interactive-dashboard-one-page.test.jsx
git commit -m "feat: add remaining public dashboard summaries"
```

---

### Task 6: Assemble the SaaS Module Stream

**Files:**

- Modify: `src/pages/InteractiveDashboard.jsx`
- Modify: `src/pages/InteractiveDashboard.css`
- Test: `src/__tests__/interactive-dashboard-one-page.test.jsx`

**Interfaces:**

- Consumes: URL filters, `ModuleSection`, embedded group dashboards, extras.
- Produces: final `/interactive-dashboard` page.

- [ ] **Step 1: Add failing navigation and expansion assertions**

```jsx
it('renders sticky module navigation and keeps expansion on one route', async () => {
  renderDashboard('/interactive-dashboard');
  expect(screen.getByRole('navigation', { name: 'หมวดข้อมูล' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'พื้นที่' })).toHaveAttribute(
    'href',
    '#land'
  );
  await userEvent.click(screen.getByRole('button', { name: 'กลุ่มเกษตรกร' }));
  expect(location.pathname).toBe('/interactive-dashboard');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`

Expected: FAIL because module navigation is absent.

- [ ] **Step 3: Replace the page body with the approved module order**

```jsx
const MODULES = [
  ['overview', 'ภาพรวม'],
  ['land', 'พื้นที่'],
  ['production', 'ผลผลิต'],
  ['groups', 'กลุ่ม'],
  ['networks', 'ศูนย์/เครือข่าย'],
  ['risk', 'ความเสี่ยง'],
  ['extras', 'ข้อมูลเพิ่มเติม'],
];
```

Render:

1. SaaS top bar with district/year selects and print.
2. Sticky `<nav aria-label="หมวดข้อมูล">`.
3. Existing overview metrics, key charts, and the existing `LandingMap` using `mapData` and `districtStats` from `useDashboardData`.
4. `StrategyDashboard embedded filters={filters}` in `#land`.
5. `ProductionDashboard embedded filters={filters}` in `#production`.
6. `DevelopmentDashboard embedded filters={filters}` in `#groups`.
7. Development network cards plus protection centers in `#networks`.
8. `ProtectionDashboard embedded filters={filters}` in `#risk`.
9. `ExtrasSection filters={filters}` in `#extras`.

Memoize the shared prop once so hook memoization remains stable:

```js
const filters = useMemo(() => ({ district, year }), [district, year]);
```

Filter map markers before passing them to `LandingMap`:

```js
const visibleMapData = useMemo(
  () =>
    district === 'ทั้งหมด'
      ? mapData
      : mapData.filter((point) => point.district === district),
  [district, mapData]
);
```

Track the active navigation item with one `IntersectionObserver` created in `InteractiveDashboard`. Observe the seven module section IDs, update `activeModule` from the intersecting entry nearest the top, and set `aria-current="location"` on its navigation link.

Remove metric-card route navigation. Metric cards scroll to their owning section:

```js
const scrollToModule = (id) =>
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
```

- [ ] **Step 4: Add only the required CSS**

Implement:

- `.dashboard-module-nav`: sticky below top bar, horizontal overflow on mobile.
- `.dashboard-module-nav a[aria-current='location']`: active SaaS-tab treatment.
- `.module-section details` and `.module-section summary`: SaaS card shell and visible focus.
- `.module-status`: latest/error/source label.
- `.module-skeleton`: fixed-height loading placeholder.
- `.embedded-dashboard`: removes duplicate outer margins/header.
- `@media (max-width: 768px)`: one-column cards and compact top bar.
- `@media print`: hide controls/nav, force mounted summary blocks visible, show active filter text and generation time.
- `@media (prefers-reduced-motion: reduce)`: disable smooth transitions and warning animation.

- [ ] **Step 5: Run the focused test and lint**

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`

Expected: PASS.

Run: `npm run lint:src`

Expected: PASS with zero warnings.

- [ ] **Step 6: Commit**

```bash
git add src/pages/InteractiveDashboard.jsx src/pages/InteractiveDashboard.css src/__tests__/interactive-dashboard-one-page.test.jsx
git commit -m "feat: build one-page agricultural module stream"
```

---

### Task 7: Isolated failure, print, and full verification

**Files:**

- Modify: `src/__tests__/interactive-dashboard-one-page.test.jsx`
- Modify only if a failure exposes a defect: files changed in Tasks 1–6.

**Interfaces:**

- Verifies all acceptance criteria without adding another abstraction.

- [ ] **Step 1: Add the isolated failure test**

```jsx
it('keeps other modules usable when one module fails', async () => {
  mockUseProductionData.mockReturnValue({
    loading: false,
    error: new Error('production unavailable'),
    refetch: vi.fn(),
  });
  renderDashboard('/interactive-dashboard');
  expect(await screen.findByText('production unavailable')).toBeVisible();
  expect(screen.getByRole('button', { name: 'กลุ่มเกษตรกร' })).toBeEnabled();
  expect(screen.getByText('37,822')).toBeVisible();
});
```

- [ ] **Step 2: Run the integration test**

Run: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx`

Expected: PASS.

- [ ] **Step 3: Run the complete test suite**

Run: `npm test`

Expected: all existing and new tests PASS; current intentional skips remain skipped.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Vite build exits 0 with no unresolved import or chunk error.

- [ ] **Step 5: Verify desktop and mobile in a browser**

Run: `npm run dev`

Check:

- Desktop: sticky filters and section nav do not overlap.
- Mobile 390×844: section nav scrolls horizontally; cards are one column.
- Changing district/year updates URL and supported modules.
- Unsupported modules show `ข้อมูลล่าสุด`.
- Opening every module stays on `/interactive-dashboard`.
- One failed Supabase query leaves other modules visible.
- Keyboard Tab reaches filters, section links, and every summary control.
- Print preview includes selected filters and module summaries but hides controls.

- [ ] **Step 6: Commit verification fixes, if any**

```bash
git add src
git commit -m "test: verify one-page interactive dashboard"
```

Skip this commit when verification requires no code change.
