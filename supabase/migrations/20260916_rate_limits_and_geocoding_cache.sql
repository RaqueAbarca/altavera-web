-- Protección anti-spam para endpoints públicos + caché del buscador de lugares.
-- Ejecutar en Supabase antes de depender del rate limiting en producción.

create table if not exists public.api_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.api_rate_limits%rowtype;
  v_now timestamptz := clock_timestamp();
  v_elapsed numeric;
begin
  if p_key is null or btrim(p_key) = '' then
    raise exception 'rate-limit key required';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate-limit settings';
  end if;

  -- Serializa únicamente solicitudes con la misma clave.
  perform pg_advisory_xact_lock(hashtext(p_key));

  select *
    into v_row
    from public.api_rate_limits
   where key = p_key
   for update;

  if not found then
    insert into public.api_rate_limits(key, window_started_at, request_count, updated_at)
    values (p_key, v_now, 1, v_now);
    return query select true, 0;
    return;
  end if;

  v_elapsed := extract(epoch from (v_now - v_row.window_started_at));

  if v_elapsed >= p_window_seconds then
    update public.api_rate_limits
       set window_started_at = v_now,
           request_count = 1,
           updated_at = v_now
     where key = p_key;
    return query select true, 0;
    return;
  end if;

  if v_row.request_count >= p_limit then
    return query
      select false, greatest(1, ceil(p_window_seconds - v_elapsed)::integer);
    return;
  end if;

  update public.api_rate_limits
     set request_count = request_count + 1,
         updated_at = v_now
   where key = p_key;

  return query select true, 0;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

create table if not exists public.geocoding_cache (
  cache_key text primary key,
  results jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.geocoding_cache enable row level security;
revoke all on table public.geocoding_cache from anon, authenticated;

create index if not exists geocoding_cache_expires_at_idx
  on public.geocoding_cache(expires_at);
