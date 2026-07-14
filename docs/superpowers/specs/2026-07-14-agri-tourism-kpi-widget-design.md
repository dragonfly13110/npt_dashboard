# Agri-tourism KPI widget

## Goal

Replace the expandable tourism card on the landing page with a compact KPI widget that opens a detailed modal, matching the existing farmer-institutes interaction and visual language.

## Summary widget

- Display the title `แหล่งท่องเที่ยว` and three values derived from the existing `agri_tourism` data: total places, districts represented, and tourism types represented.
- Make the whole widget keyboard- and pointer-accessible.
- Open the tourism detail modal when activated.
- Keep the widget compact; do not render the place list inline on the landing page.

## Detail modal

- Reuse the landing page's existing Ant Design modal pattern and dimensions used by the farmer-institutes widget.
- Show a tourism heading, total count, district filter, text search, and reset action.
- Show KPI cards for total places, districts, and tourism types.
- List matching places with name, district/subdistrict, type, contact details when present, and a clear empty/loading state.
- Keep the existing `/public/agri-tourism` route as the full-table destination.

## Data and implementation boundaries

- Use the existing `agri_tourism` records already loaded by `LandingPage`; do not add an API, table, or dependency.
- Introduce one focused tourism widget component and reuse existing landing/modal styles where practical.
- Preserve the existing public tourism page and admin CRUD behavior.
- Normalize missing values only for display and filtering; source records remain unchanged.

## Verification

- Add one focused component test covering KPI calculation, opening the detail view through the landing callback, filtering/searching, and the full-table link.
- Run the focused test and the existing landing-page test suite/build checks affected by the change.
