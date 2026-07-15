# Balanced Flood Dashboard Layout

## Goal

Remove the empty right half beside the flood map while keeping the map tall enough to show Nakhon Pathom clearly.

## Approved Layout

- Keep filters and four KPI cards unchanged at the top.
- Use one responsive Ant Design `Row` below the KPI cards.
- Desktop: map card in the left `12/24` columns; yearly bar chart and district donut chart stacked in the right `12/24` columns.
- Match the combined height of the two right-side chart cards to the map card as closely as practical.
- Tablet and mobile: stack the map first, then the bar chart, then the donut chart at full width.
- Keep the flood data, filters, KPI calculations, map points, chart values, table, and exports unchanged.

## Sizing

- Desktop map height: approximately 640–680px.
- Desktop chart body height: approximately 270–290px each, with a 16px gap.
- Mobile map height may reduce to approximately 440–480px if required for usability.

## Implementation Boundaries

- Reuse existing `Row`, `Col`, `Card`, `EChart`, and `FloodMap` components.
- Add no dependency or layout abstraction.
- Change only `Disasters.jsx` and, if responsive map height requires it, `FloodMap.jsx`.

## Verification

- Desktop has no unused half-width area beside the map.
- Map occupies the left half and remains visibly taller than either chart.
- Two chart cards fill the right half without clipping labels or legends.
- Mobile layout remains single-column.
- Existing flood data tests, ESLint, and production build pass.
