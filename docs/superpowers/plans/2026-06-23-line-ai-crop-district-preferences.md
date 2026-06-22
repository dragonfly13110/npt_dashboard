# LINE AI Crop and District Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Remember one crop and district per LINE user, allow temporary message overrides, and answer on-demand disease/pest questions from the latest province-level forecast without unsolicited pushes.

**Architecture:** Store one server-only preference row per LINE user in Supabase. Extend the existing Gemini planner with validated preference fields and a disease_forecast tool; the orchestrator resolves latest-message overrides over saved values, while the tool filters the newest ai_disease_forecasts.details JSON array. Cache keys include crop and district but never user IDs.

**Tech Stack:** Node.js CommonJS Netlify Functions, Supabase PostgreSQL and supabase-js, Gemini structured planning, LINE Messaging API, Vitest.

---

## File map

- Create: supabase/line_user_preferences.sql
- Modify: netlify/functions/lib/line-ai/store.cjs
- Modify: netlify/functions/lib/line-ai/gemini.cjs
- Modify: netlify/functions/lib/line-ai/tools.cjs
- Modify: netlify/functions/lib/line-ai/orchestrator.cjs
- Test: existing LINE AI tests under src/**tests**

### Task 1: Preference table and store API

**Files:**

- Create: supabase/line_user_preferences.sql
- Modify: netlify/functions/lib/line-ai/store.cjs
- Test: src/**tests**/line-ai-store.test.js

- [ ] **Step 1: Write failing store tests**

Test get, upsert, clear, and invalid district through createLineAiStore:

```js
it('upserts one normalized preference row', async () => {
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const supabase = { from: vi.fn().mockReturnValue({ upsert }) };
  const store = createLineAiStore(supabase);

  await store.savePreference('U1', {
    crop: ' ข้าว ',
    district: 'สามพราน',
  });

  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      line_user_id: 'U1',
      crop: 'ข้าว',
      district: 'สามพราน',
    }),
    { onConflict: 'line_user_id' }
  );
});

it('rejects an unknown district before DB access', async () => {
  const supabase = { from: vi.fn() };
  const store = createLineAiStore(supabase);

  await expect(
    store.savePreference('U1', { crop: 'ข้าว', district: 'กรุงเทพ' })
  ).rejects.toThrow('Invalid district');
  expect(supabase.from).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-store.test.js
```

Expected: FAIL because preference methods do not exist.

- [ ] **Step 3: Implement validation and CRUD**

Add DISTRICTS and normalizePreference to store.cjs. Crop is trimmed and capped at 50 characters. District must match the seven-value allowlist. Add:

```js
async getPreference(userId) {
  const result = await supabase
    .from('line_user_preferences')
    .select('crop,district')
    .eq('line_user_id', userId)
    .maybeSingle();
  return assertOk(result);
},

async savePreference(userId, preference) {
  const normalized = normalizePreference(preference);
  assertOk(await supabase.from('line_user_preferences').upsert(
    {
      line_user_id: userId,
      ...normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'line_user_id' }
  ));
  return normalized;
},

async clearPreference(userId) {
  assertOk(await supabase
    .from('line_user_preferences')
    .delete()
    .eq('line_user_id', userId));
},
```

- [ ] **Step 4: Create the SQL file**

```sql
create table if not exists public.line_user_preferences (
  line_user_id text primary key
    check (char_length(line_user_id) between 1 and 100),
  crop text check (crop is null or char_length(crop) between 1 and 50),
  district text check (district is null or district in (
    'เมืองนครปฐม','กำแพงแสน','นครชัยศรี','ดอนตูม',
    'บางเลน','สามพราน','พุทธมณฑล'
  )),
  updated_at timestamptz not null default now(),
  check (crop is not null or district is not null)
);

alter table public.line_user_preferences enable row level security;
revoke all on public.line_user_preferences from public, anon, authenticated;
grant all on public.line_user_preferences to service_role;
```

