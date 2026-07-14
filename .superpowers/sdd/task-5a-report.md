# Task 5a report

## Status

Complete. `SmartMapPage` is now named `SmartMapScreen`, matching its file and role. The layer boundary has a regression test confirming a `null` fallback still renders the visible status message.

## Extraction update

`SmartMapCanvas.jsx` now owns the Leaflet canvas only: map controls, base tiles, district layers, soil, subdistricts, labels, and point markers. `SmartMapScreen` passes its state and handlers explicitly and retains all fetches and panels.

The choropleth, district boundary, soil, subdistrict, and each point layer are independently wrapped in `MapLayerErrorBoundary`. A focused canvas test makes the choropleth throw and verifies the district outline remains rendered with a visible error status.

## Verification

- `npm run lint:src`
- `npm test -- src/features/smart-map/__tests__/MapLayerErrorBoundary.test.jsx` (2 tests)
- `npm test` (330 passed, 17 skipped)
- `npm run build`

No remaining extraction blocker.

## Review fixes

- Failed Leaflet layers now render their visible status inside a dedicated React Leaflet `Pane`, so the notice overlays the map instead of becoming an ordinary map child.
- District label `Polyline` and `Marker` rendering now has its own boundary.
- `MapLayerErrorBoundary` retries after its `resetOn` identity changes; canvas layers pass their relevant data and visibility inputs.

Focused coverage now verifies both pane-based layer isolation and reset recovery. Full verification: 332 passed, 17 skipped; lint and build pass.
