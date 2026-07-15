# Balanced Flood Dashboard Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the tall flood map in the left half and stack both existing charts in the right half without changing data behavior.

**Architecture:** Recompose the existing Ant Design cards into one responsive `Row`. Reuse `FloodMap` and both `EChart` instances; only their placement and chart-body heights change.

**Tech Stack:** React 19, Ant Design `Row`/`Col`/`Card`, ECharts, React Leaflet.

## Global Constraints

- Desktop uses a `12/24` map column and a `12/24` chart column.
- Tablet/mobile stack map, bar chart, and donut chart at full width.
- Desktop map height remains `680px`; each right-side chart body uses `280px`.
- Flood data, filters, calculations, map points, table, and exports do not change.
- Add no dependency or layout abstraction.

---

### Task 1: Compose the split dashboard

**Files:**

- Modify: `src/pages/strategy/Disasters.jsx`
- Verify: `src/__tests__/flood-data.test.js`

**Interfaces:**

- Consumes: `FloodMap({ points })`, `EChart({ option })`, `mapPoints`, `byYear`, and `byDistrict`.
- Produces: responsive visual order `map -> yearly chart -> district chart` without changing component props.

- [x] **Step 1: Replace the separate chart and map rows**

Use one outer row and put the existing map card first:

```jsx
<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
  <Col xs={24} xl={12}>
    <Card title={mapTitle} style={{ borderRadius: 8 }}>
      <FloodMap points={mapPoints} />
    </Card>
  </Col>
  <Col xs={24} xl={12}>
    <Row gutter={[16, 16]}>
      <Col span={24}>{yearlyChartCard}</Col>
      <Col span={24}>{districtChartCard}</Col>
    </Row>
  </Col>
</Row>
```

- [x] **Step 2: Balance chart heights**

Set both existing chart-body wrappers to `280px`:

```jsx
<div style={{ height: 280 }}>
  <EChart option={existingOption} />
</div>
```

Keep the map height at `680px` in `src/components/Map/FloodMap.jsx`.

- [x] **Step 3: Format and verify**

Run:

```powershell
npx.cmd prettier --write src/pages/strategy/Disasters.jsx
npx.cmd eslint src/pages/strategy/Disasters.jsx src/components/Map/FloodMap.jsx
npm.cmd test -- --run src/__tests__/flood-data.test.js
npm.cmd run build
```

Expected: formatting completes, ESLint exits `0`, 3 flood-data tests pass, and Vite build exits `0`.

- [x] **Step 4: Inspect the running dev page**

Open `http://127.0.0.1:5173/dashboard/development/disasters` and verify desktop has no empty right half, the map is left, charts are stacked right, and narrow screens stack all three cards.
