# Staging Schema Export Status

Verified on 18 July 2026 with read-only Supabase Management API queries.

## Confirmed Staging state

- 59 tables in the `public` schema
- 303 RLS policies in the `public` schema
- 51 functions in the `public` schema
- 23 recorded migrations, from
  `20260401055629_add_missing_authenticated_policies` through
  `20260716173133_drop_soil_series_geometry_gin_idx`

## Baseline adoption status

The migration ledger stores only migration names, not their SQL text. The
repository now has a baseline migration created from this snapshot, plus the
next RLS migration. The baseline must be recorded as already applied on the
existing Staging database; it must not be pushed as SQL because Staging already
has this schema. The remaining remote rollout steps and rollback owner are
documented in `docs/staging-migration-adoption.md`.

## Exported baseline snapshot

`supabase/staging_public_schema.sql` was exported from Staging with
`supabase db dump --linked --schema public`. It contains 59 tables and 303 RLS
policies, matching the catalog inventory. It also contains all 20
user-defined public functions; the other 31 public functions belong to
extensions and are intentionally not redefined. The dump contains no `COPY`
or `INSERT` statements, so it does not include table data or PII.

The remote migration ledger still does not match local files. This snapshot is
the source of truth for rebuilding a migration chain; do not apply it to the
existing Staging database or repair Staging migration history without a
separate rollout decision.

## Refresh command

To refresh the snapshot:

```powershell
npx supabase@latest link --project-ref $env:SUPABASE_PROJECT_REF --password $env:SUPABASE_DB_PASSWORD
npx supabase@latest db dump --linked --schema public --file supabase/staging_public_schema.sql
```

Review the snapshot before committing it. A future migration adoption step must
preserve Staging's 23 existing ledger entries before any new migration is
applied.
