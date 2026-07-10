# LINE Bot System Knowledge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LINE Bot answer from every catalog-registered dataset, system page, and manual; enforce role/PDPA before AI sees evidence; link staff by one-time profile code; use disclosed, cited internet fallback only when the system has no answer.

**Architecture:** Expand `datasetCatalog.json` into the LINE knowledge allowlist. Route all retrieval through one server-side knowledge gateway that resolves LINE identity, validates catalog IDs, calls safe Supabase RPCs or the generated manual index, removes forbidden PII, and returns allowlisted links. The orchestrator always searches system sources first, then invokes Gemini Google Search grounding only when system evidence is empty.

**Tech Stack:** React 19, Netlify Functions, Supabase/Postgres, Gemini API, Vitest, Node standard library. No new dependency.

## Global Constraints

- LINE remains read-only for business data; account linking and conversation persistence are the only new writes.
- Public users cannot receive farmer names, center-chair names, managers, phone numbers, addresses, emails, LINE IDs, or equivalent PII.
- PII removal happens before evidence reaches Gemini; prompts never authorize disclosure.
- Every supported dataset, system page, and manual must be registered in `src/domain/datasetCatalog.json`.
- System search runs before internet search for every factual request.
- Internet answers begin exactly with `ไม่พบข้อมูลนี้ในระบบ คำตอบต่อไปนี้ค้นจากอินเทอร์เน็ต` and include source links.
- OTP codes are hashed, expire after 10 minutes, and are single-use.
- Links are limited to registered dashboard routes or cited external search sources.
- Preserve existing `TABLE_ROUTES` exports and consumers.
- No vector database and no new package.

---

## File Map

- `src/domain/datasetCatalog.json`: source of truth for dataset, page, manual, route, access, and privacy metadata.
- `src/domain/datasetCatalog.js`: existing frontend catalog API plus LINE catalog access helpers.
- `src/utils/dataPrivacy.js`: shared field-level PII policy.
- `scripts/build-line-manual-index.mjs`: deterministic Markdown-to-JSON manual index generator.
- `netlify/functions/lib/line-ai/manual-index.json`: generated manual chunks bundled with the function.
- `supabase/global_search.sql`: public-safe search and service-role-only staff search.
- `supabase/line_account_linking.sql`: OTP and LINE/profile link schema plus atomic consume RPC.
- `netlify/functions/line-link-code.js`: authenticated OTP generation endpoint.
- `src/pages/Profile.jsx`: button and status for generating the one-time LINE code.
- `netlify/functions/lib/line-ai/store.js`: linked identity lookup and OTP consumption.
- `netlify/functions/lib/line-ai/knowledge.js`: catalog validation, system retrieval, privacy projection, and safe records.
- `netlify/functions/lib/line-ai/gemini.js`: catalog-aware planner and external grounded search.
- `netlify/functions/lib/line-ai/orchestrator.js`: system-first routing and disclosed web fallback.
- `netlify/functions/lib/line-ai/webhook-core.js`: navigation, account-link command, AI dispatch, reply handling.
- `netlify/functions/lib/line-ai/flex.js`: safe system and external source cards.

---

### Task 1: Close Current Public PII Gaps

**Files:**

- Modify: `src/utils/dataPrivacy.js`
- Modify: `supabase/global_search.sql`
- Modify: `src/domain/datasetCatalog.test.js`
- Test: `src/__tests__/public-privacy.test.js`

**Interfaces:**

- Consumes: existing `isPrivateColumn(tableName, column)` and `global_search_public(...)`.
- Produces: public search results that never contain personal-name fields; unchanged function signatures.

- [ ] **Step 1: Write failing privacy tests**

Add cases proving these fields are private for guests and AI reads:

```js
it.each([
  ['learning_centers', 'manager'],
  ['farmer_groups', 'chairman'],
  ['housewife_farmer_groups', 'chairman'],
  ['young_farmer_groups', 'chairman'],
  ['pest_centers', 'chairman'],
  ['soil_fertilizer_centers', 'chairman'],
  ['plant_doctors', 'full_name'],
  ['personnel', 'full_name'],
])('hides %s.%s from public AI reads', (table, field) => {
  expect(isPrivateColumn(table, { dataIndex: field })).toBe(true);
  expect(
    getDatasetSelectColumns(table, {
      purpose: 'ai',
      columns: [field, 'district'],
    }).split(',')
  ).not.toContain(field);
});
```

Extend the SQL assertion test:

