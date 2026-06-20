# LINE AI Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build quota-safe LINE AI assistant using Supabase-first retrieval, Gemini Flash Lite, five-key round-robin failover, 10-message memory, selective Google Search grounding, concise text, and valid Flex results.

**Architecture:** Keep `line-webhook.cjs` as LINE transport. Add focused CommonJS modules under `netlify/functions/lib/line-ai/`; orchestrator returns messages but never sends LINE replies. Supabase stores memory, quota events, cache, and key health; Gemini can request only allowlisted data tools.

**Tech Stack:** Netlify Functions, Node.js/CommonJS, Vitest, Supabase/Postgres, Gemini `generateContent`, LINE Messaging API.

---

## File map

- Create `supabase/line_ai_chatbot.sql`: private tables, indexes, grants, atomic quota RPC.
- Create `netlify/functions/lib/line-ai/config.cjs`: validated env config and limits.
- Create `netlify/functions/lib/line-ai/store.cjs`: memory, cache, usage, key-health persistence.
- Create `netlify/functions/lib/line-ai/key-pool.cjs`: round-robin selection, cooldown, bounded failover.
- Create `netlify/functions/lib/line-ai/gemini.cjs`: model discovery, planner, synthesis, grounding.
- Create `netlify/functions/lib/line-ai/tools.cjs`: allowlisted Supabase tools only.
- Create `netlify/functions/lib/line-ai/flex.cjs`: valid LINE Flex rendering and payload validation.
- Create `netlify/functions/lib/line-ai/orchestrator.cjs`: routing pipeline; no transport side effects.
- Modify `netlify/functions/line-webhook.cjs`: invoke orchestrator once, send one reply, redact logs.
- Modify `.env.example`: document server-only AI config.
- Create focused tests under `src/__tests__/line-ai-*.test.js`.
- Modify `src/__tests__/line-webhook.test.js`: integration/fallback/single-reply coverage.

---

### Task 1: Private Supabase state and atomic quota claim

**Files:**

- Create: `supabase/line_ai_chatbot.sql`
- Create: `src/__tests__/line-ai-schema.test.js`

- [ ] **Step 1: Write failing schema contract test**

```js
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/line_ai_chatbot.sql', 'utf8');

describe('LINE AI schema', () => {
  it.each([
    'line_conversations',
    'line_ai_usage',
    'line_ai_cache',
    'line_ai_key_health',
  ])('creates private table %s', (table) => {
    expect(sql).toMatch(
      new RegExp(`create table if not exists public\\.${table}`, 'i')
    );
    expect(sql).toMatch(
      new RegExp(`alter table public\\.${table} enable row level security`, 'i')
    );
    expect(sql).toMatch(
      new RegExp(
        `revoke all on table public\\.${table} from anon, authenticated`,
        'i'
      )
    );
  });

  it('defines atomic quota RPC', () => {
    expect(sql).toMatch(
      /create or replace function public\.claim_line_ai_quota/i
    );
    expect(sql).toMatch(/pg_advisory_xact_lock/i);
  });
});
```

- [ ] **Step 2: Run test; verify missing-file failure**

Run: `npm test -- --run src/__tests__/line-ai-schema.test.js`

Expected: FAIL with `ENOENT: no such file or directory, open 'supabase/line_ai_chatbot.sql'`.

- [ ] **Step 3: Add schema and RPC**

