# Task 6 Report: SaaS module stream

## Implementation commit

`5b1ee2e0c38bf43a939b29ab625cfdd188b546dd` — `feat: build one-page agricultural module stream`

## Important-review fix commit

`6624e2985967b90efba85091d851a956f3b3d77d` — `fix: address task 6 dashboard review`

## Files changed

- `src/pages/InteractiveDashboard.jsx`
- `src/pages/InteractiveDashboard.css`
- `src/pages/interactiveDashboard/ModuleSection.jsx`
- `src/pages/interactiveDashboard/ModuleSection.test.jsx`
- `src/pages/strategy/StrategyDashboard.jsx`
- `src/pages/development/DevelopmentDashboard.jsx`
- `src/pages/protection/ProtectionDashboard.jsx`
- `src/hooks/useProtectionData.js`
- `src/__tests__/interactive-dashboard-one-page.test.jsx`

## Implementation decisions

- Assembled the single `/interactive-dashboard` route in the approved order: overview, land, production, groups, networks, risk, extras.
- Reused `ModuleSection`, `StrategyDashboard`, `ProductionDashboard`, `DevelopmentDashboard`, `ProtectionDashboard`, `ExtrasSection`, and the existing overview charts/data. Closed modules remain unmounted until `ModuleSection` observes them near the viewport, so their hooks do not request data on initial render.
- Memoized one `{ district, year }` filter object and passed it to every embedded module. Existing URL-backed query parameters and standalone dashboard routes were left unchanged.
- Added the existing `LandingMap` to the overview and memoized district-filtered marker data before passing it to the map.
- Replaced metric-card route navigation with semantic buttons that scroll to their owning module. Reduced-motion users receive instant rather than smooth scrolling.
- Added one page-level `IntersectionObserver` for all seven sections. It selects the intersecting section nearest the viewport top, updates `aria-current="location"`, and disconnects on cleanup.
- Added native details/summary module shells, visible keyboard focus, horizontal mobile navigation, one-column mobile metrics, reduced-motion rules, and print rules that hide controls/navigation while retaining mounted summaries, active filters, sources/status, and generation time.
- Narrowed the overview AI warning query from `*` to the public fields `forecast_date,details`.
- A network-only component boundary does not exist. To avoid duplicating the development/protection dashboards or creating a broad abstraction, `#networks` reuses overview center/tourism counts and scrolls to the existing land, groups, and risk detail modules.

## Important-review fixes

- Kept the top bar, filters, navigation, print metadata, footer, and all seven module shells mounted during overview loading and failure. Loading/error/retry now live inside `#overview`; overview-derived network cards render `ไม่พร้อมใช้งาน` instead of invented zeroes.
- Reduced the default-open overview to metrics, the public map, and two compact summary charts. Detailed production, group, and risk visualizations now belong only to their lazy modules. Splitting `useDashboardData` would require a broader data-contract refactor, so this fix deliberately removes duplicate rendering without adding a second hook abstraction.
- Reworked the single active-navigation observer around a callback-persistent `Set`. Every callback updates entries, selects the currently intersecting section nearest the viewport top through `getBoundingClientRect()`, and clears/disconnects on cleanup.
- Suppressed separate-route detail links in embedded Strategy and Development dashboards while preserving their standalone actions and routes.
- Marked the latest-only overview as `ข้อมูลล่าสุด` for every selected year. The global controls and print metadata continue to show the active URL-backed year.
- Added a district-filtered community plant-doctor summary to Networks without mounting another `ProtectionDashboard`. It reuses the existing `protection-dashboard-data` React Query cache key, is mounted/enabled only with the lazy Networks module, and selects only the public aggregate fields required by the protection views.
- Changed each native module summary title to a semantic `h2` and updated the matching CSS.
- Added page-level integration coverage for loading/error isolation, lazy activation and filter propagation, embedded-route containment, standalone action preservation, duplicate-overview exclusion, year disclosure, district-filtered plant doctors, public projections, and multi-entry/exit observer behavior.

## TDD and verification

- RED: three integration tests failed because module navigation/order, the filtered map, metric scrolling, and the seven-section observer were absent.
- GREEN: focused integration suite passed 32/32.
- Privacy RED: the overview forecast test received `*` instead of `forecast_date,details`.
- Important-review RED: seven focused regressions failed for the semantic heading, overview shell isolation, persistent observer state, duplicate overview blocks, latest-only disclosure, embedded links, and missing Networks doctor summary.
- Important-review GREEN: `npm test -- src/pages/interactiveDashboard/ModuleSection.test.jsx src/__tests__/interactive-dashboard-one-page.test.jsx` — 2 files and 45/45 tests passed.
- Lint: `npm run lint:src` — passed with zero warnings.
- Full suite: `npm test` — 100 files passed, 1 skipped; 486 tests passed, 17 skipped.
- Fix commit hook: repeated the full suite with the same passing result.
- Build: `npm run build` passed with temporary non-secret placeholder Supabase variables.
- CSS check: the modified `InteractiveDashboard.css` minified directly with esbuild without warnings.
- UTF-8 check: affected JSX/tests contain no replacement characters, and focused tests assert the valid Thai runtime labels.
- `git diff --check` passed. Mobile, print, reduced-motion, observer cleanup, lazy gating, and public-data projections were rechecked. `progress.md` was not edited.

## Concerns

- The production build still reports repository-wide pre-existing warnings for an unexpected closing brace in the combined CSS and oversized chunks. Direct minification of the modified Task 6 stylesheet is clean.
- Tests emit the existing warning that local `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset; mocked tests pass and no credentials were added.