```js
it('does not return public personal-name columns from global search', () => {
  const sql = readGlobalSearchSql();
  const publicFunction = sql.slice(
    sql.indexOf('CREATE OR REPLACE FUNCTION public.global_search_public'),
    sql.indexOf('-- Legacy wrapper:')
  );
  expect(publicFunction).not.toMatch(
    /ARRAY\[[^\]]*'manager'[^\]]*\]::text\[\]/
  );
  expect(publicFunction).not.toMatch(
    /ARRAY\[[^\]]*'chairman'[^\]]*\]::text\[\]/
  );
  expect(publicFunction).not.toMatch(
    /ARRAY\[[^\]]*'full_name'[^\]]*\]::text\[\]/
  );
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/domain/datasetCatalog.test.js src/__tests__/public-privacy.test.js`

Expected: FAIL because `PUBLIC_NAME_ALLOW_PATTERNS` currently allows chair/leader fields and SQL still exposes manager/chairman in public search configuration.

- [ ] **Step 3: Make names private by default**

In `src/utils/dataPrivacy.js`, delete `PUBLIC_NAME_ALLOW_PATTERNS` and its early-return branch. Extend the generic pattern:

```js
const BASE_PRIVATE_PATTERNS = [
  /citizen|id_card|national_id/i,
  /phone|mobile|tel/i,
  /address|address_no|moo|road|soi|house/i,
  /first_name|last_name|full_name|owner_name|farmer_name|contact_person/i,
  /chairman|president|leader|manager/i,
  /email|line_id|facebook/i,
];
```

Keep `column.public === true` as the only explicit field-level override. Do not mark any personal-name column public in this task.

In `supabase/global_search.sql`, remove personal-name fields from both `search_cols` and `return_cols` in `global_search_public` for `learning_centers`, `farmer_groups`, `young_farmer_groups`, `pest_centers`, `soil_fertilizer_centers`, `plant_doctors`, and `personnel`. Keep organization/group names such as `center_name`, `group_name`, and `enterprise_name`.

- [ ] **Step 4: Run privacy tests**

Run: `pnpm vitest run src/domain/datasetCatalog.test.js src/__tests__/public-privacy.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dataPrivacy.js supabase/global_search.sql src/domain/datasetCatalog.test.js src/__tests__/public-privacy.test.js
git commit -m "fix(line): hide public personal names"
```

---

### Task 2: Make `datasetCatalog` the LINE Knowledge Registry

**Files:**

- Modify: `src/domain/datasetCatalog.json`
- Modify: `src/domain/datasetCatalog.js`
- Modify: `src/data/manualRegistry.js`
- Modify: `src/domain/datasetCatalog.test.js`

**Interfaces:**

- Consumes: existing `TABLE_ROUTES`, `DATASET_CATALOG`, role names `guest`, `viewer`, `editor`, `district_editor`, `admin`.
- Produces: `LINE_DATASET_POLICY`, `SYSTEM_PAGES`, `MANUALS`, `listLineKnowledgeEntries()`, `getLineKnowledgeEntry(id)`, `canRoleAccessLineKnowledge(role, id)`.

- [ ] **Step 1: Add failing catalog coverage tests**

```js
import catalogJson from './datasetCatalog.json';
import {
  canRoleAccessLineKnowledge,
  getLineKnowledgeEntry,
  listLineKnowledgeEntries,
} from './datasetCatalog';

it('registers every searchable dataset for LINE', () => {
  const registered = new Set(
    catalogJson.LINE_DATASETS.map((entry) => entry.source)
  );
  expect(listDatasetKeys().filter((key) => !registered.has(key))).toEqual([]);
});

it('registers every manual file once', () => {
  const files = catalogJson.MANUALS.map((entry) => entry.file);
  expect(new Set(files).size).toBe(files.length);
  expect(files).toHaveLength(12);
});

it('enforces page and dataset roles', () => {
  expect(canRoleAccessLineKnowledge('guest', 'page:profile')).toBe(false);
  expect(canRoleAccessLineKnowledge('viewer', 'page:profile')).toBe(true);
  expect(canRoleAccessLineKnowledge('viewer', 'page:admin-users')).toBe(false);
  expect(canRoleAccessLineKnowledge('admin', 'page:admin-users')).toBe(true);
  expect(getLineKnowledgeEntry('dataset:large_plots')?.route).toBe(
    '/dashboard/production/large-plots'
  );
});

it('returns unique stable LINE knowledge IDs', () => {
  const ids = listLineKnowledgeEntries().map((entry) => entry.id);
  expect(new Set(ids).size).toBe(ids.length);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm vitest run src/domain/datasetCatalog.test.js`

