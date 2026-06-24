create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.api_rate_limits (
  rate_key text primary key check (btrim(rate_key) <> ''),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table private.api_rate_limits enable row level security;
revoke all on table private.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.api_rate_limits to service_role;

create or replace function public.claim_api_rate_limit(
  p_rate_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row private.api_rate_limits%rowtype;
  v_now timestamptz := clock_timestamp();
  retry_after integer;
begin
  if p_rate_key is null or btrim(p_rate_key) = '' then
    raise exception 'rate key is required';
  end if;
  if p_limit is null or p_limit <= 0 then
    raise exception 'limit must be positive';
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'window seconds must be positive';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_rate_key));

  select *
  into current_row
  from private.api_rate_limits
  where rate_key = p_rate_key;

  if not found then
    insert into private.api_rate_limits (
      rate_key,
      window_started_at,
      request_count,
      updated_at
    )
    values (p_rate_key, v_now, 1, v_now)
    returning * into current_row;
  elsif current_row.window_started_at
    + pg_catalog.make_interval(secs => p_window_seconds) <= v_now then
    update private.api_rate_limits
    set window_started_at = v_now,
        request_count = 1,
        updated_at = v_now
    where rate_key = p_rate_key
    returning * into current_row;
  elsif current_row.request_count < p_limit then
    update private.api_rate_limits
    set request_count = request_count + 1,
        updated_at = v_now
    where rate_key = p_rate_key
    returning * into current_row;
  else
    retry_after := greatest(
      1,
      ceil(
        extract(
          epoch from (
            current_row.window_started_at
            + pg_catalog.make_interval(secs => p_window_seconds)
            - v_now
          )
        )
      )::integer
    );
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds', retry_after
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(0, p_limit - current_row.request_count),
    'retry_after_seconds', 0
  );
end;
$$;

revoke all on function public.claim_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_api_rate_limit(text, integer, integer) to service_role;