```sql
begin;

create table if not exists public.line_conversations (
  id bigint generated always as identity primary key,
  line_user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  source_type text,
  created_at timestamptz not null default now()
);
create index if not exists line_conversations_user_created_idx
  on public.line_conversations (line_user_id, created_at desc);

create table if not exists public.line_ai_usage (
  id bigint generated always as identity primary key,
  line_user_id text not null,
  usage_type text not null check (usage_type in ('ai', 'grounding')),
  key_slot smallint,
  created_at timestamptz not null default now()
);
create index if not exists line_ai_usage_user_type_created_idx
  on public.line_ai_usage (line_user_id, usage_type, created_at desc);

create table if not exists public.line_ai_cache (
  cache_key text primary key,
  response jsonb not null,
  source_type text not null,
  model text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists line_ai_cache_expiry_idx
  on public.line_ai_cache (expires_at);

create table if not exists public.line_ai_key_health (
  key_slot smallint primary key check (key_slot between 1 and 5),
  status text not null default 'active' check (status in ('active', 'disabled')),
  consecutive_failures integer not null default 0,
  cooldown_until timestamptz,
  last_used_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now()
);

alter table public.line_conversations enable row level security;
alter table public.line_ai_usage enable row level security;
alter table public.line_ai_cache enable row level security;
alter table public.line_ai_key_health enable row level security;
revoke all on table public.line_conversations from anon, authenticated;
revoke all on table public.line_ai_usage from anon, authenticated;
revoke all on table public.line_ai_cache from anon, authenticated;
revoke all on table public.line_ai_key_health from anon, authenticated;
grant all on table public.line_conversations to service_role;
grant all on table public.line_ai_usage to service_role;
grant all on table public.line_ai_cache to service_role;
grant all on table public.line_ai_key_health to service_role;

create or replace function public.claim_line_ai_quota(
  p_user_id text,
  p_kind text,
  p_daily_limit integer,
  p_window_limit integer,
  p_window_seconds integer,
  p_key_slot smallint default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok');
  daily_count integer;
  window_count integer;
begin
  if p_kind not in ('ai', 'grounding') then raise exception 'invalid usage kind'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id || ':' || p_kind));
  select count(*) into daily_count from public.line_ai_usage
    where line_user_id = p_user_id and usage_type = p_kind and created_at >= day_start;
  select count(*) into window_count from public.line_ai_usage
    where line_user_id = p_user_id and usage_type = p_kind
      and created_at >= now() - make_interval(secs => p_window_seconds);
  if daily_count >= p_daily_limit then
    return jsonb_build_object('allowed', false, 'reason', 'daily', 'used', daily_count);
  end if;
  if p_window_limit > 0 and window_count >= p_window_limit then
    return jsonb_build_object('allowed', false, 'reason', 'window', 'used', window_count);
  end if;
  insert into public.line_ai_usage(line_user_id, usage_type, key_slot)
    values (p_user_id, p_kind, p_key_slot);
  return jsonb_build_object('allowed', true, 'used', daily_count + 1);
end $$;
revoke all on function public.claim_line_ai_quota(text,text,integer,integer,integer,smallint) from public, anon, authenticated;
grant execute on function public.claim_line_ai_quota(text,text,integer,integer,integer,smallint) to service_role;

commit;
```

- [ ] **Step 4: Run schema test**

Run: `npm test -- --run src/__tests__/line-ai-schema.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/line_ai_chatbot.sql src/__tests__/line-ai-schema.test.js
git commit -m "feat(line-ai): add private state and quota schema"
```

---

### Task 2: Config and five-key round-robin pool

**Files:**

- Create: `netlify/functions/lib/line-ai/config.cjs`
- Create: `netlify/functions/lib/line-ai/key-pool.cjs`
- Create: `src/__tests__/line-ai-key-pool.test.js`
- Modify: `.env.example`

- [ ] **Step 1: Write failing pool tests**

