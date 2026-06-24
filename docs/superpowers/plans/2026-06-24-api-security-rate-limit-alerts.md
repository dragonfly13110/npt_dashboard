# API Security, Persistent Rate Limit, and Error Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict browser write/admin calls to approved origins, persist AI rate-limit claims in Supabase, and push safe critical-error alerts to LINE admins.

**Architecture:** Small shared helpers provide origin checks and LINE alert delivery. `ai-proxy` claims an atomic Supabase RPC before contacting an AI provider. The private rate-limit table is reachable only through a service-role-only invoker RPC.

**Tech Stack:** Netlify Functions, Web `Request`/`Response`, Supabase Postgres/PostgREST, LINE Messaging API, Vitest.

---

## File map

- Create `netlify/functions/lib/http-security.js`: shared origin allowlist and CORS headers.
- Create `netlify/functions/lib/error-alert.js`: safe structured logs and LINE push alerts.
- Create `supabase/api_rate_limits.sql`: private counter table and atomic service-role RPC.
- Create `src/__tests__/http-security.test.js`: CORS helper contract.
- Create `src/__tests__/error-alert.test.js`: alert redaction/failure contract.
- Create `src/__tests__/api-rate-limit-schema.test.js`: SQL privilege and atomicity contract.
- Modify `netlify/functions/ai-proxy.js`: persistent RPC claim and alerts.
- Modify admin/write/scheduled functions: CORS and critical alerts.
- Modify `netlify/functions/forecast-disease-insect-background.js` and `src/pages/protection/AiDiseaseForecast.jsx`: require and send bearer auth.
- Modify `.env.example` and `docs/reference/ENVIRONMENT.md`: server-only alert configuration.

### Task 1: Shared CORS allowlist

**Files:**

- Create: `netlify/functions/lib/http-security.js`
- Create: `src/__tests__/http-security.test.js`
- Modify: `netlify/functions/update-user.js`
- Modify: `netlify/functions/delete-user.js`
- Modify: `netlify/functions/sync-farmer-registry.js`
- Modify: `netlify/functions/track-visit.js`

- [ ] **Step 1: Write failing helper tests**

Test that configured and localhost origins pass, unknown origins fail, originless server calls pass, and response headers echo only an allowed origin with `Vary: Origin`.

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/http-security.test.js`

Expected: FAIL because `netlify/functions/lib/http-security.js` does not exist.

- [ ] **Step 3: Implement the helper**

Export these functions:

```js
export function isOriginAllowed(origin) {
  if (!origin) return true;
  return isLocalOrigin(origin) || parseAllowedOrigins().includes(origin);
}

