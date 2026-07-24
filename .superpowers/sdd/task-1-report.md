# Task 1 Report: Shared filter contract

## Implementation

Added the pure shared helpers requested by Task 1 in `src/pages/interactiveDashboard/filters.js`:

- `ALL_DISTRICTS`
- `LATEST_YEAR`
- `normalizeYear`
- `filterRows`
- `collectYears`
- `yearStatus`

Added the four specified Vitest tests in `src/pages/interactiveDashboard/filters.test.js`.

## TDD evidence

### RED

Command:

```text
npm test -- src/pages/interactiveDashboard/filters.test.js
```

Result: failed as expected before implementation. Vitest reported that `./filters` could not be resolved from `filters.test.js`.

### GREEN

Focused command:

```text
npm test -- src/pages/interactiveDashboard/filters.test.js
```

Result: passed — 1 test file, 4 tests.

Full suite command:

```text
npm test
```

Result: passed — 98 test files passed, 1 skipped; 441 tests passed, 17 skipped.

The suite emitted existing warnings that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were not configured; they did not affect the result.

## Files changed

- `src/pages/interactiveDashboard/filters.js`
- `src/pages/interactiveDashboard/filters.test.js`
- `.superpowers/sdd/task-1-report.md`

## Self-review

- Confirmed the implementation matches the exact Task 1 interfaces and values.
- Confirmed filtering supports district and year keys, including datasets without a year key.
- Confirmed Buddhist-year collection, descending ordering, invalid-year normalization, and unsupported-year disclosure.
- Ran `git diff --check` successfully.
- No other task files or plan files were modified.

## Concerns

Only the pre-existing missing Supabase environment-variable warnings appeared during tests. No functional concerns remain.