Expected: FAIL because LINE registry arrays and helpers do not exist.

- [ ] **Step 3: Add catalog sections**

Add three top-level arrays to `datasetCatalog.json`:

```json
{
  "TABLE_ROUTES": {},
  "LINE_DATASETS": [],
  "SYSTEM_PAGES": [],
  "MANUALS": []
}
```

Populate `LINE_DATASETS` with one entry for every `listDatasetKeys()` result. Use this exact shape:

```json
{
  "id": "dataset:large_plots",
  "kind": "dataset",
  "source": "large_plots",
  "title": "แปลงใหญ่",
  "description": "ข้อมูลกลุ่มแปลงใหญ่ ชนิดสินค้า จำนวนสมาชิก พื้นที่ และปีข้อมูล",
  "aliases": ["แปลงใหญ่", "กลุ่มแปลงใหญ่", "พื้นที่แปลง", "สมาชิกแปลง"],
  "route": "/dashboard/production/large-plots",
  "minRole": "guest",
  "piiFields": ["contact_person", "phone", "address"],
  "freshnessField": "year"
}
```

Use existing Thai labels and aliases from `CHATBOT_TABLE_CONFIG`, `TABLE_SEARCH_COLS`, `DASHBOARD_GROUPS`, and Gemini's table-selection guide. Set `minRole: "admin"` for `assets`; `minRole: "viewer"` for `budgets` and `personnel`; use `guest` for datasets already allowed by `canGuestAccessTable`. Include all PII columns from `TABLE_PRIVATE_COLUMNS`, plus `manager` and `chairman` fields identified in Task 1.

Populate `SYSTEM_PAGES` with these stable IDs and routes:

```text
page:landing=/
page:interactive-dashboard=/interactive-dashboard
page:smart-map=/smart-map
page:manual=/manual
page:bmc=/bmc
page:login=/login
page:dashboard=/dashboard
page:profile=/dashboard/profile
page:situation-room=/dashboard/situation-room
page:chatbot=/dashboard/chatbot
page:data-dictionary=/dashboard/data-dictionary
page:search=/dashboard/search
page:data-requests=/dashboard/data-requests
page:community-forum=/dashboard/community/forum
page:admin-overview=/dashboard/admin/overview
page:admin-users=/dashboard/admin/users
page:admin-data-quality=/dashboard/admin/data-quality
page:admin-audit-log=/dashboard/admin/audit-log
page:admin-recent-activities=/dashboard/admin/recent-activities
page:admin-visitors=/dashboard/admin/visitors
page:admin-website-evaluations=/dashboard/admin/website-evaluations
page:strategy-overview=/dashboard/strategy/overview
page:production-overview=/dashboard/production/overview
page:development-overview=/dashboard/development/overview
page:protection-overview=/dashboard/protection/overview
```

Set public landing/manual/BMC/map pages to `guest`, ordinary dashboard pages to `viewer`, and admin operational pages to `admin`. Each page entry uses `{ id, kind: "page", title, description, aliases, route, minRole }`.

Move the 12 manual records from `src/data/manualRegistry.js` into `MANUALS`, replacing React icon components with string icon keys. Each entry uses `{ id: "manual:<slug>", kind: "manual", slug, title, file, audience, aliases, route: "/manual/<slug>", minRole }`. Public overview manuals use `guest`; operational, security, deploy, Supabase, and admin SOP manuals use `viewer` or `admin` according to audience.

- [ ] **Step 4: Add pure catalog helpers**

Append to `datasetCatalog.js`:

```js
const ROLE_RANK = {
  guest: 0,
  viewer: 1,
  editor: 2,
  district_editor: 2,
  admin: 3,
};

export const LINE_DATASET_POLICY = catalog.LINE_DATASETS;
export const SYSTEM_PAGES = catalog.SYSTEM_PAGES;
export const MANUALS = catalog.MANUALS;

const LINE_KNOWLEDGE = new Map(
  [...LINE_DATASET_POLICY, ...SYSTEM_PAGES, ...MANUALS].map((entry) => [
    entry.id,
    entry,
  ])
);

export function listLineKnowledgeEntries() {
  return [...LINE_KNOWLEDGE.values()];
}

export function getLineKnowledgeEntry(id) {
  return LINE_KNOWLEDGE.get(id) || null;
}

export function canRoleAccessLineKnowledge(role, id) {
  const entry = getLineKnowledgeEntry(id);
  if (!entry) return false;
  return (ROLE_RANK[role] ?? -1) >= (ROLE_RANK[entry.minRole] ?? 99);
}
```

