# Staging migration adoption and rollback

Status: locally validated on 19 July 2026; remote rollout is intentionally
blocked until the Supabase CLI is logged in and has fetched the existing
Staging history.

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

## Verified locally

`supabase start` applied both migrations to a clean local Docker database.

- A district editor saw only the request assigned to `District A`.
- A response for that assignment was accepted.
- A response for an unassigned request was rejected by RLS.
- Changing the assignment to another request was rejected by the trigger.

## Safe Staging rollout

1. Run `npx supabase login` and finish the browser sign-in.
2. Run `npx supabase migration fetch --linked` to save Staging's existing 23
   ledger entries locally. Do not reconstruct or delete that history manually.
3. Confirm `npx supabase migration list --linked` shows the old entries plus
   the two local migration files.
4. Mark only the baseline version as applied (ledger change only), then run a
   dry run. Apply only the RLS migration after the dry run shows exactly one
   pending version.
5. Test one district editor and one admin in Staging. If anything is wrong,
   apply the rollback SQL below immediately.

## Rollback

Use `supabase/rollback/20260718171606_restore_data_request_rls.sql` in the
Supabase SQL Editor. It restores the three pre-change editor policies from the
Staging snapshot. The schema backup above is retained as the source of truth
if a broader schema recovery is ever required.
