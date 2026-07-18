# Staging Schema Export Status

Verified on 18 July 2026 with read-only Supabase Management API queries.

## Confirmed Staging state

- 59 tables in the `public` schema
- 303 RLS policies in the `public` schema
- 51 functions in the `public` schema
- 23 recorded migrations, from
  `20260401055629_add_missing_authenticated_policies` through
  `20260716173133_drop_soil_series_geometry_gin_idx`

## Why a baseline is not committed yet

The migration ledger stores only migration names, not their SQL text. The
repository also has no `supabase/migrations/` chain. Reconstructing a baseline
from loose SQL files would risk replacing the current Staging policy state.

`supabase db pull` is the safe exporter, but it needs the remote database
password or a direct database URL. The available Management API token can run
read-only catalog queries but cannot produce a complete replayable dump.

## Exact next command

After adding `SUPABASE_DB_PASSWORD` to a local, uncommitted environment file:

```powershell
npx supabase@latest link --project-ref $env:SUPABASE_PROJECT_REF --password $env:SUPABASE_DB_PASSWORD
npx supabase@latest db pull staging_baseline --linked
```

Review the generated migration, run `supabase migration list --linked`, then
commit the exported baseline and its verification output.
