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
