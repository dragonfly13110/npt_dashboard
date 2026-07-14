# Task 5 report — safe partial extraction

## Completed

- `src/pages/SmartMap.jsx` remains a route wrapper.
- `SmartMapPage` is now the feature entry point and wraps the map screen in the existing application `ErrorBoundary`.
- Moved the legacy implementation to `components/SmartMapScreen.jsx` and corrected its feature-relative imports.
- Extracted the search, navigation and mobile-layer-toggle UI into `components/SmartMapHeader.jsx` without changing CSS classes or handlers.
- Added `MapLayerErrorBoundary` and use it for the soil and marker layers so a failing layer returns `null` instead of taking down the map.
- Added a focused regression test proving a failed layer leaves its map sibling rendered.

## Verification

- `npm run lint:src` — passed
- `npm run build` — passed
- `npm test -- src/features/smart-map/__tests__/MapLayerErrorBoundary.test.jsx` — passed

## Remaining work / concern

`SmartMapScreen.jsx` is still the legacy monolith (about 2.5k lines). Safely splitting its map canvas, area drawer, comparison dialog and what-if/AI panel requires a larger JSX move with a browser regression pass. It is deliberately not claimed complete: a mechanical rewrite here would be riskier than the verified boundary and entry-point extraction above.
