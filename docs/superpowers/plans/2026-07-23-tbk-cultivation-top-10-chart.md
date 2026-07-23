# TBK Cultivation Top 10 Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive horizontal bar chart showing the ten crop types or varieties with the largest cultivated area after applying the page's current filters.

**Architecture:** Aggregate visible rows in the existing TBK utility module, then pass the ranked result to the existing shared `EChart` component from the page. Keep the existing table as the complete-data and non-chart fallback; add no dependency or new component.

**Tech Stack:** React 19, Ant Design 6, ECharts 6, Vitest

## Global Constraints

- Use the existing `EChart` component and installed ECharts dependency.
- Aggregate `areaRai` by `itemBreed`, sort descending, and display at most 10 items.
- Use the same filtered rows as the summary cards and table.
- Show rai values directly on bars and in the tooltip.
- Keep the chart readable on mobile and retain the table as the full-data fallback.
- Do not add a dependency or create a new component file.

---

### Task 1: Add the filtered Top 10 cultivation chart

**Files:**
- Modify: `src/utils/tbkCultivation.js:118`
- Modify: `src/pages/strategy/TbkCultivationArea.jsx:18-31,210-214,457-465`
- Test: `src/__tests__/tbk-cultivation.test.js:1-82`

**Interfaces:**
- Consumes: normalized TBK rows shaped as `{ itemBreed: string, areaRai: number }[]`
- Produces: `topTbkCultivationItems(rows, limit = 10) -> { itemBreed: string, areaRai: number }[]`
- Produces: an ECharts horizontal bar option derived from the filtered Top 10 result

- [ ] **Step 1: Write the failing aggregation test**

Add `topTbkCultivationItems` to the existing import and test duplicate aggregation, descending order, and the limit:

```js
import {
  filterTbkCultivationRows,
  parseTbkCultivationTable,
  summarizeTbkCultivationRows,
  topTbkCultivationItems,
  validateTbkCultivationRows,
} from '../utils/tbkCultivation';

it('aggregates and ranks the largest cultivated areas', () => {
  const rows = [
    { itemBreed: 'ข้าว กข41', areaRai: 30 },
    { itemBreed: 'ข้าว กข43', areaRai: 20 },
    { itemBreed: 'ข้าว กข41', areaRai: 15 },
  ];

  expect(topTbkCultivationItems(rows, 1)).toEqual([
    { itemBreed: 'ข้าว กข41', areaRai: 45 },
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npx vitest run src/__tests__/tbk-cultivation.test.js
```

Expected: FAIL because `topTbkCultivationItems` is not exported.

- [ ] **Step 3: Add the minimal shared aggregation**

Append this function to `src/utils/tbkCultivation.js`:

```js
export function topTbkCultivationItems(rows, limit = 10) {
  const totals = new Map();
  for (const row of rows) {
    totals.set(row.itemBreed, (totals.get(row.itemBreed) || 0) + row.areaRai);
  }
  return [...totals]
    .map(([itemBreed, areaRai]) => ({ itemBreed, areaRai }))
    .sort(
      (a, b) =>
        b.areaRai - a.areaRai ||
        a.itemBreed.localeCompare(b.itemBreed, 'th')
    )
    .slice(0, limit);
}
```

- [ ] **Step 4: Run the focused utility test and verify it passes**

Run:

```bash
npx vitest run src/__tests__/tbk-cultivation.test.js
```

Expected: all tests in `tbk-cultivation.test.js` PASS.

- [ ] **Step 5: Render the responsive horizontal bar chart**

Add imports to `src/pages/strategy/TbkCultivationArea.jsx`:

```jsx
import { BarChartOutlined, DatabaseOutlined, DownloadOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import {
  filterTbkCultivationRows,
  summarizeTbkCultivationRows,
  topTbkCultivationItems,
} from '../../utils/tbkCultivation';
```

Add the chart option above the page component:

```jsx
function cultivationChartOption(items) {
  return {
    aria: {
      enabled: true,
      description: 'กราฟ 10 ชนิดหรือพันธุ์ที่มีพื้นที่เพาะปลูกมากที่สุด',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => `${formatDecimal(value)} ไร่`,
    },
    grid: { left: 16, right: 96, top: 16, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (value) => formatInteger(value) },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map((item) => item.itemBreed),
      axisLabel: { width: 220, overflow: 'truncate' },
    },
    series: [
      {
        name: 'พื้นที่เพาะปลูก',
        type: 'bar',
        barMaxWidth: 30,
        data: items.map((item) => Number(item.areaRai.toFixed(2))),
        label: {
          show: true,
          position: 'right',
          formatter: ({ value }) => formatDecimal(value),
        },
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#15803d' },
              { offset: 1, color: '#4ade80' },
            ],
          },
        },
      },
    ],
  };
}
```

Derive chart data next to the existing summary:

```jsx
const chartItems = useMemo(
  () => topTbkCultivationItems(filteredRows),
  [filteredRows]
);
```

Place the chart after the summary cards and before the informational alert:

```jsx
<Card
  title={
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <BarChartOutlined style={{ color: '#15803d' }} />
      10 ชนิด/พันธุ์ที่มีพื้นที่เพาะปลูกมากที่สุด
    </span>
  }
  extra={<Tag color="green">หน่วย: ไร่</Tag>}
  style={{ marginBottom: 16 }}
  styles={{
    header: {
      background: 'linear-gradient(90deg, #f0fdf4, #ffffff)',
      borderBottomColor: '#bbf7d0',
    },
  }}
>
  {chartItems.length ? (
    <EChart
      option={cultivationChartOption(chartItems)}
      style={{ height: Math.max(320, chartItems.length * 48) }}
    />
  ) : (
    <Empty description="ไม่พบข้อมูลสำหรับสร้างกราฟ" />
  )}
</Card>
```

- [ ] **Step 6: Run focused page and utility tests**

Run:

```bash
npx vitest run src/__tests__/tbk-cultivation.test.js src/__tests__/tbk-cultivation-page.test.jsx
```

Expected: both test files PASS.

- [ ] **Step 7: Run lint and production build**

Run:

```bash
npm run lint:src
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit only chart-related files**

```bash
git add src/utils/tbkCultivation.js src/pages/strategy/TbkCultivationArea.jsx src/__tests__/tbk-cultivation.test.js
git commit -m "feat: add TBK cultivation top 10 chart"
```

- [ ] **Step 9: Start the development server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL and the TBK cultivation page loads with the chart.