export function corsHeaders(origin, { methods, headers } = {}) {
  return {
    ...(isOriginAllowed(origin) && origin
      ? { 'Access-Control-Allow-Origin': origin }
      : {}),
    'Access-Control-Allow-Headers': headers || 'Content-Type',
    'Access-Control-Allow-Methods': methods || 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
```

Read `ALLOWED_ORIGINS` from `Netlify.env.get()` when available and fall back to `process.env` for tests.

- [ ] **Step 4: Apply to browser write/admin functions**

For each scoped function, read the request origin, return `403 { error: 'Origin not allowed' }` before privileged work, and build every response with dynamic CORS headers. Preserve existing bearer-token and role checks.

- [ ] **Step 5: Run GREEN and commit**

Run focused helper/admin/sync tests, then commit only Task 1 files.

### Task 2: Private atomic rate-limit RPC

**Files:**

- Create: `supabase/api_rate_limits.sql`
- Create: `src/__tests__/api-rate-limit-schema.test.js`

- [ ] **Step 1: Write failing SQL contract tests**

Assert the SQL creates `private.api_rate_limits`, enables RLS, revokes `public`/`anon`/`authenticated`, defines `public.claim_api_rate_limit`, validates positive limits/windows, serializes each key, uses fully qualified relations, and grants execute only to `service_role`.

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/api-rate-limit-schema.test.js`

Expected: FAIL because the SQL file does not exist.

- [ ] **Step 3: Implement SQL**

Create one row per `rate_key` with `window_started_at`, `request_count`, and `updated_at`. The RPC must use `security invoker set search_path = ''`, validate inputs, call `pg_advisory_xact_lock(hashtext(p_rate_key))`, reset expired windows, increment active windows, and return:

```json
{ "allowed": true, "remaining": 29, "retry_after_seconds": 0 }
```

Grant `USAGE` on `private`, table privileges, and RPC execute only to `service_role`.

- [ ] **Step 4: Run GREEN and commit**

Run the SQL contract test and commit only the SQL/test files.

### Task 3: Persistent AI proxy rate limit

**Files:**

- Modify: `netlify/functions/ai-proxy.js`
- Modify: `src/__tests__/ai-proxy.test.js`

- [ ] **Step 1: Write failing behavior tests**

Add tests proving an allowed RPC claim reaches the provider, a denied claim returns `429` plus `Retry-After`, and a missing/failing rate-limit configuration returns `503` without calling the provider.

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/ai-proxy.test.js`

Expected: FAIL because the proxy still uses its process-local `Map`.

- [ ] **Step 3: Implement minimal persistent claim**

Delete `requestLog` and `isRateLimited`. Hash `VISITOR_IP_HASH_SALT:ai-proxy:<client-ip>` with SHA-256, then POST to `/rest/v1/rpc/claim_api_rate_limit` using the service-role key. Claim before reading/calling the AI provider. Return `429`/`503` exactly as tested.

- [ ] **Step 4: Run GREEN and commit**

Run the AI proxy tests and commit only Task 3 files.

### Task 4: Safe LINE error alerts

**Files:**

- Create: `netlify/functions/lib/error-alert.js`
- Create: `src/__tests__/error-alert.test.js`
- Modify: `netlify/functions/ai-proxy.js`
- Modify: `netlify/functions/update-user.js`
- Modify: `netlify/functions/delete-user.js`
- Modify: `netlify/functions/sync-farmer-registry.js`
- Modify: `netlify/functions/forecast-disease-insect.js`
- Modify: `netlify/functions/sync-weather.js`
- Modify: `netlify/functions/sync-hotspots.js`

- [ ] **Step 1: Write failing alert tests**

Test that no request is sent without configuration; configured recipients each receive one LINE text message containing only function, event, time, and request ID; arbitrary error/request data is absent; LINE failures resolve without throwing.

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/error-alert.test.js`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement alert helper**

Export `reportCriticalError({ functionName, event, requestId })`. Log a structured JSON record, then push a short text message to each `ERROR_ALERT_LINE_USER_IDS` recipient using `LINE_CHANNEL_ACCESS_TOKEN`. Catch and log delivery failures.

- [ ] **Step 4: Wire only unexpected 5xx catches**

Call the helper from the listed functions. Do not alert for 400/401/403/429 paths or `track-visit`. Await alerts in legacy scheduled handlers; use `context.waitUntil()` where a modern context is available.

- [ ] **Step 5: Run GREEN and commit**

Run focused alert/function tests and commit only Task 4 files.

### Task 5: Protect manual disease-forecast generation

**Files:**

- Modify: `netlify/functions/forecast-disease-insect-background.js`
- Modify: `src/pages/protection/AiDiseaseForecast.jsx`
- Create: `src/__tests__/forecast-background-auth.test.js`

- [ ] **Step 1: Write failing authorization tests**

Mock Supabase and assert the background handler rejects missing/invalid tokens, rejects roles outside `admin`/`editor`, and calls `generateForecast` only for an allowed role.

- [ ] **Step 2: Run RED**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/forecast-background-auth.test.js`

Expected: FAIL because the wrapper currently calls `generateForecast` without authentication.

- [ ] **Step 3: Implement auth and frontend token forwarding**

The wrapper reads the bearer token, verifies it with server-side Supabase, checks the `profiles.role`, then calls `generateForecast`. The page obtains the current session and sends `Authorization: Bearer <access_token>` with the manual POST. Scheduled generation continues to call the generator directly.

- [ ] **Step 4: Run GREEN and commit**

Run focused forecast tests and commit only Task 5 files.

### Task 6: Configuration and full verification

**Files:**

- Modify: `.env.example`
- Modify: `docs/reference/ENVIRONMENT.md`

- [ ] **Step 1: Document configuration**

Document `ERROR_ALERT_LINE_USER_IDS`, the existing `LINE_CHANNEL_ACCESS_TOKEN`, `VISITOR_IP_HASH_SALT`, `ALLOWED_ORIGINS`, and the fail-closed behavior of `ai-proxy`.

- [ ] **Step 2: Run full local gates**

Run full lint, unit tests, `git diff --check`, and production build. Expected: zero lint/test failures and build exit 0.

- [ ] **Step 3: Verify remote SQL before function rollout**

Apply `supabase/api_rate_limits.sql`, claim a synthetic key through the service role until denied, verify `anon`/`authenticated` cannot execute the RPC or read the private table, remove the synthetic row, and run Supabase security/performance advisors.

- [ ] **Step 4: Configure and smoke-test Netlify**

Set the required server-only variables, deploy, then verify one allowed origin, one rejected origin, one `429`, and one synthetic LINE alert. Do not include secrets or user data in screenshots/log excerpts.
