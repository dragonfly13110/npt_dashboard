# Environment Configuration

This project must not rely on hardcoded service keys. Configure these values in local `.env` files, GitHub Secrets, and Netlify environment variables.

## Client Variables

- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key for browser access.

## Netlify Function Variables

- `SUPABASE_SERVICE_ROLE_KEY`: Server-only Supabase key for scheduled imports and protected writes.
- `GISTDA_API_KEY`: Server-only GISTDA API key.
- `METEOSTAT_API_KEY`: Server-only RapidAPI Meteostat key.
- `GEMINI_API_KEY`: Server-only Gemini API key.
- `OPENROUTER_API_KEY`: Server-only OpenRouter API key.
- `NVIDIA_API_KEY`: Server-only NVIDIA API key.
- `ALLOWED_ORIGINS`: Comma-separated origins allowed to call sensitive functions, for example `http://localhost:5173,https://example.netlify.app`.

## GitHub Actions

The main CI workflow does not need production secrets. Keep E2E disabled until separate CI-safe Supabase credentials are available.

## Required Rotation

Any key that has previously appeared in source history must be rotated in its provider dashboard. Removing a key from source prevents future exposure, but it does not invalidate old copies in git history.
