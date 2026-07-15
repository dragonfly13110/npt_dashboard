# Flood Map Year Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add half-level zoom controls and independently toggleable, initially visible flood-point layers for each available year.

**Architecture:** Add one deterministic grouping helper beside the existing flood-data helpers. Reuse React Leaflet's native `LayersControl`, `Overlay`, and `LayerGroup` components in `FloodMap`; no custom controls or dependency changes.

**Tech Stack:** React 19, React Leaflet 5, Leaflet 1.9, Vitest

## Global Constraints

- Every available year is visible when the map opens.
- Initial view fits the province bounds with `20px` padding and maximum zoom `10.5`.
- `+` and `-` zoom by `0.5` levels.
- District boundaries remain always visible.
- Existing filters, marker styling, popups, counts, and map height remain unchanged.
- Add no dependency or custom layer-control UI.

---

### Task 1: Group points and render native year overlays

**Files:**

- Modify: `src/utils/floodData.js`
- Modify: `src/__tests__/flood-data.test.js`
- Modify: `src/components/Map/FloodMap.jsx`

**Interfaces:**

- Consumes: flood map points with numeric `year`, `id`, `lat`, and `lng` fields.
- Produces: `groupPointsByYear(points) -> Array<[year, points]>`, ordered by ascending year.

- [x] **Step 1: Write the failing grouping test**

Import `groupPointsByYear` and add:

```js
it('groups map points into ascending year layers', () => {
  const grouped = groupPointsByYear([
    { id: 3, year: 2568 },
    { id: 1, year: 2563 },
    { id: 2, year: 2568 },
  ]);
  expect(grouped.map(([year]) => year)).toEqual([2563, 2568]);
  expect(grouped[1][1].map(({ id }) => id)).toEqual([3, 2]);
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `npm.cmd test -- --run src/__tests__/flood-data.test.js`

Expected: FAIL because `groupPointsByYear` is not exported.

- [x] **Step 3: Add the minimal grouping helper**

```js
export const groupPointsByYear = (points) =>
  [...Map.groupBy(points, ({ year }) => year)].sort(([a], [b]) => a - b);
```

- [x] **Step 4: Run the test and verify GREEN**

Run: `npm.cmd test -- --run src/__tests__/flood-data.test.js`

Expected: 4 tests pass.

- [x] **Step 5: Render points inside checked year overlays**

Import `groupPointsByYear`. Destructure `LayersControl` and `LayerGroup` from the loaded React Leaflet module. Add `zoomDelta={0.5}` and `zoomSnap={0.5}` to `MapContainer`. Replace the flat marker map with:

```jsx
<LayersControl position="topright">
  {groupPointsByYear(points).map(([year, yearPoints]) => (
    <LayersControl.Overlay checked key={year} name={`ปี ${year}`}>
      <LayerGroup>{yearPoints.map(renderExistingCircleMarker)}</LayerGroup>
    </LayersControl.Overlay>
  ))}
</LayersControl>
```

Keep the existing marker props and popup body unchanged; inline the current marker JSX instead of introducing `renderExistingCircleMarker`.

- [x] **Step 6: Format and verify**

```powershell
npx.cmd prettier --write src/utils/floodData.js src/__tests__/flood-data.test.js src/components/Map/FloodMap.jsx
npx.cmd eslint src/utils/floodData.js src/__tests__/flood-data.test.js src/components/Map/FloodMap.jsx
npm.cmd test -- --run src/__tests__/flood-data.test.js
npm.cmd run build
```

Expected: formatting and lint exit `0`, 4 tests pass, and Vite build exits `0`.

- [x] **Step 7: Inspect the running dashboard**

Open `http://127.0.0.1:5173/dashboard/development/disasters`. Verify every year starts checked, one year can be hidden without hiding the others, and each zoom button changes the zoom by half a level.

- [x] **Step 8: Commit**

```powershell
git add src/utils/floodData.js src/__tests__/flood-data.test.js src/components/Map/FloodMap.jsx docs/superpowers/plans/2026-07-15-flood-map-year-layers.md
git commit -m "Add flood map year layers"
```

### Task 2: Increase the initial zoom

**Files:**

- Modify: `src/components/Map/FloodMap.jsx`

**Interfaces:**

- Consumes: Leaflet `MapContainer` zoom configuration.
- Produces: an initial map zoom of `10.5` while preserving `0.5` zoom increments.

- [x] **Step 1: Change the initial zoom**

```jsx
<MapContainer zoom={10.5} zoomDelta={0.5} zoomSnap={0.5}>
```

- [x] **Step 2: Verify**

Run:

```powershell
npx.cmd prettier --write src/components/Map/FloodMap.jsx docs/superpowers/plans/2026-07-15-flood-map-year-layers.md
npx.cmd eslint src/components/Map/FloodMap.jsx
npm.cmd run build
```

Expected: formatting, lint, and Vite build exit `0`.

- [x] **Step 3: Inspect the running dashboard**

Open `http://127.0.0.1:5173/dashboard/development/disasters`. Verify the initial view starts half a level closer and still shows Nakhon Pathom.

- [x] **Step 4: Commit**

```powershell
git add src/components/Map/FloodMap.jsx docs/superpowers/plans/2026-07-15-flood-map-year-layers.md
git commit -m "Increase initial flood map zoom"
```

### Task 3: Fit the initial view to the province

**Files:**

- Modify: `src/utils/floodData.js`
- Modify: `src/components/Map/FloodMap.jsx`

**Interfaces:**

- Consumes: `NAKHON_PATHOM_BOUNDS` with `minLat`, `maxLat`, `minLng`, and `maxLng`.
- Produces: a Leaflet bounds array that keeps the complete province visible initially.

- [x] **Step 1: Export and reuse the existing bounds**

Export `NAKHON_PATHOM_BOUNDS` from `src/utils/floodData.js`. Import it in `FloodMap.jsx`, then replace `center` and `zoom` with:

```jsx
bounds={[
  [NAKHON_PATHOM_BOUNDS.minLat, NAKHON_PATHOM_BOUNDS.minLng],
  [NAKHON_PATHOM_BOUNDS.maxLat, NAKHON_PATHOM_BOUNDS.maxLng],
]}
boundsOptions={{ padding: [20, 20], maxZoom: 10.5 }}
```

- [x] **Step 2: Format and verify**

```powershell
npx.cmd prettier --write src/utils/floodData.js src/components/Map/FloodMap.jsx docs/superpowers/plans/2026-07-15-flood-map-year-layers.md
npx.cmd eslint src/utils/floodData.js src/components/Map/FloodMap.jsx
npm.cmd test -- --run src/__tests__/flood-data.test.js
npm.cmd run build
```

Expected: lint and build exit `0`; 4 flood-data tests pass.

- [x] **Step 3: Inspect the running dashboard**

Open `http://127.0.0.1:5173/dashboard/development/disasters` and verify all province boundaries are visible with padding.

- [x] **Step 4: Commit**

```powershell
git add src/utils/floodData.js src/components/Map/FloodMap.jsx docs/superpowers/plans/2026-07-15-flood-map-year-layers.md
git commit -m "Fit flood map to province bounds"
```
