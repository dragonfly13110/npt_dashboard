# Security Notes

## Dependency Audit

`xlsx` had known vulnerabilities without an upstream fix. The application should use CSV-first import/export flows instead of the `xlsx` package. If Excel import must return later, add a maintained parser with size limits, file type validation, and tests before accepting user-provided files.

## Public Data

Public/anonymous access should only expose selected public datasets and sanitized columns. Internal tables such as profiles, personnel, assets, budgets, data requests, and audit logs must stay authenticated and role-restricted at the database policy layer.

## Secrets

Hardcoded service keys were removed from runtime code. Rotate any previously committed Supabase, GISTDA, Meteostat, or AI provider keys.