Change `manualRegistry.js` to map `catalog.MANUALS` to the existing Ant Design icon map; do not keep a second manual metadata list.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run src/domain/datasetCatalog.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/datasetCatalog.json src/domain/datasetCatalog.js src/data/manualRegistry.js src/domain/datasetCatalog.test.js
git commit -m "feat(line): register system knowledge catalog"
```

---

### Task 3: Build and Search the Registered Manual Index

**Files:**

- Create: `scripts/build-line-manual-index.mjs`
- Create: `netlify/functions/lib/line-ai/manual-index.json`
- Create: `src/__tests__/line-ai-manual-index.test.js`
- Modify: `package.json`

**Interfaces:**

- Consumes: `datasetCatalog.json.MANUALS`, files under `docs/manual/`.
- Produces: deterministic JSON array `{ id, title, route, minRole, heading, content }[]` and exported `buildManualIndex(rootDir)`.

- [ ] **Step 1: Write failing generator test**

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildManualIndex } from '../../scripts/build-line-manual-index.mjs';

describe('LINE manual index', () => {
  it('contains chunks only from registered manuals', () => {
    const generated = buildManualIndex(process.cwd());
    const committed = JSON.parse(
      readFileSync('netlify/functions/lib/line-ai/manual-index.json', 'utf8')
    );
    expect(committed).toEqual(generated);
    expect(new Set(generated.map((chunk) => chunk.id))).toContain(
      'manual:csv-import'
    );
    expect(generated.every((chunk) => chunk.content.length <= 1600)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm vitest run src/__tests__/line-ai-manual-index.test.js`

Expected: FAIL because generator and index do not exist.

- [ ] **Step 3: Implement deterministic generator**

Use only `node:fs`, `node:path`, and JSON import. Split Markdown on headings; merge tiny adjacent sections; hard-limit chunks to 1,600 characters. Strip fenced code only when a chunk would exceed the limit; retain commands and headings. Sort by manual ID then source order. Export `buildManualIndex(rootDir)` and write the JSON only when the script is executed directly.

Add scripts:

```json
{
  "scripts": {
    "build:line-knowledge": "node scripts/build-line-manual-index.mjs",
    "build:netlify": "npm run build:line-knowledge && vite build"
  }
}
```

Run: `pnpm build:line-knowledge`

Expected: creates `netlify/functions/lib/line-ai/manual-index.json` deterministically.

- [ ] **Step 4: Run tests and build**

Run: `pnpm vitest run src/__tests__/line-ai-manual-index.test.js && pnpm build`

