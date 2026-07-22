# LINE AI Chatbot Design

## Goal

Upgrade the LINE chatbot from keyword matching into a concise, conversational assistant that prioritizes Nakhon Pathom agricultural data, supplements it with general Gemini knowledge, and uses Google Search grounding only for time-sensitive questions. The system must remain useful when AI quota or providers are unavailable.

## Success criteria

- Understand natural-language and follow-up questions using the latest 10 messages per LINE user.
- Prefer verified Supabase data over model knowledge.
- Answer in concise Thai (normally 2–5 lines).
- Use LINE Flex messages only for lists, structured records, and dashboard actions.
- Rotate five team-owned Google Project API keys without exposing them to clients or logs.
- Protect team quotas with per-user rate limits, grounding limits, caching, and graceful fallback.
- Never allow the model to execute arbitrary SQL or access data outside allowlisted tools.

## Architecture

The webhook processes each message through these stages:

1. Verify the LINE signature and identify the LINE user.
2. Handle deterministic commands and cache hits without calling AI.
3. Enforce rate, daily AI, and grounding budgets.
4. Load up to 10 recent messages for that user, limited to the last 24 hours.
5. Ask Gemini for a structured intent plan when interpretation is required.
6. Execute only allowlisted Supabase search tools; Gemini never emits executable SQL.
7. For current-information requests, optionally enable Google Search grounding.
8. Generate a concise answer grounded in the retrieved evidence.
9. Render plain text by default or a schema-valid Flex message for structured lists.
10. Persist the conversation, usage, cache entry, and non-secret key health metadata.

Simple general questions should use one model call. Questions that require database retrieval or analysis may use a planner call followed by one synthesis call. Deterministic commands, direct database matches, and cache hits use no model call.

## AI routing and grounding

The planner returns validated JSON containing:

- intent category;
- normalized search terms;
- allowlisted data tools to execute;
- whether current web information is necessary;
- desired answer format;
- whether one clarification question is required.

The server validates this plan before execution. Supabase evidence has highest priority, followed by grounded current web information, then general model knowledge. Responses label the source category as `ข้อมูลจากระบบ`, `ข้อมูลล่าสุดจากเว็บ`, or `ความรู้ทั่วไป`. If evidence is insufficient, the assistant asks one focused clarification question or states its uncertainty.

The primary requested model is `gemini-3.5-flash-lite`. At startup or first use, the server must verify that the configured account can access it. If unavailable, it selects an explicitly configured Flash Lite fallback that the account supports. A model name is never silently invented.

## Conversation memory

Conversation history is isolated by LINE user ID. The chatbot loads the latest 10 messages from the previous 24 hours. Older messages are excluded from prompts and may be deleted by scheduled cleanup. Shared cache entries never contain user-specific history, identifiers, or private results.

## Quota controls

Default limits per LINE user:

- 30 AI calls per calendar day in the configured Bangkok timezone;
- no more than 5 AI calls in a rolling 10-minute window;
- 5 Google Search grounding calls per day;
- deterministic commands, direct cache hits, and non-AI database responses do not consume AI quota.

Default cache lifetimes:

- general reusable answers: 6 hours;
- Supabase-derived answers: 10 minutes;
- current news, price, and weather answers: 5 minutes.

Cache keys include the normalized question, data/tool version, model, grounding mode, and relevant public filters. Personalized conversation context is never placed in shared cache entries. Administrators may be exempted through an explicit allowlist.

## API key pool

Keys are server-only environment variables named `GEMINI_API_KEY_1` through `GEMINI_API_KEY_5`. Each belongs to a team-authorized Google Project. Requests select healthy keys in round-robin order.

Failure behavior:

- `429`: honor `Retry-After` where available and cool down that key;
- timeout or `5xx`: cool down for one minute, then try the next healthy key;
- `401` or `403`: disable the key until configuration or a health check restores it;
- all keys unavailable: use deterministic database/search fallbacks and return a concise availability message.

Retries are bounded so one LINE reply token is used only once. Key values, request authorization headers, and full provider responses containing credentials must never be logged. Health state stores only key slot identifiers, timestamps, status, and failure counters.

## Data model

### `line_conversations`

Stores user-scoped message history: LINE user identifier, role, sanitized content, timestamps, and optional source metadata. Access is server-only.

### `line_ai_usage`

Stores per-user counters for AI calls, grounding calls, rolling-window activity, date bucket, and timestamps.

### `line_ai_cache`

Stores normalized public cache keys, response text or validated Flex payload, source type, expiry, model, and evidence version. It contains no private conversation history.

### `line_ai_key_health`

Stores only key slot number, last-used time, cooldown deadline, status, and failure counters. API key values remain exclusively in Netlify environment variables.

Database operations use the Supabase service role only inside the Netlify function. Tables must enable RLS and deny direct browser access.

## Response behavior

- Lead with the direct answer and keep normal replies to 2–5 short lines.
- Use Flex only for multiple records, structured summaries, or dashboard links.
- Include at most the most useful records and provide a dashboard button for deeper exploration.
- Ask one question when the request is materially ambiguous.
- Preserve the existing deterministic menu and database-search behavior as fallback.
- Never retry a LINE reply after LINE has consumed or rejected the reply token; validate payloads before the first send.

## Error handling and observability

Logs use request IDs and structured events for routing, cache outcome, model slot, latency, quota decisions, and normalized provider error class. Logs omit raw webhook bodies, LINE signatures, API keys, authorization headers, and private message content.

AI/provider failures do not fail the webhook. The function returns a deterministic database result or a short temporary-unavailability response. Invalid model plans, unsafe tool requests, malformed Flex payloads, and overlong responses are rejected or normalized before calling LINE.

## Testing

Automated tests cover:

- user-isolated memory, 10-message truncation, and 24-hour expiry;
- structured planner validation and allowlisted tool execution;
- Supabase-first evidence ordering and explicit source labeling;
- shared-cache privacy and TTL behavior;
- daily, rolling-window, grounding, and administrator quota behavior;
- round-robin selection, cooldowns, bounded retries, and total-provider failure;
- grounding only for current-information intent;
- LINE Flex schema validity and single-use reply-token behavior;
- removal of credentials, raw webhook payloads, and private content from logs;
- deterministic fallback when AI is unavailable;
- production-like webhook completion within the configured timeout budget.

## Rollout

Deploy behind `LINE_AI_ENABLED`. Start with administrator LINE IDs, then a small user cohort, then all users after observing latency, quota consumption, error rates, and cache hit rate. Keep deterministic commands available throughout rollout. Configuration changes to limits, model, key pool, and grounding do not require code changes.

## Out of scope

- User-visible model selection in LINE.
- Arbitrary SQL generation or execution.
- Unlimited general web browsing.
- Sharing conversation history across users.
- Treating multiple keys from one Google Project as independent quota pools.