```js
const { describe, expect, it, vi } = require('vitest');
const {
  createKeyPool,
} = require('../../netlify/functions/lib/line-ai/key-pool.cjs');

describe('Gemini key pool', () => {
  it('uses healthy slots round-robin', async () => {
    const store = {
      listHealthyKeySlots: vi.fn().mockResolvedValue([2, 1]),
      markKeyUsed: vi.fn(),
      markKeyHealthy: vi.fn(),
      markKeyFailure: vi.fn(),
    };
    const pool = createKeyPool({
      keys: new Map([
        [1, 'a'],
        [2, 'b'],
      ]),
      store,
    });
    await expect(pool.run((_key, slot) => slot)).resolves.toBe(2);
    expect(store.markKeyUsed).toHaveBeenCalledWith(2);
  });

  it('cools 429 slot and retries next key once', async () => {
    const store = {
      listHealthyKeySlots: vi.fn().mockResolvedValue([1, 2]),
      markKeyUsed: vi.fn(),
      markKeyHealthy: vi.fn(),
      markKeyFailure: vi.fn(),
    };
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('quota'), { status: 429, retryAfterMs: 3000 })
      )
      .mockResolvedValueOnce('ok');
    const pool = createKeyPool({
      keys: new Map([
        [1, 'a'],
        [2, 'b'],
      ]),
      store,
    });
    await expect(pool.run(operation)).resolves.toBe('ok');
    expect(store.markKeyFailure).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ cooldownMs: 3000 })
    );
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test; verify module-not-found failure**

Run: `npm test -- --run src/__tests__/line-ai-key-pool.test.js`

Expected: FAIL with `Cannot find module '../../netlify/functions/lib/line-ai/key-pool.cjs'`.

- [ ] **Step 3: Implement config and pool**

```js
// config.cjs
function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}
function int(name, fallback) {
  const value = Number(env(name));
  return Number.isFinite(value) ? value : fallback;
}
function getLineAiConfig() {
  const keys = new Map();
  for (let slot = 1; slot <= 5; slot += 1) {
    const value = env(`GEMINI_API_KEY_${slot}`).trim();
    if (value) keys.set(slot, value);
  }
  return {
    enabled: env('LINE_AI_ENABLED') === 'true',
    keys,
    model: env('LINE_AI_MODEL') || 'gemini-3.1-flash-lite',
    fallbacks: (env('LINE_AI_FALLBACK_MODELS') || 'gemini-2.5-flash-lite')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    aiDailyLimit: int('LINE_AI_DAILY_LIMIT', 30),
    groundingDailyLimit: int('LINE_AI_GROUNDING_DAILY_LIMIT', 5),
    rollingLimit: int('LINE_AI_ROLLING_LIMIT', 5),
    rollingSeconds: int('LINE_AI_ROLLING_SECONDS', 600),
    requestTimeoutMs: int('LINE_AI_TIMEOUT_MS', 8000),
    adminIds: new Set(
      env('LINE_AI_ADMIN_IDS')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    ),
  };
}
module.exports = { getLineAiConfig };
```

```js
// key-pool.cjs
function classify(error) {
  if (error.status === 401 || error.status === 403)
    return { disable: true, cooldownMs: 0 };
  if (error.status === 429)
    return { disable: false, cooldownMs: error.retryAfterMs || 60000 };
  return { disable: false, cooldownMs: 60000 };
}
function createKeyPool({ keys, store }) {
  return {
    async run(operation) {
      const slots = (await store.listHealthyKeySlots([...keys.keys()])).filter(
        (slot) => keys.has(slot)
      );
      let lastError;
      for (const slot of slots.slice(0, 2)) {
        await store.markKeyUsed(slot);
        try {
          const result = await operation(keys.get(slot), slot);
          await store.markKeyHealthy(slot);
          return result;
        } catch (error) {
          lastError = error;
          await store.markKeyFailure(slot, {
            ...classify(error),
            code: String(error.status || 'network'),
          });
        }
      }
      throw (
        lastError ||
        Object.assign(new Error('No healthy Gemini key'), {
          code: 'NO_HEALTHY_KEY',
        })
      );
    },
  };
}
module.exports = { createKeyPool };
```

Add `.env.example` entries with empty example values: `GEMINI_API_KEY_1`…`GEMINI_API_KEY_5`, `LINE_AI_ENABLED=false`, model, fallback list, limits, timeout, admin IDs.

- [ ] **Step 4: Run pool tests**

Run: `npm test -- --run src/__tests__/line-ai-key-pool.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .env.example netlify/functions/lib/line-ai/config.cjs netlify/functions/lib/line-ai/key-pool.cjs src/__tests__/line-ai-key-pool.test.js
git commit -m "feat(line-ai): add config and Gemini key pool"
```

---

### Task 3: Memory, cache, quota, and key-health store

**Files:**

- Create: `netlify/functions/lib/line-ai/store.cjs`
- Create: `src/__tests__/line-ai-store.test.js`

- [ ] **Step 1: Write failing store tests**

```js
const { describe, expect, it, vi } = require('vitest');
const {
  createLineAiStore,
} = require('../../netlify/functions/lib/line-ai/store.cjs');

