alter table public.ai_disease_forecasts
  add column if not exists sources jsonb not null default '[]'::jsonb,
  add column if not exists search_queries jsonb not null default '[]'::jsonb,
  add column if not exists model text,
  add column if not exists generation_mode text;
