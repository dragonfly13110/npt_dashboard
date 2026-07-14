# Farmer KPI grid

## Goal

Replace the single farmer-development summary card with seven category KPI cards and place the tourism KPI beside the final card.

## Layout

- Desktop: three equal cards per row for the first six farmer categories.
- Final row: the seventh farmer card and tourism card each occupy half the row.
- Mobile: one card per row.
- Keep the existing landing-page section width, spacing, colors, focus states, and modal shells.

## Cards

- Render one KPI for each existing `INSTITUTE_V2_TYPES` entry: large plots, community enterprises, housewife farmer groups, young farmer groups, agricultural career groups, Smart Farmer, and Young Smart Farmer.
- Each card shows category label, record count, and a short category-appropriate secondary value already derivable from loaded rows.
- Reuse the existing farmer widget data request; do not add queries or dependencies.
- Loading/error states remain visible without hiding cards.

## Interaction

- Clicking a farmer KPI opens the existing farmer modal with that category selected.
- Clicking tourism opens the existing tourism modal.
- Filters and detail behavior inside both modals remain unchanged.

## Verification

- One focused component check covers seven farmer cards and category selection callback.
- Existing focused tourism and farmer checks remain valid.

