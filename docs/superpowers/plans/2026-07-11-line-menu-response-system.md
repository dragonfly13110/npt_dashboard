# LINE Menu and Response System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Rich Menu, quick reply, Flex card, and free-text question route to the correct dataset and return a consistent, useful answer.

**Architecture:** Add one JSON catalog as the contract for menu actions, labels, and expected response kinds. Keep deterministic menu/postback handling separate from Gemini planning, while both paths reuse the same record metadata and Flex rendering. Add acceptance tests before changing the Rich Menu image.

**Tech Stack:** Node.js ESM/CJS, Netlify Functions, LINE Messaging API, Supabase, Gemini, Vitest

## Global Constraints

- Registration targets exist only at province level; district registration rows are actual results only.
- Registration and parcel drawing are separate datasets and intents.
- Known menu actions must not require Gemini.
- Free-text questions may use Gemini, but database claims must come from tool evidence.
- Do not add dependencies.

## Instructions for a Small AI Model

- Execute exactly one task at a time, in numeric order. Stop and report after each task.
- Before editing, read every file listed under that task plus the referenced tests.
- Preserve existing uncommitted changes. Never use `git reset`, `git checkout --`, or delete unrelated code.
- Use `apply_patch` for edits. Do not reformat whole files.
- Do not rename existing public functions unless the task explicitly requires it.
- Do not change Supabase schema, deploy Netlify, or activate a LINE Rich Menu unless the task explicitly says so.
- Run the exact focused test after each edit. Fix failures before proceeding.
- Report only: files changed, tests run, pass/fail, and remaining risk.
- If required behavior is unclear, stop and quote the exact ambiguity instead of guessing.

## Existing Work to Preserve

- `netlify/functions/lib/line-ai/gemini.js` contains registration-versus-GIS routing corrections.
- `netlify/functions/lib/line-ai/orchestrator.js` contains province-target and district-actual registration card corrections.
- `supabase/global_search.sql` exposes registration `target` and `total_updated_households`.
- `scripts/check-registration-intents.mjs` is a delayed live Gemini routing check and may be reused in Task 4.

---

### Task 1: Establish one menu contract

**Files:**

- Create: `src/domain/lineMenuCatalog.json`
- Modify: `scripts/setup_rich_menu.cjs`
- Test: `src/__tests__/line-menu-catalog.test.js`

**Interfaces:**

- Produces: JSON entries with `action`, `label`, `displayText`, `responseKind`, and optional `route`.
- Consumed by: Rich Menu setup, postback dispatch tests, and card footer actions.

- [ ] Write a failing test asserting six unique Rich Menu actions, non-empty Thai labels, valid `postback|uri|message` types, and a handler mapping for every postback.
- [ ] Add catalog entries for `weather`, `fire`, `registration_summary`, `farmer_groups_menu`, `personnel_summary`, and dashboard URI.
- [ ] Replace duplicated payload labels/actions in `setup_rich_menu.cjs` with catalog reads.
- [ ] Run `npx vitest run src/__tests__/line-menu-catalog.test.js`; expect PASS.
- [ ] Commit: `refactor: centralize LINE menu contract`.

### Task 2: Make postback behavior deterministic and complete

**Files:**

- Modify: `netlify/functions/lib/line-ai/webhook-core.js`
- Modify: `netlify/functions/lib/line-ai/tools.js`
- Test: `src/__tests__/line-webhook.test.js`

**Interfaces:**

- Consumes: `action` values from `lineMenuCatalog.json`.
- Produces: exactly one validated LINE response for every known action and a useful fallback for unknown actions.

- [ ] Add failing webhook tests for all catalog postbacks, DB failure, empty data, and unknown action.
- [ ] Add `registration_summary` using `farmer_registry`; province card shows target and actual, district cards show actual only.
- [ ] Add `personnel_summary` through existing personnel summary logic instead of a second query definition.
- [ ] Keep weather/fire deterministic; normalize their empty/error responses.
- [ ] Return a menu/help response for unknown actions instead of silently ending.
- [ ] Run `npx vitest run src/__tests__/line-webhook.test.js`; expect PASS.
- [ ] Commit: `fix: make LINE postbacks deterministic`.

### Task 3: Give each data type an appropriate card

**Files:**

- Modify: `netlify/functions/lib/line-ai/flex.js`
- Modify: `netlify/functions/lib/line-ai/orchestrator.js`
- Test: `src/__tests__/line-ai-tools-flex.test.js`

