# LINE Bot System Knowledge Design

**Date:** 2026-07-10

## Goal

Make the LINE bot answer questions about all registered system data, pages, and manuals, then link users to the relevant page. The bot remains read-only for business data. It searches the internet only when registered system sources have no answer and clearly labels external answers.

## Scope

The bot must cover:

- Structured agricultural and administrative data registered in `datasetCatalog`.
- Counts, summaries, lists, and geographic breakdowns supported by registered datasets.
- System pages, navigation, permissions, and feature descriptions.
- Manuals, including data entry, CSV import, administration, and troubleshooting.
- Current external information only when system search returns no usable evidence.

The bot must not create, update, delete, approve, import, or submit business data. Account linking and conversation storage are supporting system writes, not business-data operations.

## Source of Truth

`src/domain/datasetCatalog.json` becomes the allowlist and semantic registry for LINE knowledge. A dataset, page, or manual is unavailable to the bot until it is registered there.

Each catalog entry must define:

- Stable identifier and kind: structured dataset, system page, or manual.
- Thai title, description, aliases, and supported question topics.
- Source table/RPC or documentation path.
- Dashboard/public route.
- Minimum access level.
- Explicit selectable fields.
- Searchable and filterable fields.
- PII fields and public-display policy.
- Date/freshness field when available.

Existing `TABLE_ROUTES` consumers must continue to work. Catalog expansion must preserve that interface or migrate all consumers in the same change.

## Architecture

```text
LINE webhook
  -> resolve public or linked staff identity
  -> Gemini planner selects catalog IDs and structured filters
  -> knowledge gateway validates catalog, role, fields, and filters
  -> search registered DB sources and registered manuals/pages
  -> privacy projection removes disallowed PII before AI sees evidence
  -> Gemini synthesizes an evidence-bound Thai answer
  -> renderer adds source status, freshness, and allowlisted links
  -> if system evidence is empty, external search runs and is disclosed
```

The AI planner may choose only catalog IDs and bounded filter values. It may not provide SQL, table names outside the catalog, column lists, arbitrary URLs, or authorization decisions.

The knowledge gateway is the single enforcement point for dataset access, selected fields, filters, result limits, PII removal, and safe links. Existing specialized tools remain for computations that generic search cannot answer correctly, such as district summaries and personnel counts.

## Identity and Authorization

Unlinked LINE users are public users. Staff link LINE to an existing portal account using a one-time code generated from the profile page.

The one-time code must:

- Be stored as a hash, never plaintext.
- Expire after 10 minutes.
- Be usable once.
- Be invalidated immediately after successful linking.
- Resolve to the existing profile and role; it must not create or elevate a role.

The permanent link stores the LINE user ID, profile ID, and link timestamps. Authorization always reads the current portal role so later role changes apply without relinking.

## Privacy and PDPA

Public responses currently hide all personal data, including farmer names, center-chair names, phone numbers, addresses, emails, LINE IDs, and equivalent identifying fields. Public users may receive non-identifying counts, categories, locations at an allowed granularity, organization/group names when not personal, and links to public-safe pages.

Privacy is enforced before evidence reaches Gemini. Prompt instructions are defense in depth only and must never decide whether a field is public.

Future public name disclosure requires both:

1. The catalog policy explicitly permits consent-based disclosure for that field.
2. The source record contains valid consent for the intended public purpose.

Until a consent schema and signed-data workflow are implemented, the gateway treats every personal-name field as non-public. Missing, expired, ambiguous, or malformed consent means hidden.

Logs must exclude raw webhook bodies, access tokens, one-time codes, and returned PII. Operational logs may contain request IDs, selected catalog IDs, source type, durations, result counts, and sanitized error codes.

## System Knowledge

Structured data uses existing Supabase RPC/search and focused aggregate tools. The catalog constrains which sources and fields each operation may use.

Manual knowledge uses only files registered in the catalog. Registered Markdown content is indexed for keyword/full-text retrieval during the build or deployment workflow. Vector search is not included initially; native full-text search is sufficient until measured retrieval failures justify more infrastructure.

Page knowledge comes from registered titles, descriptions, aliases, access levels, and routes. Internal links are returned only to linked users whose role can access the destination. Public users receive public routes only.

## Search and Answer Policy

For every question:

1. Search registered system sources first.
2. If usable evidence exists, answer from evidence only, identify it as system data, include the data date when available, and provide relevant allowlisted links.
3. If no usable system evidence exists, run external web search.
4. External answers must begin with: `ไม่พบข้อมูลนี้ในระบบ คำตอบต่อไปนี้ค้นจากอินเทอร์เน็ต`.
5. External answers must include source links and must not be cached as system truth.
6. If external search also fails, say that no reliable information was found. Do not guess.

Internet search never bypasses system authorization. A public user asking for private system data receives a privacy-safe response; the bot must not use the internet to reconstruct or reveal the hidden identity.

## Response Format

Responses are concise Thai text plus optional LINE Flex cards. A response may contain:

- Source label: system or internet.
- Direct answer based on returned evidence.
- Data date or freshness note when available.
- Up to three compact result cards.
- Links restricted to catalog routes or cited external sources.

The bot does not expose internal table names, RPC names, prompts, access rules, or raw JSON.

## Failure Handling

- Invalid LINE signature: reject the webhook.
- Missing/expired/reused link code: return a short failure message without revealing account existence.
- Planner returns unknown catalog ID or invalid filters: reject the plan and ask a safe clarification.
- Dataset query fails: log a sanitized error and continue only with other successful system evidence.
- AI synthesis fails: return a deterministic summary of system evidence when possible.
- LINE reply token expires: use the existing push fallback only for the same verified LINE user.
- External search fails: state that no reliable answer was found.

## Testing and Acceptance Criteria

The implementation is accepted when automated checks prove:

- Every bot-supported dataset, page, and manual is registered in the catalog.
- Unknown catalog IDs, fields, filters, and URLs are rejected.
- Public queries across every registered dataset never return configured PII.
- Linked staff access follows the current portal role.
- One-time codes expire after 10 minutes and cannot be reused.
- System search always runs before external search.
- External search runs only when system evidence is empty and always carries the required disclosure and citations.
- System answers include only allowlisted links.
- Representative questions pass for personnel, farmer groups, large plots, weather, fire hotspots, crop disease, system navigation, CSV import, permissions, and troubleshooting.
- Existing LINE webhook, AI orchestrator, global search, and Flex-message tests remain green.

## Rollout

1. Complete catalog coverage and privacy checks without changing public behavior.
2. Enable the gateway and system/manual retrieval for linked staff.
3. Validate sanitized logs and representative question results.
4. Enable the same pipeline for public users with strict PII projection.
5. Add consent-based public names only after the consent schema and signed records exist.

## Explicit Non-Goals

- No business-data mutation from LINE.
- No automatic database/schema discovery.
- No unregistered pages or manuals.
- No vector database in the first version.
- No public personal names before consent enforcement exists.
- No internet answer presented as system data.