describe('LINE AI store', () => {
  it('loads only latest ten messages inside 24 hours', async () => {
    const range = vi
      .fn()
      .mockResolvedValue({
        data: [{ role: 'user', content: 'ล่าสุด' }],
        error: null,
      });
    const gte = vi.fn(() => ({ order: () => ({ range }) }));
    const supabase = {
      from: vi.fn(() => ({ select: () => ({ eq: () => ({ gte }) }) })),
    };
    const store = createLineAiStore(supabase);
    await expect(
      store.getHistory('U1', new Date('2026-06-20T10:00:00Z'))
    ).resolves.toHaveLength(1);
    expect(range).toHaveBeenCalledWith(0, 9);
  });

  it('claims quota through atomic RPC', async () => {
    const supabase = {
      rpc: vi
        .fn()
        .mockResolvedValue({
          data: { allowed: false, reason: 'daily' },
          error: null,
        }),
    };
    const store = createLineAiStore(supabase);
    await expect(
      store.claimQuota('U1', 'ai', { daily: 30, window: 5, seconds: 600 })
    ).resolves.toEqual({ allowed: false, reason: 'daily' });
  });
});
```

- [ ] **Step 2: Run test; verify failure**

Run: `npm test -- --run src/__tests__/line-ai-store.test.js`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement store interface**

```js
function assertOk(result) {
  if (result.error) throw result.error;
  return result.data;
}
function createLineAiStore(supabase) {
  return {
    async getHistory(userId, now = new Date()) {
      const since = new Date(now.getTime() - 86400000).toISOString();
      const query = await supabase
        .from('line_conversations')
        .select('role,content,source_type,created_at')
        .eq('line_user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(0, 9);
      return (assertOk(query) || []).reverse();
    },
    async appendMessage(userId, role, content, sourceType = null) {
      assertOk(
        await supabase
          .from('line_conversations')
          .insert({
            line_user_id: userId,
            role,
            content: content.slice(0, 4000),
            source_type: sourceType,
          })
      );
    },
    async claimQuota(userId, kind, limits, keySlot = null) {
      return assertOk(
        await supabase.rpc('claim_line_ai_quota', {
          p_user_id: userId,
          p_kind: kind,
          p_daily_limit: limits.daily,
          p_window_limit: limits.window,
          p_window_seconds: limits.seconds,
          p_key_slot: keySlot,
        })
      );
    },
    async getCache(cacheKey) {
      const result = await supabase
        .from('line_ai_cache')
        .select('response,source_type,model,expires_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      return assertOk(result);
    },
    async putCache(entry) {
      assertOk(await supabase.from('line_ai_cache').upsert(entry));
    },
    async listHealthyKeySlots(configured) {
      const result = await supabase
        .from('line_ai_key_health')
        .select('key_slot,status,cooldown_until,last_used_at')
        .in('key_slot', configured)
        .neq('status', 'disabled')
        .order('last_used_at', { ascending: true, nullsFirst: true });
      const now = Date.now();
      const rows = (assertOk(result) || []).filter(
        (row) => !row.cooldown_until || Date.parse(row.cooldown_until) <= now
      );
      const known = new Set(rows.map((row) => row.key_slot));
      return [
        ...rows.map((row) => row.key_slot),
        ...configured.filter((slot) => !known.has(slot)),
      ];
    },
    async markKeyUsed(slot) {
      assertOk(
        await supabase
          .from('line_ai_key_health')
          .upsert({
            key_slot: slot,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
      );
    },
    async markKeyHealthy(slot) {
      assertOk(
        await supabase
          .from('line_ai_key_health')
          .upsert({
            key_slot: slot,
            status: 'active',
            consecutive_failures: 0,
            cooldown_until: null,
            last_error_code: null,
            updated_at: new Date().toISOString(),
          })
      );
    },
    async markKeyFailure(slot, failure) {
      assertOk(
        await supabase
          .from('line_ai_key_health')
          .upsert({
            key_slot: slot,
            status: failure.disable ? 'disabled' : 'active',
            cooldown_until: failure.cooldownMs
              ? new Date(Date.now() + failure.cooldownMs).toISOString()
              : null,
            last_error_code: failure.code,
            updated_at: new Date().toISOString(),
          })
      );
    },
  };
}
module.exports = { createLineAiStore };
```

- [ ] **Step 4: Run store tests**

Run: `npm test -- --run src/__tests__/line-ai-store.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/lib/line-ai/store.cjs src/__tests__/line-ai-store.test.js
git commit -m "feat(line-ai): add memory quota cache store"
```

---

### Task 4: Gemini model discovery, structured planner, synthesis, grounding

**Files:**

- Create: `netlify/functions/lib/line-ai/gemini.cjs`
- Create: `src/__tests__/line-ai-gemini.test.js`

- [ ] **Step 1: Write failing client tests**

```js
const { describe, expect, it, vi } = require('vitest');
const {
  createGeminiClient,
} = require('../../netlify/functions/lib/line-ai/gemini.cjs');

describe('Gemini LINE client', () => {
  it('falls back to accessible configured model', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.5-flash-lite',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
          { status: 200 }
        )
      );
    const client = createGeminiClient({
      fetch,
      model: 'gemini-3.1-flash-lite',
      fallbacks: ['gemini-2.5-flash-lite'],
      timeoutMs: 8000,
    });
    await expect(client.resolveModel('key')).resolves.toBe(
      'gemini-2.5-flash-lite'
    );
  });

  it('enables google_search only for current intent', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'สด' }] } }],
          }),
          { status: 200 }
        )
      );
    const client = createGeminiClient({
      fetch,
      model: 'gemini-2.5-flash-lite',
      fallbacks: [],
      timeoutMs: 8000,
    });
    await client.synthesize('key', 'gemini-2.5-flash-lite', {
      question: 'ราคาวันนี้',
      history: [],
      evidence: [],
      grounding: true,
    });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.tools).toEqual([{ google_search: {} }]);
  });
});
```

- [ ] **Step 2: Run test; verify failure**

Run: `npm test -- --run src/__tests__/line-ai-gemini.test.js`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement bounded Gemini client**

Implement `createGeminiClient({ fetch, model, fallbacks, timeoutMs })` with:

```js
const PLAN_SCHEMA = {
  type: 'OBJECT',
  required: ['intent', 'searchTerms', 'tools', 'needsGrounding', 'answer'],
  properties: {
    intent: {
      type: 'STRING',
      enum: ['database', 'general', 'current', 'clarify'],
    },
    searchTerms: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 5 },
    tools: {
      type: 'ARRAY',
      items: {
        type: 'STRING',
        enum: ['global_search', 'latest_weather', 'fire_hotspots'],
      },
      maxItems: 3,
    },
    needsGrounding: { type: 'BOOLEAN' },
    answer: { type: 'STRING' },
    clarification: { type: 'STRING' },
  },
};
```

`resolveModel(apiKey)` calls `/v1beta/models`, keeps only `generateContent` models, selects requested model then configured fallbacks, and caches selection for 15 minutes per key slot. `plan(...)` sends history plus system rules, uses `responseMimeType: 'application/json'`, `responseSchema: PLAN_SCHEMA`, temperature `0.2`, and maximum 500 output tokens. Validate parsed plan: reject unknown keys/tools, truncate terms, force `needsGrounding=false` unless intent is `current`.

`synthesize(...)` sends evidence in delimited JSON, Thai brevity/source-label rules, temperature `0.3`, max 700 output tokens. Add `tools: [{ google_search: {} }]` only when `grounding === true`. Every request uses `AbortSignal.timeout(timeoutMs)`. Non-2xx responses throw errors carrying `status` and parsed `Retry-After`; returned text is extracted from `candidates[0].content.parts` and capped at 4000 characters.

- [ ] **Step 4: Run client tests**

Run: `npm test -- --run src/__tests__/line-ai-gemini.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/lib/line-ai/gemini.cjs src/__tests__/line-ai-gemini.test.js
git commit -m "feat(line-ai): add Gemini planning and grounded synthesis"
```

---

### Task 5: Allowlisted Supabase tools and Flex rendering

**Files:**

- Create: `netlify/functions/lib/line-ai/tools.cjs`
- Create: `netlify/functions/lib/line-ai/flex.cjs`
- Create: `src/__tests__/line-ai-tools-flex.test.js`

- [ ] **Step 1: Write failing allowlist/Flex tests**

```js
const { describe, expect, it, vi } = require('vitest');
const {
  executeTools,
} = require('../../netlify/functions/lib/line-ai/tools.cjs');
const {
  renderAiReply,
} = require('../../netlify/functions/lib/line-ai/flex.cjs');

