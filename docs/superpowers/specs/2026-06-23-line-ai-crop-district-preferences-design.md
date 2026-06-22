# LINE AI Crop and District Preferences Design

## Goal

Personalize disease and pest advice when a LINE user asks, using a saved crop and district. The latest message may override saved values for that reply. The bot never sends unsolicited alerts.

## User behavior

- `จำไว้ว่าปลูกข้าว อยู่สามพราน` saves crop `ข้าว` and district `สามพราน`.
- `ช่วงนี้ต้องระวังอะไร` uses both saved values.
- `แล้วกล้วยไม้ล่ะ` uses `กล้วยไม้` for this reply but keeps saved crop `ข้าว`.
- `เปลี่ยนเป็นกล้วยไม้ จำไว้` replaces the saved crop.
- `ลืมข้อมูลของฉัน` deletes the saved preference.

Only explicit save, change, or forget language mutates preferences. Inference from an ordinary question is temporary.

## Data model

Add `public.line_user_preferences` with one row per LINE user:

- `line_user_id text primary key`;
- `crop text`;
- `district text`;
- `updated_at timestamptz not null default now()`.

Crop is trimmed and limited to 50 characters. District must be one of the seven Nakhon Pathom districts. At least one of crop or district must be present.

Enable RLS with no `anon` or `authenticated` policy. Revoke public access. The Netlify LINE webhook accesses the table with the existing server-only Supabase service role. Upsert keeps storage bounded to one row per user.

## Request flow

1. Verify the LINE signature and obtain the LINE user ID.
2. Load that user's saved preference.
3. Ask the existing planner for structured fields: temporary crop, temporary district, and preference action (`none`, `save`, or `clear`).
4. Validate crop length and district allowlist server-side.
5. Apply explicit save or clear actions. Otherwise do not mutate storage.
6. Resolve effective context as `latest message override -> saved preference -> missing`.
7. For disease or pest questions, execute an allowlisted `disease_forecast` tool.
8. Synthesize a concise Thai answer from retrieved evidence.

Missing crop produces one focused clarification question. Missing district does not block a province-level answer.

## Disease forecast tool

Read only the newest row from `ai_disease_forecasts`, selecting `forecast_date`, `summary`, and `details`. Flatten the `details` JSON array in server code and retain entries whose `target_crop` matches the effective crop. Return only name, type, risk level, description, prevention, target crop, and forecast date.

The tool fixes the current schema mismatch: disease attributes are JSON fields inside `details`, not database columns. Gemini never receives SQL or unrestricted table access.

## District accuracy

Current disease forecasts and `daily_weather` are province-level; neither has a district column. District preference may personalize wording and dashboard links, but the bot must not claim that a risk was measured specifically in that district.

Required wording: province-level risk followed by advice for a grower in the saved district. District-specific claims require district-level evidence in a future dataset.

## Response shape

Lead with:

1. forecast date and crop;
2. highest relevant risk;
3. short reason;
4. practical prevention;
5. explicit note that evidence is province-level when a district is shown.

Return plain text for one or two risks. Use one Flex carousel capped at three cards for longer results.

## Privacy, cache, and errors

- Never log LINE user IDs, raw messages, or saved preferences.
- Personalized answers must not enter the shared public response cache. A cache key may be used only if it includes normalized crop and district and stores no user identifier.
- If preference storage fails, answer using temporary message context without saving.
- If forecast data is missing or stale, state that clearly and do not invent a risk.
- If no forecast matches the crop, show the province summary and ask whether the user wants another crop.

## Tests

One integration-focused test set covers:

- explicit save, update, and clear;
- ordinary-message override without persistence;
- user isolation and one-row upsert behavior;
- invalid district and overlong crop rejection;
- latest forecast selection and JSON detail filtering;
- province-level wording for a saved district;
- personalized cache isolation;
- storage and AI failure fallback.

## Success criteria

- A saved crop and district are reused across conversations.
- Latest-message values override only the current reply unless the user explicitly asks to remember them.
- Disease answers use the newest matching `details` evidence.
- No unsolicited LINE push is sent.
- No answer falsely presents province-level evidence as district-specific.
- No new dependency, scheduler, notification table, or vector database is added.

## Out of scope

- Proactive push notifications, cron jobs, and subscriptions.
- District-level disease prediction without district-level source data.
- Multiple farms or multiple saved crops per LINE user.
- Automatic preference updates inferred from ordinary conversation.
