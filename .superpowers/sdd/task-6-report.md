# Task 6 report

- Replaced Smart Map client Supabase/Open-Meteo/external soil reads with public Smart Map API React Query hooks.
- Initial load requests summary, layer status, weather only; point and soil queries are `enabled` only when their layer is visible.
- Query functions forward React Query's `AbortSignal`; keys include scope, layer, and bbox.
- Point/soil query failures remain layer-local on canvas.
- Verified: `npm test` (355 passed, 17 skipped), `npm run lint:src`, `npm run build`.

Deferred: per-district choropleth aggregation, comparison scopes, and subdistrict metrics belong to Tasks 7 and 10 because current summary endpoint serves one scope per request.