describe('LINE AI tools and rendering', () => {
  it('rejects unknown tools before DB access', async () => {
    const supabase = { rpc: vi.fn(), from: vi.fn() };
    await expect(executeTools(supabase, ['raw_sql'], ['x'])).rejects.toThrow(
      'Tool not allowed'
    );
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it('uses contents, never bubbles, for Flex carousel', () => {
    const [message] = renderAiReply({
      text: 'พบข้อมูล',
      records: [
        {
          title: 'ส้มโอ',
          subtitle: 'สามพราน',
          url: 'https://npt-dashboard.netlify.app/dashboard',
        },
      ],
    });
    expect(message.contents).toEqual(
      expect.objectContaining({ type: 'carousel', contents: expect.any(Array) })
    );
    expect(message.contents).not.toHaveProperty('bubbles');
  });
});
```

- [ ] **Step 2: Run test; verify failure**

Run: `npm test -- --run src/__tests__/line-ai-tools-flex.test.js`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement explicit tool map and renderer**

```js
const TOOL_RUNNERS = {
  async global_search(supabase, terms) {
    const { data, error } = await supabase.rpc('global_search', {
      search_term: terms.join(' '),
      result_limit: 3,
    });
    if (error) throw error;
    return data || [];
  },
  async latest_weather(supabase) {
    const { data, error } = await supabase
      .from('daily_weather')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data || [];
  },
  async fire_hotspots(supabase) {
    const { data, error } = await supabase
      .from('fire_hotspots')
      .select('*')
      .order('acq_date', { ascending: false })
      .order('acq_time', { ascending: false })
      .limit(5);
    if (error) throw error;
    return data || [];
  },
};
async function executeTools(supabase, names, terms) {
  for (const name of names)
    if (!TOOL_RUNNERS[name]) throw new Error(`Tool not allowed: ${name}`);
  return Promise.all(
    names.map(async (name) => ({
      tool: name,
      data: await TOOL_RUNNERS[name](supabase, terms),
    }))
  );
}
module.exports = { executeTools };
```

`renderAiReply({ text, records })` returns one text message when records are absent. With records, return one Flex message whose `contents` is `{ type: 'carousel', contents: bubbles.slice(0, 10) }`; each bubble limits text lengths, validates dashboard URLs against `https://npt-dashboard.netlify.app/`, and includes one URI button. Export `validateLineMessages(messages)` to enforce 1–5 messages, known types, required `altText`, carousel `contents`, and no `bubbles` property before transport.

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/__tests__/line-ai-tools-flex.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/lib/line-ai/tools.cjs netlify/functions/lib/line-ai/flex.cjs src/__tests__/line-ai-tools-flex.test.js
git commit -m "feat(line-ai): add safe data tools and Flex rendering"
```

---

### Task 6: Quota-aware AI orchestrator

**Files:**

- Create: `netlify/functions/lib/line-ai/orchestrator.cjs`
- Create: `src/__tests__/line-ai-orchestrator.test.js`

- [ ] **Step 1: Write failing orchestration tests**

Test these exact cases with injected fakes:

```js
it('returns cache hit without quota or Gemini call', async () => {
  store.getCache.mockResolvedValue({
    response: { messages: [{ type: 'text', text: 'cached' }] },
  });
  await expect(
    orchestrator.answer({ userId: 'U1', text: 'ข้าว' })
  ).resolves.toMatchObject({ messages: [{ text: 'cached' }] });
  expect(store.claimQuota).not.toHaveBeenCalled();
  expect(keyPool.run).not.toHaveBeenCalled();
});
it('uses planner answer directly for general question in one AI call', async () => {
  gemini.plan.mockResolvedValue({
    intent: 'general',
    answer: 'คำตอบ',
    tools: [],
    needsGrounding: false,
  });
  await orchestrator.answer({ userId: 'U1', text: 'เล่าเรื่องข้าว' });
  expect(gemini.synthesize).not.toHaveBeenCalled();
});
it('uses planner then tools then synthesis for database question', async () => {
  gemini.plan.mockResolvedValue({
    intent: 'database',
    answer: '',
    tools: ['global_search'],
    searchTerms: ['ส้มโอ'],
    needsGrounding: false,
  });
  gemini.synthesize.mockResolvedValue('พบข้อมูล');
  await orchestrator.answer({ userId: 'U1', text: 'ส้มโออยู่ไหน' });
  expect(store.claimQuota).toHaveBeenCalledTimes(2);
  expect(executeTools).toHaveBeenCalledWith(
    supabase,
    ['global_search'],
    ['ส้มโอ']
  );
});
it('claims grounding quota only for current intent', async () => {
  gemini.plan.mockResolvedValue({
    intent: 'current',
    answer: '',
    tools: [],
    searchTerms: [],
    needsGrounding: true,
  });
  gemini.synthesize.mockResolvedValue('ข่าวล่าสุด');
  await orchestrator.answer({ userId: 'U1', text: 'ข่าววันนี้' });
  expect(store.claimQuota).toHaveBeenCalledWith(
    'U1',
    'grounding',
    expect.any(Object)
  );
});
it('returns deterministic limit message when daily quota denied', async () => {
  store.claimQuota.mockResolvedValue({ allowed: false, reason: 'daily' });
  const result = await orchestrator.answer({ userId: 'U1', text: 'ถาม AI' });
  expect(result.messages[0].text).toContain('โควต้า AI วันนี้หมด');
  expect(keyPool.run).not.toHaveBeenCalled();
});
it('falls back when every key fails', async () => {
  keyPool.run.mockRejectedValue(
    Object.assign(new Error('none'), { code: 'NO_HEALTHY_KEY' })
  );
  await expect(
    orchestrator.answer({ userId: 'U1', text: 'ถาม AI' })
  ).resolves.toBeNull();
});
```

- [ ] **Step 2: Run test; verify failure**

Run: `npm test -- --run src/__tests__/line-ai-orchestrator.test.js`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement dependency-injected orchestrator**

Export `createLineAiOrchestrator({ config, store, keyPool, gemini, executeTools, renderAiReply, clock })`. `answer({ userId, text })`:

1. Return `null` when disabled, missing user ID, text shorter than two characters, or no keys.
2. Normalize text and derive SHA-256 cache key from normalized question + model + public tool version; never include history in shared cache.
3. Return valid, unexpired cached response without quota claim.
4. Load 10-message history.
5. Claim AI quota unless user is in `adminIds`; return concise quota message when denied.
6. Run planner through key pool. General plan with non-empty `answer` returns immediately.
7. Execute allowlisted tools. For grounding, claim separate grounding quota; disable grounding when denied.
8. Claim second AI quota before synthesis. If denied, summarize retrieved records deterministically.
9. Synthesize through key pool, render/validate messages, cache only when history-independent and evidence is public.
10. Append user and assistant messages. Return `{ messages, sourceType }`; never call LINE transport.

All model invocations have two-key maximum attempts. Entire `answer` operation gets a 20-second deadline. Catch provider failures, emit structured metadata without text/key, and return `null` so existing deterministic search can continue.

- [ ] **Step 4: Run orchestrator tests**

Run: `npm test -- --run src/__tests__/line-ai-orchestrator.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/lib/line-ai/orchestrator.cjs src/__tests__/line-ai-orchestrator.test.js
git commit -m "feat(line-ai): add quota-aware response orchestrator"
```

---

### Task 7: Integrate once into LINE webhook; remove sensitive logs

**Files:**

- Modify: `netlify/functions/line-webhook.cjs`
- Modify: `src/__tests__/line-webhook.test.js`

- [ ] **Step 1: Add failing integration tests**

Add an orchestrator setter under `NODE_ENV=test`, then test:

```js
it('sends exactly one AI reply for free text', async () => {
  webhook.setLineAiOrchestrator({
    answer: vi
      .fn()
      .mockResolvedValue({
        messages: [{ type: 'text', text: 'คำตอบ AI' }],
        sourceType: 'general',
      }),
  });
  await webhook.handler(signedMessageEvent('ถามอะไรก็ได้'));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mockFetch.mock.calls[0][1].body).messages[0].text).toBe(
    'คำตอบ AI'
  );
});
it('falls through to existing DB search when AI returns null', async () => {
  webhook.setLineAiOrchestrator({ answer: vi.fn().mockResolvedValue(null) });
  await webhook.handler(signedMessageEvent('ส้มโอ'));
  expect(mockSupabase.rpc).toHaveBeenCalledWith('global_search', {
    search_term: 'ส้มโอ',
    result_limit: 3,
  });
});
it('never logs raw body, signature, user ID, or message text', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await webhook.handler(signedMessageEvent('ข้อความลับ'));
  expect(log.mock.calls.flat().join(' ')).not.toMatch(
    /ข้อความลับ|x-line-signature|rawBody|U-test/
  );
});
```

- [ ] **Step 2: Run tests; verify failure**

Run: `npm test -- --run src/__tests__/line-webhook.test.js`

Expected: FAIL because setter/integration does not exist and current debug logs expose raw webhook data.

- [ ] **Step 3: Wire modules and enforce one reply**

At module initialization, create config/store/pool/client/orchestrator only when Supabase and keys exist. In `handleMessageEvent`, preserve menu/weather/fire/prefixed deterministic commands. Before current global-search fallback:

```js
const aiResult = await lineAiOrchestrator?.answer({
  userId: event.source?.userId,
  text,
});
if (aiResult?.messages?.length) {
  await sendLineReply(replyToken, aiResult.messages);
  return;
}
```

Do not retry `sendLineReply` with same token after any LINE HTTP response. Validate messages before first request. Replace webhook logs with request ID, event count/type, duration, AI source, cache/quota outcome; remove signature, secret length, raw body, user identifier, and message content. Keep full raw body only in memory for HMAC verification and JSON parsing.

- [ ] **Step 4: Run webhook and focused AI tests**

Run: `npm test -- --run src/__tests__/line-webhook.test.js src/__tests__/line-ai-*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/line-webhook.cjs src/__tests__/line-webhook.test.js
git commit -m "feat(line-ai): integrate AI pipeline into LINE webhook"
```

---

### Task 8: Full verification, migration, staged rollout

**Files:**

- Modify: `docs/superpowers/specs/2026-06-20-line-ai-chatbot-design.md` only if verified implementation differs.

- [ ] **Step 1: Run full local verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all tests PASS, lint/build exit 0, no whitespace errors.

- [ ] **Step 2: Apply DB migration**

Run through existing migration mechanism with service credentials:

```bash
node scripts/run_migration.js supabase/line_ai_chatbot.sql
```

Expected: transaction commits; four tables and `claim_line_ai_quota` exist. If script accepts no path, use Supabase SQL editor and record execution timestamp in deployment notes; do not modify migration SQL ad hoc.

- [ ] **Step 3: Configure Netlify secrets/config**

Set server-only values:

```text
GEMINI_API_KEY_1 … GEMINI_API_KEY_5
LINE_AI_MODEL=gemini-3.1-flash-lite
LINE_AI_FALLBACK_MODELS=gemini-2.5-flash-lite
LINE_AI_ENABLED=false
LINE_AI_DAILY_LIMIT=30
LINE_AI_GROUNDING_DAILY_LIMIT=5
LINE_AI_ROLLING_LIMIT=5
LINE_AI_ROLLING_SECONDS=600
LINE_AI_TIMEOUT_MS=8000
LINE_AI_ADMIN_IDS=<authorized LINE user IDs>
```

Never create `VITE_` versions of keys. Verify env scopes include Functions/runtime.

- [ ] **Step 4: Deploy disabled, then admin-only smoke test**

Deploy with `LINE_AI_ENABLED=false`; signed empty webhook must return 200. Set `LINE_AI_ENABLED=true` with one admin ID. Test: deterministic menu, Supabase question, follow-up question, general question, current question with grounding, cache repeat, quota limit simulation, key `429` failover, and valid Flex list. Confirm one LINE reply/request and no sensitive logs.

- [ ] **Step 5: Enable small cohort then all users**

Observe for at least one business day: AI calls/user, grounding calls, cache hit rate, p50/p95 latency, provider error rate by slot, fallback rate, and LINE 4xx. Expand allowlist only when p95 stays below 20 seconds and LINE 4xx is zero. Then remove cohort restriction while retaining limits and kill switch.

- [ ] **Step 6: Final commit if rollout docs/config changed**

```bash
git add docs/superpowers/specs/2026-06-20-line-ai-chatbot-design.md
git commit -m "docs(line-ai): record verified rollout settings"
```

---

## Completion gate

- All focused and full tests pass.
- Migration applied once; private tables inaccessible to anon/authenticated.
- Requested model verified through live model discovery or configured fallback selected.
- Five authorized project keys rotate; secrets absent from repo/client/logs.
- Memory isolates users and retains at most 10 messages/24 hours.
- Quota/cache/grounding rules match spec.
- LINE sends at most one reply per event and all Flex payloads validate.
- Kill switch and deterministic fallback verified in production.