- [ ] **Step 5: Run GREEN and commit**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-store.test.js
git add supabase/line_user_preferences.sql netlify/functions/lib/line-ai/store.cjs src/__tests__/line-ai-store.test.js
git commit -m "add LINE user preferences"
```

### Task 2: Planner fields and safe actions

**Files:**

- Modify: netlify/functions/lib/line-ai/gemini.cjs
- Test: src/**tests**/line-ai-gemini.test.js

- [ ] **Step 1: Write a failing planner test**

Mock a plan containing crop, invalid district, invalid action, and disease_forecast. Assert crop is trimmed, district becomes null, action becomes none, and disease_forecast survives the tool allowlist.

```js
expect(result.tools).toEqual(['disease_forecast']);
expect(result.crop).toBe('ข้าว');
expect(result.district).toBeNull();
expect(result.preferenceAction).toBe('none');
```

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-gemini.test.js
```

- [ ] **Step 3: Extend PLAN_SCHEMA and sanitization**

Add required properties crop, district, and preferenceAction. Add disease_forecast to both tool allowlists. Update plan signature to accept preferences.

Prompt rules:

```text
Use disease_forecast for disease, pest, outbreak, or crop-risk questions.
crop and district contain values explicitly present in the latest message only.
preferenceAction=save only for explicit remember/change requests.
preferenceAction=clear only for explicit forget/delete requests.
Ordinary questions never mutate saved preferences.
```

Sanitize server-side:

```js
parsed.crop =
  String(parsed.crop || '')
    .trim()
    .slice(0, 50) || null;
parsed.district = DISTRICTS.includes(parsed.district) ? parsed.district : null;
parsed.preferenceAction = ['none', 'save', 'clear'].includes(
  parsed.preferenceAction
)
  ? parsed.preferenceAction
  : 'none';
```

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-gemini.test.js
git add netlify/functions/lib/line-ai/gemini.cjs src/__tests__/line-ai-gemini.test.js
git commit -m "plan LINE preference actions"
```

### Task 3: Saved values, overrides, and cache isolation

**Files:**

- Modify: netlify/functions/lib/line-ai/orchestrator.cjs
- Test: src/**tests**/line-ai-orchestrator.test.js

- [ ] **Step 1: Write failing behavior tests**

Add store mocks for getPreference, savePreference, and clearPreference. Test:

- saved ข้าว + สามพราน is used when the question contains no override;
- latest กล้วยไม้ overrides crop for one reply without savePreference;
- explicit save upserts the merged preference;
- explicit clear deletes it;
- disease request without any crop asks one clarification question.

The override assertion must be:

```js
expect(executeTools).toHaveBeenCalledWith(
  supabase,
  ['disease_forecast'],
  [],
  [],
  { crop: 'กล้วยไม้', district: 'สามพราน' }
);
expect(store.savePreference).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-orchestrator.test.js
```

- [ ] **Step 3: Implement preference resolution**

Load preference before cache lookup. A load/save/clear error logs only a fixed event name and does not fail the answer.

Resolve:

```js
const effectivePreference = {
  crop: plan.crop || savedPreference?.crop || null,
  district: plan.district || savedPreference?.district || null,
};
```

Pass saved preferences into gemini.plan. Apply save/clear only for explicit actions. Pass effectivePreference as the fifth executeTools argument.

Cache input becomes normalized question + saved crop + saved district + model + v3. Do not cache save/clear confirmations. Latest-message overrides remain safe because the normalized question is already part of the key.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-orchestrator.test.js
git add netlify/functions/lib/line-ai/orchestrator.cjs src/__tests__/line-ai-orchestrator.test.js
git commit -m "resolve LINE crop preferences"
```

### Task 4: Latest disease forecast tool

**Files:**

- Modify: netlify/functions/lib/line-ai/tools.cjs
- Test: src/**tests**/line-ai-tools-flex.test.js

- [ ] **Step 1: Write a failing tool test**

Mock the newest row with rice and orchid risks. Call executeTools with context crop ข้าว and district สามพราน. Assert only the rice risk remains, the scope is province, the date is retained, and the DB select is exactly forecast_date,summary,details.

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-tools-flex.test.js
```

- [ ] **Step 3: Implement disease_forecast**

Add context as the fifth executeTools argument. Query only the latest row:

```js
const { data, error } = await supabase
  .from('ai_disease_forecasts')
  .select('forecast_date,summary,details')
  .order('forecast_date', { ascending: false })
  .limit(1)
  .maybeSingle();
