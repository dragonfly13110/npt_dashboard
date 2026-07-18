# Staging migration adoption and rollback

Status: deployed to Staging and verified on 19 July 2026.

## What is protected

- Rollback owner: project owner (`drago`).
- Schema/RLS backup: `C:\tmp\npt-dashboard-staging-backup-20260719\public-schema-and-data.sql`
- SHA-256: `297562CD2A9693AE220B3D889B3C4E7168464E89BD499BA44D966394283C8770`
- The backup is schema-only despite its historical filename: it has no
  `COPY` or `INSERT` statements and therefore contains no user data or PII.

## Migration sequence

1. `20260718171526_adopt_staging_public_schema_baseline.sql` is the current
   Staging public-schema snapshot. It is for new local databases only. It must
   be recorded as already applied on Staging; never run it against existing
   Staging because that database already has this schema.
2. `20260718171606_enforce_assigned_district_data_request_rls.sql` is the
   first real forward change. It permits `district_editor` only to read and
   submit responses for assignments in their own district, and prevents them
   from moving an assignment to another request.
3. `20260718175409_restrict_data_request_guard_function_execution.sql` and
   `20260718175726_revoke_guard_function_execution_from_api_roles.sql` remove
   direct API execution of the internal trigger functions.

## Verified locally

Before historical files were fetched, `supabase start` applied the baseline
and RLS migrations to a clean local Docker database.

- A district editor saw only the request assigned to `District A`.
- A response for that assignment was accepted.
- A response for an unassigned request was rejected by RLS.
- Changing the assignment to another request was rejected by the trigger.

## Completed Staging rollout

1. Fetched Staging's existing 23 migration files.
2. Recorded only the baseline (`20260718171526`) as applied; its schema SQL
   was not run against Staging.
3. Dry-run showed exactly one RLS migration, then applied it.
4. Verified all three Data Request tables still have RLS enabled and their
   nine expected policies are present.
5. Verified `anon` and `authenticated` cannot execute the internal guard
   functions directly.

## Known local limitation

The fetched legacy history begins after an earlier unrecorded base schema, so
`supabase db reset --local` cannot replay all 23 legacy files against an empty
database. Staging itself is consistent. Consolidating this old history into a
fresh-resettable chain is a separate migration-maintenance task; do not delete
or reorder the fetched files.

## Rollback

Use `supabase/rollback/20260718171606_restore_data_request_rls.sql` in the
Supabase SQL Editor. It restores the three pre-change editor policies from the
Staging snapshot. The schema backup above is retained as the source of truth
if a broader schema recovery is ever required.
