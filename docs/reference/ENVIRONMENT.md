# Environment Configuration

This project must not rely on hardcoded service keys. Configure these values in local `.env` files, GitHub Secrets, and Netlify environment variables.

## Client Variables

- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key for browser access.
- `VITE_LANDING_CHATBOT_API_URL`: Endpoint path/URL for the KKU Landing Chatbot API (defaults to `/api/kku/okmd/api/v1`).
- `VITE_LANDING_CHATBOT_API_KEY`: API Key for the KKU Landing Chatbot service.
- `VITE_LANDING_CHATBOT_PROVIDER`: The AI provider to use for the landing chatbot (e.g., `gemini` or `kku`).
- `VITE_LANDING_CHATBOT_MODEL`: The AI model to use for the landing chatbot (e.g., `gemini-3.5-flash-lite` or `deepseek-v4-flash`).
- Landing Chatbot uses only `GEMINI_API_KEY_1` through `GEMINI_API_KEY_5`; it does not fall back to `GEMINI_API_KEY`.

## Netlify Function Variables

- `SUPABASE_SERVICE_ROLE_KEY`: Server-only Supabase key for scheduled imports and protected writes.
- `VISITOR_IP_HASH_SALT`: Server-only random secret used to hash client IPs before persistent rate-limit claims.
- `GISTDA_API_KEY`: Server-only GISTDA API key.
- `METEOSTAT_API_KEY`: Server-only RapidAPI Meteostat key.
- `GEMINI_API_KEY`: Server-only Gemini API key.
- `OPENROUTER_API_KEY`: Server-only OpenRouter API key.
- `NVIDIA_API_KEY`: Server-only NVIDIA API key.
- `ALLOWED_ORIGINS`: Comma-separated origins allowed to call sensitive functions, for example `http://localhost:5173,https://example.netlify.app`.
- `LINE_CHANNEL_ACCESS_TOKEN`: Server-only LINE Messaging API token used for critical error alerts.
- `ERROR_ALERT_LINE_USER_IDS`: Comma-separated LINE user IDs that receive critical error alerts. Leave empty to log errors without sending LINE messages.

The AI proxy rate limiter also requires `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `VISITOR_IP_HASH_SALT`, plus the `supabase/api_rate_limits.sql` migration applied to the target project. It returns `503` instead of calling the AI provider when the shared rate-limit store is unavailable.

## GitHub Actions

The main CI workflow does not need production secrets. Keep E2E disabled until separate CI-safe Supabase credentials are available.

## Required Rotation

Any key that has previously appeared in source history must be rotated in its provider dashboard. Removing a key from source prevents future exposure, but it does not invalidate old copies in git history.