```

Filter details where target_crop and effective crop include each other after trim/lowercase. Sort สูง, ปานกลาง, ต่ำ; cap at three. Return only:

```js
{
  forecastDate,
  summary,
  risks: [{
    name,
    type,
    risk_level,
    description,
    prevention,
    target_crop,
  }],
  district: context.district || null,
  scope: 'province',
}
```

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-tools-flex.test.js
git add netlify/functions/lib/line-ai/tools.cjs src/__tests__/line-ai-tools-flex.test.js
git commit -m "query latest disease forecast"
```

### Task 5: Province-honest response and Flex cards

**Files:**

- Modify: netlify/functions/lib/line-ai/gemini.cjs
- Modify: netlify/functions/lib/line-ai/orchestrator.cjs
- Test: src/**tests**/line-ai-gemini.test.js
- Test: src/**tests**/line-ai-orchestrator.test.js

- [ ] **Step 1: Write failing response tests**

Assert synthesize receives effective preferences and this hard rule:

```text
Disease forecast evidence is province-level. A saved district is user context only. Never claim that risk was measured in that district.
```

Test one or two risks produce text only. Three risks produce three existing Flex records linked to /dashboard/protection/disease-forecast.

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-gemini.test.js src/__tests__/line-ai-orchestrator.test.js
```

- [ ] **Step 3: Add synthesis context and disease records**

Pass effectivePreference into gemini.synthesize. Extend formatDeterministicSummary for disease_forecast only when more than two risks:

```js
for (const risk of risks.slice(0, 3)) {
  records.push({
    title: risk.name || 'ความเสี่ยงโรคและแมลง',
    subtitle:
      (risk.target_crop || '-') + ' • ความเสี่ยง' + (risk.risk_level || '-'),
    totalCount: risks.length,
    url:
      'https://npt-dashboard.netlify.app/dashboard/protection/' +
      'disease-forecast',
  });
}
```

Reuse renderAiReply; it already caps Flex at three cards.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm.cmd test -- --run src/__tests__/line-ai-gemini.test.js src/__tests__/line-ai-orchestrator.test.js
git add netlify/functions/lib/line-ai/gemini.cjs netlify/functions/lib/line-ai/orchestrator.cjs src/__tests__/line-ai-gemini.test.js src/__tests__/line-ai-orchestrator.test.js
git commit -m "answer personalized disease risks"
```

### Task 6: Apply schema and verify

**Files:**

- Verify: supabase/line_user_preferences.sql
- Verify: all modified LINE AI files and tests

- [ ] **Step 1: Run all checks**

```powershell
npm.cmd test -- --run
npm.cmd run build
git diff --check
```

Expected: 177+ tests pass, build exits 0, diff check is silent.

- [ ] **Step 2: Apply SQL to Supabase**

Use Supabase MCP against npt_dashboard project cjjirwqoovypymndhvwt to execute the exact SQL file. Do not deploy Netlify.

- [ ] **Step 3: Verify access and one-row upsert**

```sql
select
  c.relrowsecurity as rls_enabled,
  has_table_privilege(
    'anon',
    'public.line_user_preferences',
    'select'
  ) as anon_select,
  has_table_privilege(
    'authenticated',
    'public.line_user_preferences',
    'select'
  ) as authenticated_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'line_user_preferences';
```

Expected: RLS true and both public selects false. Upsert a synthetic codex-preference-check twice, assert one row, then delete it.

- [ ] **Step 4: Run security and performance advisors**

Confirm no new advisor finding targets line_user_preferences beyond intentional RLS-with-no-public-policy information.

- [ ] **Step 5: Commit plan and publish implementation**

```powershell
git add docs/superpowers/plans/2026-06-23-line-ai-crop-district-preferences.md
git commit -m "plan LINE crop preferences"
git push
```

Update the existing draft PR. Do not merge or deploy Netlify without explicit user approval.
