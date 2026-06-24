# API Security, Persistent Rate Limit, and Error Alerts

## Goal

Protect browser-triggered write/admin functions, make the AI proxy rate limit survive cold starts, and notify operators about critical server failures without adding a new service.

## Decisions

### CORS and authorization

- Reuse `ALLOWED_ORIGINS` for browser-triggered write/admin functions.
- Reject an unknown browser `Origin` with `403`; allow requests without `Origin` only where server-to-server or scheduled calls are expected.
- Keep `Access-Control-Allow-Origin: *` only on intentional public read proxies.
- CORS remains defense in depth. Bearer-token and role checks still protect admin operations.
- Add bearer-token and `admin`/`editor` role verification to the manually triggered disease-forecast background function. Scheduled forecast generation bypasses the HTTP wrapper and calls the generator directly.

Browser-triggered functions in scope:

- `ai-proxy`
- `update-user`
- `delete-user`
- `sync-farmer-registry`
- `forecast-disease-insect-background`
- `track-visit`

Scheduled-only functions do not need browser CORS, but their failures are alertable.

### Persistent AI rate limit

- Replace the per-process `Map` in `ai-proxy` with one atomic Supabase RPC claim.
- Store one bounded row per hashed client key in a private schema. Never store the raw IP address.
- Reuse `VISITOR_IP_HASH_SALT` and include the endpoint name in the hash input.
- Default limit remains 30 requests per 60 seconds.
- The RPC runs as invoker, references a fully qualified private table, and grants execution only to `service_role`.
- If the rate-limit store is unavailable or misconfigured, return `503`; do not call an AI provider.
- A denied claim returns `429` with `Retry-After`.

### Error alerts

- Keep structured JSON errors in Netlify logs.
- Send a short LINE push alert using the existing `LINE_CHANNEL_ACCESS_TOKEN`.
- Add `ERROR_ALERT_LINE_USER_IDS` as a comma-separated server-only environment variable.
- Alert only unexpected `5xx` failures from high-value write/AI/scheduled functions. Do not alert for validation errors, authorization failures, CORS rejections, or rate-limit `429` responses.
- Alerts contain only function name, safe event label, timestamp, and Netlify request ID. They never include request bodies, tokens, IP addresses, or user records.
- Alert delivery failure is logged and never replaces the original function response.

Alerted functions:

- `ai-proxy`
- `update-user`
- `delete-user`
- `sync-farmer-registry` manual and scheduled runs
- disease forecast manual and scheduled runs
- `sync-weather`
- `sync-hotspots`

`track-visit` remains log-only because analytics failures are non-critical and potentially noisy.

## Shared code

- One small CORS helper for allowlist parsing and response headers.
- One small LINE alert helper for safe payload construction and delivery.
- No new dependency, monitoring vendor, queue, Redis instance, or custom dashboard.

## Verification

- Unit tests prove allowed/disallowed origins and preserve originless server calls.
- Unit tests prove the AI provider is not called after a denied or failed persistent rate-limit claim.
- SQL contract tests prove the rate-limit table is private and the RPC is executable only by `service_role`.
- Tests prove LINE alerts exclude sensitive values and alert failures do not change API responses.
- Existing admin authorization, full lint, unit tests, and production build pass.
- Remote rollout verifies two atomic claims, denial after the configured limit, no `anon`/`authenticated` access, and security advisors before enabling production traffic.

## Rollout

1. Deploy and verify the Supabase SQL.
2. Configure `VISITOR_IP_HASH_SALT`, `ALLOWED_ORIGINS`, and `ERROR_ALERT_LINE_USER_IDS` in Netlify.
3. Deploy functions and smoke-test one allowed origin, one rejected origin, one `429`, and one synthetic LINE alert.
4. Keep the existing in-memory limiter removed; rollback the function deploy if the persistent claim is unavailable.
