begin;

create table if not exists public.line_conversations (
  id bigint generated always as identity primary key,
  line_user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  source_type text,
  created_at timestamptz not null default now()
);

create index if not exists line_conversations_user_created_idx
  on public.line_conversations (line_user_id, created_at desc);

create table if not exists public.line_ai_usage (
  id bigint generated always as identity primary key,
  line_user_id text not null,
  usage_type text not null check (usage_type in ('ai', 'grounding')),
  key_slot smallint,
  created_at timestamptz not null default now()
);

create index if not exists line_ai_usage_user_type_created_idx
  on public.line_ai_usage (line_user_id, usage_type, created_at desc);

create table if not exists public.line_ai_cache (
  cache_key text primary key,
  response jsonb not null,
  source_type text not null,
  model text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists line_ai_cache_expiry_idx
  on public.line_ai_cache (expires_at);

create table if not exists public.line_ai_key_health (
  key_slot smallint primary key check (key_slot between 1 and 5),
  status text not null default 'active' check (status in ('active', 'disabled')),
  consecutive_failures integer not null default 0,
  cooldown_until timestamptz,
  last_used_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now()
);

alter table public.line_conversations enable row level security;
alter table public.line_ai_usage enable row level security;
alter table public.line_ai_cache enable row level security;
alter table public.line_ai_key_health enable row level security;

revoke all on table public.line_conversations from anon, authenticated;
revoke all on table public.line_ai_usage from anon, authenticated;
revoke all on table public.line_ai_cache from anon, authenticated;
revoke all on table public.line_ai_key_health from anon, authenticated;

grant all on table public.line_conversations to service_role;
grant all on table public.line_ai_usage to service_role;
grant all on table public.line_ai_cache to service_role;
grant all on table public.line_ai_key_health to service_role;

create or replace function public.claim_line_ai_quota(
  p_user_id text,
  p_kind text,
  p_daily_limit integer,
  p_window_limit integer,
  p_window_seconds integer,
  p_key_slot smallint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  day_start timestamptz :=
    date_trunc('day', now() at time zone 'Asia/Bangkok')
      at time zone 'Asia/Bangkok';
  daily_count integer;
  window_count integer;
begin
  if p_kind not in ('ai', 'grounding') then
    raise exception 'invalid usage kind';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id || ':' || p_kind));

  select count(*)
  into daily_count
  from public.line_ai_usage
  where line_user_id = p_user_id
    and usage_type = p_kind
    and created_at >= day_start;

  select count(*)
  into window_count
  from public.line_ai_usage
  where line_user_id = p_user_id
    and usage_type = p_kind
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if daily_count >= p_daily_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily',
      'used', daily_count
    );
  end if;

  if p_window_limit > 0 and window_count >= p_window_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'window',
      'used', window_count
    );
  end if;

  insert into public.line_ai_usage (line_user_id, usage_type, key_slot)
  values (p_user_id, p_kind, p_key_slot);

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'used', daily_count + 1
  );
end;
$$;

revoke all on function public.claim_line_ai_quota(
  text, text, integer, integer, integer, smallint
) from public, anon, authenticated;

grant execute on function public.claim_line_ai_quota(
  text, text, integer, integer, integer, smallint
) to service_role;

commit;