Expected: PASS and successful Vite build.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-line-manual-index.mjs netlify/functions/lib/line-ai/manual-index.json src/__tests__/line-ai-manual-index.test.js package.json
git commit -m "feat(line): index registered manuals"
```

---

### Task 4: Add Atomic LINE Account Linking

**Files:**

- Create: `supabase/line_account_linking.sql`
- Modify: `src/__tests__/line-ai-schema.test.js`
- Modify: `src/__tests__/line-ai-schema.integration.test.js`

**Interfaces:**

- Produces: tables `line_link_codes`, `line_account_links`; RPC `consume_line_link_code(p_code_hash text, p_line_user_id text)` returning `profile_id`, `role`, `department`.
- Security: tables and RPC callable only by `service_role`.

- [ ] **Step 1: Write failing schema assertions**

Assert the migration contains both tables, RLS, public/authenticated revokes, service-role grants, hashed-code field, unique profile link, expiry check, `FOR UPDATE`, and single-use update. Add an integration case that concurrently calls the consume RPC twice and expects exactly one successful row.

```js
expect(sql).toMatch(/create table if not exists public\.line_link_codes/i);
expect(sql).toMatch(/code_hash text not null unique/i);
expect(sql).toMatch(/expires_at timestamptz not null/i);
expect(sql).toMatch(/create table if not exists public\.line_account_links/i);
expect(sql).toMatch(/profile_id uuid not null unique/i);
expect(sql).toMatch(/for update/i);
expect(sql).toMatch(/revoke all[\s\S]*anon, authenticated/i);
expect(sql).toMatch(/grant execute[\s\S]*service_role/i);
```

- [ ] **Step 2: Run schema test to verify failure**

Run: `pnpm vitest run src/__tests__/line-ai-schema.test.js`

Expected: FAIL because migration is absent.

- [ ] **Step 3: Create migration**

Create the tables with these constraints:

```sql
create table if not exists public.line_link_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null unique check (char_length(code_hash) = 64),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.line_account_links (
  line_user_id text primary key check (char_length(line_user_id) between 1 and 100),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Enable RLS; revoke all from `public`, `anon`, and `authenticated`; grant all to `service_role`. Implement `consume_line_link_code` as `security definer set search_path = public`: select one matching unexpired unused code `FOR UPDATE`, return no row when invalid, mark it used, remove previous links for either identity, insert the new link, then return the current profile role and department. Revoke execution from public roles and grant only to `service_role`.

- [ ] **Step 4: Run schema and integration checks**

Run: `pnpm vitest run src/__tests__/line-ai-schema.test.js`

Expected: PASS.

Run when Supabase test credentials are available: `pnpm vitest run src/__tests__/line-ai-schema.integration.test.js`

Expected: PASS; one concurrent consume succeeds and the second returns no row.

- [ ] **Step 5: Commit**

```bash
git add supabase/line_account_linking.sql src/__tests__/line-ai-schema.test.js src/__tests__/line-ai-schema.integration.test.js
git commit -m "feat(line): add one-time account linking"
```

---

### Task 5: Generate Link Codes from the Profile Page

**Files:**

- Create: `netlify/functions/line-link-code.js`
- Create: `src/__tests__/line-link-code.test.js`
- Modify: `src/pages/Profile.jsx`

**Interfaces:**

- Endpoint: `POST /.netlify/functions/line-link-code` with portal bearer token.
- Response: `{ code: string, expiresAt: string, command: string }` where command is `เชื่อม <CODE>`.

- [ ] **Step 1: Write failing endpoint tests**

Cover OPTIONS, wrong method, missing bearer token, invalid user, successful generation, and code replacement. On success assert:

```js
expect(response.statusCode).toBe(200);
const payload = JSON.parse(response.body);
expect(payload.code).toMatch(/^[A-F0-9]{10}$/);
expect(payload.command).toBe(`เชื่อม ${payload.code}`);
expect(inserted.code_hash).toMatch(/^[a-f0-9]{64}$/);
expect(inserted.code_hash).not.toContain(payload.code);
expect(new Date(inserted.expires_at).getTime() - now.getTime()).toBe(600000);
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm vitest run src/__tests__/line-link-code.test.js`

Expected: FAIL because endpoint does not exist.

- [ ] **Step 3: Implement endpoint**

Reuse `corsHeaders` and `isOriginAllowed` from `netlify/functions/lib/http-security.js`. Authenticate with `supabase.auth.getUser(bearerToken)`. Generate `randomBytes(5).toString('hex').toUpperCase()`, hash with SHA-256, delete existing unused codes for the same profile, and insert one code expiring in 10 minutes. Return only plaintext code, expiry, and LINE command. Never log code or bearer token.

- [ ] **Step 4: Add Profile UI**

Add one Card below the existing profile form. Button label: `สร้างรหัสเชื่อม LINE`. Fetch the current Supabase session, POST with bearer token, show the returned command in a read-only input, show expiry, and add a copy button. Do not persist plaintext code in local storage.

- [ ] **Step 5: Run tests and lint touched files**

Run: `pnpm vitest run src/__tests__/line-link-code.test.js && pnpm eslint netlify/functions/line-link-code.js src/pages/Profile.jsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/line-link-code.js src/__tests__/line-link-code.test.js src/pages/Profile.jsx
git commit -m "feat(line): generate profile link codes"
```

---

### Task 6: Resolve LINE Identity and Consume Link Commands

**Files:**

- Modify: `netlify/functions/lib/line-ai/store.js`
- Modify: `netlify/functions/lib/line-ai/webhook-core.js`
- Modify: `src/__tests__/line-ai-store.test.js`
- Modify: `src/__tests__/line-webhook.test.js`

**Interfaces:**

- Produces: `store.resolveIdentity(lineUserId)` and `store.consumeLinkCode(lineUserId, code)`.
- Identity shape: `{ role: 'guest' | 'viewer' | 'editor' | 'district_editor' | 'admin', profileId: string | null, department: string | null }`.

- [ ] **Step 1: Write failing store and webhook tests**

Test unlinked identity returns guest, linked identity reads the current profile role, invalid code returns false, valid code calls RPC with a 64-character SHA-256 hash, and `เชื่อม ABCDEF1234` is handled before AI.

```js
expect(await store.resolveIdentity('U-public')).toEqual({
  role: 'guest',
  profileId: null,
  department: null,
});

expect(await store.consumeLinkCode('U-staff', 'ABCDEF1234')).toEqual({
  role: 'editor',
  profileId: 'profile-1',
  department: 'กลุ่มส่งเสริมและพัฒนาการผลิต',
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/__tests__/line-ai-store.test.js src/__tests__/line-webhook.test.js`

Expected: FAIL because methods and link-command route do not exist.

- [ ] **Step 3: Implement store methods**

`resolveIdentity` queries `line_account_links` by LINE ID, then reads `profiles` by linked profile ID so role changes apply immediately. Unknown roles fall back to `viewer`; missing links return guest. `consumeLinkCode` normalizes uppercase hex, rejects anything not matching `/^[A-F0-9]{10}$/`, hashes with Web Crypto SHA-256, and calls `consume_line_link_code`.

- [ ] **Step 4: Handle command before AI**

In `handleMessageEvent`, after greeting/help and before the AI block:

```js
const linkMatch = text.match(/^เชื่อม\s+([A-F0-9]{10})$/i);
if (linkMatch) {
  const store = createLineAiStore(supabase);
  const linked = await store.consumeLinkCode(
    event.source?.userId,
    linkMatch[1]
  );
  await sendLineReply(replyToken, [
    {
      type: 'text',
      text: linked
        ? 'เชื่อมบัญชีสำเร็จแล้วค่ะ สิทธิ์ LINE จะอ้างอิงจากบัญชีระบบปัจจุบัน'
        : 'รหัสไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว กรุณาสร้างรหัสใหม่จากหน้าโปรไฟล์',
    },
  ]);
  return;
}
```

Do not log the command text.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run src/__tests__/line-ai-store.test.js src/__tests__/line-webhook.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/lib/line-ai/store.js netlify/functions/lib/line-ai/webhook-core.js src/__tests__/line-ai-store.test.js src/__tests__/line-webhook.test.js
git commit -m "feat(line): resolve linked portal identity"
```

---

### Task 7: Add the Catalog-Governed Knowledge Gateway

**Files:**

- Create: `netlify/functions/lib/line-ai/knowledge.js`
- Create: `src/__tests__/line-ai-knowledge.test.js`
- Modify: `supabase/global_search.sql`
- Modify: `src/domain/datasetCatalog.test.js`

**Interfaces:**

- Produces: `searchSystemKnowledge({ supabase, identity, catalogIds, searchTerms })`.
- Returns: `{ found: boolean, evidence: Array, records: Array }`.
- Staff RPC: `global_search_staff(search_terms text[], table_names text[], result_limit integer)` executable only by `service_role`.

- [ ] **Step 1: Write failing gateway tests**

Cover unknown IDs, guest denial, admin access, public PII stripping, manual retrieval, page retrieval, safe links, empty evidence, and result caps.

```js
expect(
  await searchSystemKnowledge({
    supabase,
    identity: { role: 'guest', profileId: null, department: null },
    catalogIds: ['dataset:assets'],
    searchTerms: ['รถยนต์'],
  })
).toEqual({ found: false, evidence: [], records: [] });

expect(JSON.stringify(publicResult)).not.toMatch(
  /full_name|chairman|manager|phone|address|line_id/i
);
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm vitest run src/__tests__/line-ai-knowledge.test.js`

Expected: FAIL because gateway does not exist.

- [ ] **Step 3: Add staff-only search RPC**

Refactor the repeated dynamic-search body in `supabase/global_search.sql` into a private helper that accepts explicit return-column sets. Keep `global_search_public` behavior from Task 1. Add `global_search_staff` with private fields needed by authenticated staff, revoke it from `public`, `anon`, and `authenticated`, and grant execute only to `service_role`. Keep SQL configuration aligned with every `LINE_DATASETS.source` using the existing catalog SQL test.

- [ ] **Step 4: Implement gateway**

Import `datasetCatalog.json` and `manual-index.json` directly. Implement role ranking locally in this server-only file. Validate every requested ID; silently discard inaccessible IDs; cap IDs to 5, search terms to 5, and returned categories/cards to 3.

For dataset entries, call `global_search_public` for guests and `global_search_staff` for linked users. Remove every key listed in `entry.piiFields` from guest results even if the RPC accidentally returns it. For manual chunks, score exact title/alias matches first, then heading/content substring matches; filter by role before scoring. For page entries, match aliases/title and return route metadata without reading DB.

Only emit routes present on the matched catalog entry. Use this deterministic record shape:

```js
{
  title: 'แปลงใหญ่',
  subtitle: 'พบ 12 รายการ',
  url: 'https://npt-dashboard.netlify.app/dashboard/production/large-plots',
  totalCount: 12,
  sourceKind: 'system'
}
```

Add the required simplification comment above manual scanning:

```js
// ponytail: O(n) over the small generated manual index; add FTS only after measured misses or latency.
```

- [ ] **Step 5: Run gateway and catalog tests**

Run: `pnpm vitest run src/__tests__/line-ai-knowledge.test.js src/domain/datasetCatalog.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/lib/line-ai/knowledge.js src/__tests__/line-ai-knowledge.test.js supabase/global_search.sql src/domain/datasetCatalog.test.js
git commit -m "feat(line): add catalog knowledge gateway"
```

---

### Task 8: Enforce System-First Answers and Disclosed Internet Fallback

**Files:**

- Modify: `netlify/functions/lib/line-ai/gemini.js`
- Modify: `netlify/functions/lib/line-ai/orchestrator.js`
- Modify: `netlify/functions/lib/line-ai/flex.js`
- Modify: `netlify/functions/lib/line-ai/webhook-core.js`
- Modify: `src/__tests__/line-ai-gemini.test.js`
- Modify: `src/__tests__/line-ai-orchestrator.test.js`
- Modify: `src/__tests__/line-ai-tools-flex.test.js`
- Modify: `src/__tests__/line-webhook.test.js`

**Interfaces:**

- Planner output adds `catalogIds: string[]`; removes authority to select raw table names.
- `gemini.searchExternal(apiKey, modelName, { question, history })` returns `{ text, sources: { title, url }[] }`.
- `orchestrator.answer({ userId, text })` keeps returning `{ messages, sourceType }`.

- [ ] **Step 1: Write failing routing tests**

Add tests proving:

1. Identity is resolved before planning.
2. Planner sees only catalog entries allowed for that role.
3. System gateway runs for factual requests.
4. External search is not called when system evidence exists.
5. External search is called when evidence is empty.
6. External answer starts with the exact Thai disclosure.
7. External citations are rendered as links.
8. Hidden/private requests do not trigger web reconstruction.

```js
expect(gemini.searchExternal).not.toHaveBeenCalled();
expect(result.sourceType).toBe('system');

expect(externalResult.messages[0].text).toMatch(
  /^ไม่พบข้อมูลนี้ในระบบ คำตอบต่อไปนี้ค้นจากอินเทอร์เน็ต/
);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/__tests__/line-ai-gemini.test.js src/__tests__/line-ai-orchestrator.test.js src/__tests__/line-ai-tools-flex.test.js src/__tests__/line-webhook.test.js`

Expected: FAIL because planner, gateway routing, and external source rendering are absent.

- [ ] **Step 3: Make planner catalog-aware**

Pass allowed catalog summaries `{ id, title, description, aliases }` into `gemini.plan`. Add `catalogIds` to the JSON schema; validate against the passed allowlist and cap at 5. Keep specialized tools `personnel_summary`, `latest_weather`, `fire_hotspots`, `disease_forecast`, `area_summary`, and `area_search`; replace raw `global_search` table selection with catalog gateway retrieval. The planner never receives PII field names.

- [ ] **Step 4: Add external grounded search**

Implement `searchExternal` using the existing Gemini request helper and `tools: [{ google_search: {} }]`. Parse citations only from `candidate.groundingMetadata.groundingChunks[].web`, reject non-HTTP(S) URLs, deduplicate by URL, and return at most three sources. Return no answer when grounding produces no source links; uncited model text is not an acceptable internet answer.

- [ ] **Step 5: Rewire orchestrator**

Inside `answer`:

1. Resolve identity.
2. Load role-filtered catalog summaries.
3. Plan.
4. Search system gateway and specialized tools.
5. If evidence exists, synthesize strictly from evidence, render system links, store source type `system`, and cache for two hours only when history-independent.
6. If the user asked for hidden private identity, return a privacy-safe refusal and stop.
7. If evidence is empty, call `searchExternal`, prepend disclosure, render cited links, store source type `internet`, and do not place it in `line_ai_cache`.
8. If both sources fail, return `ไม่พบข้อมูลที่เชื่อถือได้ทั้งในระบบและจากการค้นอินเทอร์เน็ตค่ะ`.

Remove the current planner-controlled `needsGrounding` decision; fallback is based on actual empty system evidence.

- [ ] **Step 6: Render citations safely**

Extend `renderAiReply` with optional `sources`. System records still require the dashboard origin. External sources allow only parsed `https:` URLs returned by `searchExternal`; label cards `แหล่งข้อมูลจากอินเทอร์เน็ต`. Keep LINE's maximum five messages and three cards.

- [ ] **Step 7: Delete unreachable legacy message branches**

In `handleMessageEvent`, retain greeting, help/menu, link command, and AI dispatch. Delete the text-command branches below the unconditional `text.length >= 2` AI return (`สภาพอากาศ`, `ไฟป่า`, `ค้นหา:`, `แปลงใหญ่:`, local vent/goodbye, and global-search fallback). Keep postback handlers and their Flex builders because menu buttons still use them.

- [ ] **Step 8: Run focused tests**

Run: `pnpm vitest run src/__tests__/line-ai-gemini.test.js src/__tests__/line-ai-orchestrator.test.js src/__tests__/line-ai-tools-flex.test.js src/__tests__/line-webhook.test.js`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add netlify/functions/lib/line-ai/gemini.js netlify/functions/lib/line-ai/orchestrator.js netlify/functions/lib/line-ai/flex.js netlify/functions/lib/line-ai/webhook-core.js src/__tests__/line-ai-gemini.test.js src/__tests__/line-ai-orchestrator.test.js src/__tests__/line-ai-tools-flex.test.js src/__tests__/line-webhook.test.js
git commit -m "feat(line): answer system-first with cited web fallback"
```

---

### Task 9: Full-Story Verification and Operations Notes

**Files:**

- Create: `src/__tests__/line-system-knowledge.acceptance.test.js`
- Modify: `README.md`
- Modify: `docs/manual/11-sop-ผู้ดูแลระบบ.md`

**Interfaces:**

- Produces: one acceptance matrix for public, staff, manuals, links, and internet fallback; deploy checklist for migrations and environment variables.

- [ ] **Step 1: Add acceptance matrix test**

Use mocked Gemini planning and deterministic Supabase fixtures for these questions:

```text
มีแปลงใหญ่มะพร้าวกี่กลุ่ม
ใครเป็นประธานศูนย์จัดการศัตรูพืช
เจ้าหน้าที่สำนักงานเกษตรจังหวัดมีใครบ้าง
อากาศล่าสุดเป็นอย่างไร
โรคอะไรเสี่ยงกับข้าว
นำเข้า CSV ยังไง
หน้า Data Dictionary อยู่ตรงไหน
วิธีแก้เมื่อเข้าสู่ระบบไม่ได้
ราคาข้าววันนี้เท่าไร
```

Assert public name questions contain no personal name; linked staff uses current role; CSV and navigation answers link registered pages; current price with no system evidence uses exact external disclosure and cited URL.

- [ ] **Step 2: Run acceptance test to verify behavior**

Run: `pnpm vitest run src/__tests__/line-system-knowledge.acceptance.test.js`

Expected: PASS after Tasks 1-8.

- [ ] **Step 3: Document deployment order**

Update README and SOP with this exact order:

1. Apply `supabase/line_account_linking.sql`.
2. Apply updated `supabase/global_search.sql`.
3. Set `LINE_AI_ENABLED=true`, Gemini key slots, LINE secret/token, Supabase service role, and `LINE_AI_GROUNDING_ENABLED=true` in Netlify.
4. Run `pnpm build:line-knowledge`.
5. Run focused tests and build.
6. Deploy to staff pilot.
7. Inspect sanitized logs for catalog IDs, result counts, source type, and latency only.
8. Enable public rollout after the privacy acceptance matrix passes.

- [ ] **Step 4: Run final verification**

Run:

```bash
pnpm build:line-knowledge
pnpm test
pnpm lint:src
pnpm build
git diff --check
```

Expected: all tests pass, lint exits 0, build succeeds, and `git diff --check` emits no output.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/line-system-knowledge.acceptance.test.js README.md docs/manual/11-sop-ผู้ดูแลระบบ.md netlify/functions/lib/line-ai/manual-index.json
git commit -m "test(line): verify complete knowledge flow"
```

---

## Execution Order and Review Gates

- Task 1 is an immediate privacy fix and may ship independently.
- Tasks 2-3 establish catalog and manual knowledge without changing LINE routing.
- Tasks 4-6 establish staff identity and may ship behind `LINE_AI_ENABLED`.
- Tasks 7-8 switch retrieval and fallback behavior; review privacy and source labeling together.
- Task 9 is required before public rollout.

After every task, review the commit for scope, run the listed focused tests, then continue. Do not combine SQL security, OTP, gateway, and orchestration into one commit.
