# Flood Map Year Layers Design

## Goal

Make map zoom controls move in smaller increments and let users independently show or hide flood points for each year.

## Design

- Keep all available years visible when the map first opens.
- Start the map at zoom `10.5` so Nakhon Pathom fills more of the viewport.
- Set Leaflet `zoomDelta` and `zoomSnap` to `0.5`, so the `+` and `-` controls zoom half a level per click.
- Group the existing point markers by `point.year`.
- Render each year as a checked `LayersControl.Overlay`, ordered ascending by year.
- Keep the OpenStreetMap base layer and Nakhon Pathom district boundaries always visible.
- Preserve the existing page filters, marker styling, popup content, point counts, and map height.
- Use existing React Leaflet components only; add no dependency or custom layer-control UI.

## Empty and Filtered States

- If no valid points remain after page filters, keep the existing empty state.
- When page filters leave only some years, show controls only for years present in the filtered point set.

## Verification

- Add a small test for deterministic year grouping and ascending year order.
- Verify all year overlays start enabled and can be toggled independently.
- Verify zoom configuration uses half-level increments.
- Run the targeted tests, lint, build, and inspect the running dashboard.
