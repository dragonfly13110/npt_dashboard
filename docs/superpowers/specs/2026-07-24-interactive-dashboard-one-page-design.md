# Interactive Dashboard: One Page for All Public Agricultural Data

**Date:** 2026-07-24
**Route:** `/interactive-dashboard`
**Audience:** Public users, farmers, officers, and decision-makers
**Status:** Approved in conversation

## Goal

Turn the existing Interactive Dashboard into one SaaS-style page containing every public agricultural dataset in the system. Users must be able to understand the province at a glance, filter the entire page by district and data year, and expand details without leaving the page.

Internal administration, personnel, budgets, permissions, audit logs, and other non-public data are out of scope.

## Chosen Direction

Use a **Module Stream** layout:

- SaaS application shell and top bar
- Sticky global filters for district and data year
- Sticky section tabs for fast navigation
- One continuous page organized by subject
- Summary cards followed by expandable charts and compact tables
- No navigation to separate detail pages from the dashboard
- Single-column module stream on mobile

The rejected alternatives were a dense executive command center and a map-first dashboard. The Module Stream was selected because it keeps a large number of datasets understandable and works best on mobile.

## Information Architecture

### 1. Province Overview

Show the most important cross-system indicators:

- Farmer households
- Cultivated area
- Farmer groups
- Community enterprises
- Large plots
- Learning and protection centers
- Current warnings

### 2. Land and Agricultural Area

Include:

- Farmer registry
- TBK cultivated area
- Digital parcel drawing progress
- Agricultural areas
- District and subdistrict spatial summaries where available
- Map showing public geographic datasets

### 3. Production

Include:

- Rice production and harvest situation
- Other crop production
- Large plots
- GAP certifications
- Production costs
- Agricultural prices

### 4. Farmers and Groups

Include:

- Community enterprises
- Smart Farmers
- Young Smart Farmers
- Agricultural career groups
- Housewife farmer groups
- Young farmer groups
- Combined farmer institute summary

### 5. Centers and Networks

Include:

- Learning centers
- Pest management centers
- Soil and fertilizer management centers
- Community plant doctors
- Agricultural tourism

### 6. Risk and Protection

Include:

- Disasters
- AI disease and pest forecasts
- Forecast plots
- Fire and PM2.5 hotspots
- Weather and rainfall
- Soil series where a public summary is available

## Global Filters

The top bar provides:

- **District:** all districts or one district
- **Data year:** available years or latest

Filter values are stored in the URL query string so the selected view can be bookmarked and shared. The section location is stored in the URL hash.

Every module applies supported filters. A module without a year field must show **latest available data** and label that state explicitly. It must not pretend that the selected year was applied.

## Module Behavior

Each module contains:

1. Section heading and short context
2. Key metrics
3. Primary visualization
4. Compact table or ranked list
5. Expand/collapse control for full detail
6. Source and latest-update label when available

All details remain on `/interactive-dashboard`. Existing detail routes remain unchanged for compatibility but are not required for normal dashboard use.

Only one expanded module is required at a time on small screens. Desktop may keep multiple modules open.

## Data Flow

Reuse the existing Supabase client, hooks, chart helpers, and shared dashboard UI. Do not copy datasets into a new store and do not add a dependency.

Create a thin page-level filter state shared by the modules. Existing domain hooks remain responsible for fetching and transforming their own data:

- `useDashboardData`
- `useProductionData`
- `useDevelopmentData`
- `useProtectionData`
- Existing strategy-specific data helpers

Modules load when they approach the viewport and cache results with the already-installed React Query package or the existing hook cache behavior. The initial request loads only the overview and first visible module.

## Loading and Errors

- Loading state is isolated per module.
- A failed module does not block the rest of the page.
- “No records” and “Failed to load” are visually distinct.
- Missing year support is labeled “latest available data.”
- Retry is available at module level.
- Stale cached data may remain visible while a refresh runs.

## Responsive and Accessibility Requirements

- Sticky section tabs become a horizontally scrollable tab row on mobile.
- Metric cards and modules become one column on narrow screens.
- Charts keep a readable minimum height and provide a compact text/table equivalent.
- Expand controls, tabs, and filters work with keyboard navigation.
- Interactive controls have accessible names and visible focus states.
- Color is not the only signal for warnings or status.

## Printing

Keep the current print action. Printed output includes active filters, overview metrics, visible module summaries, source labels, and generation time. Interactive controls are hidden in print.

## Performance Boundaries

- Do not mount every chart during the first render.
- Lazy-mount modules near the viewport.
- Reuse fetched data across overview and detail modules.
- Avoid one Supabase request per card.
- Preserve a useful page if one dataset is slow or unavailable.

## Testing

Leave one focused runnable test covering the non-trivial integration:

1. Render the one-page dashboard.
2. Change district and year.
3. Verify supported modules receive the filters.
4. Verify a module without year support displays “latest available data.”
5. Expand a module and confirm details stay on the same route.
6. Make one module fail and confirm other modules remain usable.

Existing hook and chart utility tests remain unchanged unless their contracts change.

## Acceptance Criteria

- All public agricultural categories listed above appear on `/interactive-dashboard`.
- Users can reach every category through sticky section tabs.
- District and year filters apply consistently where supported.
- Unsupported year filtering is disclosed.
- Detail expansion never requires leaving the page.
- Initial page render does not mount or fetch every detailed module.
- One module failure does not crash the whole page.
- Desktop and mobile layouts remain usable.
- Keyboard navigation and visible focus states work.
- Existing public routes and admin pages are not removed.

## Explicit Non-goals

- Exposing internal administration or personal data
- Replacing Supabase or duplicating its data
- Removing existing detail routes
- Adding a new state-management or chart dependency
- Building an editable dashboard or user-customizable widget system
- Adding speculative export formats beyond the existing print behavior