**Interfaces:**

- Extend `renderAiReply({ text, records, sources })`; each record may include `kind`, `metric`, `secondaryMetric`, `status`, `url`, and `totalCount`.
- Preserve existing LINE Flex schema and URL validation.

- [ ] Add failing snapshots/assertions for four card kinds: `summary`, `record`, `alert`, and `source`.
- [ ] Render summary cards with metric first, record cards with name/location, alerts with date/severity, and source cards with source title.
- [ ] Standardize footer labels: `ดูรายละเอียด`, `ดูทั้งหมด N รายการ`, and `เปิดแหล่งข้อมูล`.
- [ ] Ensure province registration card says `เป้าหมายจังหวัด`; district cards never display target.
- [ ] Keep carousel at three cards and include total count in response text when results exceed three.
- [ ] Run `npx vitest run src/__tests__/line-ai-tools-flex.test.js`; expect PASS.
- [ ] Commit: `feat: tailor LINE cards to response type`.

### Task 4: Strengthen free-text routing and executive summaries

**Files:**

- Modify: `netlify/functions/lib/line-ai/gemini.js`
- Modify: `netlify/functions/lib/line-ai/orchestrator.js`
- Test: `src/__tests__/line-ai-gemini.test.js`
- Test: `src/__tests__/line-ai-orchestrator.test.js`

**Interfaces:**

- Planner continues returning allowlisted tools/tables.
- Add deterministic normalization after planning so invalid tool/table combinations are corrected before execution.

- [ ] Add a 30-question routing matrix covering provincial officers, district officers, and farmers.
- [ ] Add normalization rules: farmer registration always uses `global_search`; group counts use `area_summary`; named lists use `global_search`; GIS requires explicit drawing/map/coordinate wording.
- [ ] Add a bounded `province_overview` path combining only registration, personnel, farmer groups, large plots, budget, weather, and alerts.
- [ ] Synthesize overview answers with source date and missing-data notices; never fill missing metrics by inference.
- [ ] Run `npx vitest run src/__tests__/line-ai-gemini.test.js src/__tests__/line-ai-orchestrator.test.js`; expect PASS.
- [ ] Commit: `feat: improve LINE question routing`.

### Task 5: Redesign and activate the Rich Menu safely

**Files:**

- Replace: `public/nong_khaolam_richmenu.jpg`
- Modify: `scripts/setup_rich_menu.cjs`
- Create: `docs/line-rich-menu-runbook.md`

**Interfaces:**

- Image remains exactly `2500x1686` and matches catalog bounds.
- Setup script supports validation before any LINE API mutation.

- [ ] Design six cells around frequent jobs: weather, warnings, registration, farmer organizations, personnel, and dashboard/more.
- [ ] Add `--validate` to check dimensions, file type, bounds, duplicate actions, token presence, and handler coverage without calling LINE.
- [ ] Add `--activate` confirmation output showing menu ID and prior default menu ID; do not delete the prior menu automatically.
- [ ] Run `node scripts/setup_rich_menu.cjs --validate public/nong_khaolam_richmenu.jpg`; expect all checks PASS.
- [ ] Run full Vitest suite and one staging LINE account smoke test for all six cells.
- [ ] Commit: `feat: refresh LINE rich menu`.

### Task 6: Add operational checks

**Files:**

- Modify: `netlify/functions/lib/line-ai/webhook-core.js`
- Modify: `docs/line-rich-menu-runbook.md`
- Test: `src/__tests__/line-webhook.test.js`

**Interfaces:**

- Structured log fields: `eventType`, `action`, `tool`, `tables`, `resultCount`, `durationMs`, `outcome`.

- [ ] Add structured logs without message text, names, phone numbers, or LINE user IDs.
- [ ] Document weekly checks for unknown actions, empty-result rate, Gemini `429`, and failed LINE replies.
- [ ] Add regression command `npm test -- --run` and delayed live planner check command to run before deployment.
- [ ] Run `npm test -- --run`; expect PASS.
- [ ] Commit: `chore: add LINE response health checks`.

## Delivery Order

1. Tasks 1-2: correctness and contract.
2. Tasks 3-4: card quality and question intelligence.
3. Tasks 5-6: visual rollout and operations.

Do not activate a new Rich Menu until Tasks 1-4 pass; otherwise the new menu only exposes old routing problems more visibly.
