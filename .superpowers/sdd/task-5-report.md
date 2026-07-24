# Task 5 Report: Remaining public dashboard summaries

## Commit

`0fc040af55486412956a6faab56b3072559bb4c5` — `feat: add remaining public dashboard summaries`

## Files changed

- `src/hooks/useInteractiveExtrasData.js`
- `src/pages/interactiveDashboard/ExtrasSection.jsx`
- `src/__tests__/interactive-dashboard-one-page.test.jsx`

## Implementation decisions

- Added one cached, `enabled`-gated hook for TBK, rice harvest, production costs, AI forecasts, and soil series.
- Used only explicit public Supabase projections; no wildcard, administration, personnel, budget, contact, or private fields are fetched.
- Used `Promise.allSettled` plus per-result Supabase error checks so a failed dataset becomes `null`, retains its error under the dataset key, and does not erase successful sibling summaries.
- Kept missing metrics and missing year identifiers as `null`; valid observed zeroes remain zero.
- Matched selected TBK year/district and newest snapshot, Buddhist rice crop-year labels such as `2568/69`, selected production-cost year, and district/latest-only soil data.
- Added five semantic `<h3>` summary cards using existing dashboard cards, EChart, and chart helpers. AI and soil cards disclose `ข้อมูลล่าสุด`; chart values also have visible text equivalents.
- Did not edit `InteractiveDashboard.jsx` or `progress.md`. Mounting `ExtrasSection` in the final module stream belongs to Task 6.

## TDD and verification

- RED cycles proved the missing summarizer, hook, and section, then reproduced null-number coercion and missing-year coercion.
- Focused: `npm test -- src/__tests__/interactive-dashboard-one-page.test.jsx` — 26/26 passed.
- Related: focused test plus cache, TBK, rice, soil schema, public privacy, and guest-table tests — 7 files, 51/51 passed.
- Lint: `npm run lint:src` — passed with zero warnings.
- Full: `npm test` — 100 files passed, 1 skipped; 470 tests passed, 17 skipped.
- Commit hook reformatted the three files and repeated the same full-suite result successfully.
- `git diff --check` passed; worktree clean after commit.

## Review fix wave

- Commit: `2897345aa0735c1e5024e88d345a855c7aa38ab1` — `fix: distinguish extra dataset failures`.
- Replaced the single retained fetch error with a sparse `errors` map keyed by `tbk`, `rice`, `costs`, `forecast`, and `soils`; the shared `error` and retry contract remains.
- Failed cards now show `โหลดไม่สำเร็จ`, while successful empty datasets show the distinct `ไม่พร้อมใช้งาน` state.
- AI forecasts with `details: []` now summarize to `null` instead of observed zeroes.
- Added regression coverage for two simultaneous dataset failures, a successful empty sibling, empty AI details, and rice crop-year `2568/69` with both selected years `2568` and `2569`.
- RED: focused suite had 3 expected failures for the AI zero summary, missing keyed errors, and indistinguishable failed/empty card states.
- GREEN: focused 29/29; related 7 files and 54/54; full 100 files passed, 1 skipped, with 473 tests passed and 17 skipped; `npm run lint:src` passed with zero warnings.
- The fix commit hook repeated the full suite with the same passing result.

## Concerns

- Tests emit the existing warning that local `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset; mocked tests pass and no credentials were added.
- `ExtrasSection` is intentionally not mounted on `/interactive-dashboard` until Task 6 assembles the approved module stream.
