-- Control interno de dinero. No cambia pedidos ni precios.
begin;
create table if not exists public.money_records (
  key text primary key,
  kind text not null check (kind in ('delivery','month')),
  date date not null,
  payload jsonb not null,
  closed boolean not null default false,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);
create table if not exists public.money_record_history (
  id bigint generated always as identity primary key,
  record_key text not null references public.money_records(key),
  revision integer not null,
  snapshot jsonb not null,
  actor uuid not null,
  created_at timestamptz not null default now(),
  unique(record_key, revision)
);
alter table public.money_records enable row level security;
alter table public.money_record_history enable row level security;
revoke all on public.money_records, public.money_record_history from anon, authenticated;
grant all on public.money_records, public.money_record_history to service_role;
grant usage, select on sequence public.money_record_history_id_seq to service_role;
create or replace function public.save_money_record(
  p_key text, p_kind text, p_date date, p_payload jsonb,
  p_closed boolean, p_revision integer, p_actor uuid
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare saved public.money_records;
begin
  -- Serialize create/update for this key and preserve an immutable revision history.
  perform pg_advisory_xact_lock(hashtextextended(p_key, 0));
  select * into saved from public.money_records where key = p_key for update;
  if found then
    if saved.revision <> p_revision then raise exception 'MONEY_CONFLICT'; end if;
    update public.money_records set payload=p_payload, closed=p_closed,
      revision=revision+1, updated_at=now(), updated_by=p_actor
      where key=p_key returning * into saved;
  else
    if p_revision <> 0 then raise exception 'MONEY_CONFLICT'; end if;
    insert into public.money_records(key,kind,date,payload,closed,updated_by)
      values(p_key,p_kind,p_date,p_payload,p_closed,p_actor) returning * into saved;
  end if;
  insert into public.money_record_history(record_key,revision,snapshot,actor)
    values(saved.key,saved.revision,to_jsonb(saved),p_actor);
  return to_jsonb(saved);
end;
$$;
revoke all on function public.save_money_record(text,text,date,jsonb,boolean,integer,uuid) from public, anon, authenticated;
grant execute on function public.save_money_record(text,text,date,jsonb,boolean,integer,uuid) to service_role;
commit;
