-- Consentimientos legales y promocionales de Altavera.
-- Ejecutar antes de publicar el registro/checkout con casillas de consentimiento.

create table if not exists public.customer_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text,
  terms_accepted_at timestamptz,
  privacy_version text,
  privacy_acknowledged_at timestamptz,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  marketing_opt_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  channel text not null check (channel in ('email', 'whatsapp')),
  destination text not null,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, destination)
);

alter table public.orders
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz;

alter table public.customer_consents enable row level security;
alter table public.marketing_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_consents'
      and policyname = 'Customers can read own consents'
  ) then
    create policy "Customers can read own consents"
      on public.customer_consents
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.altavera_capture_signup_consents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_terms_version text;
  v_privacy_version text;
  v_terms_at timestamptz;
  v_privacy_at timestamptz;
  v_marketing boolean;
  v_marketing_at timestamptz;
  v_phone text;
begin
  v_terms_version := nullif(new.raw_user_meta_data ->> 'terms_version', '');
  v_privacy_version := nullif(new.raw_user_meta_data ->> 'privacy_version', '');
  v_terms_at := nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz;
  v_privacy_at := nullif(new.raw_user_meta_data ->> 'privacy_acknowledged_at', '')::timestamptz;
  v_marketing := coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false);
  v_marketing_at := nullif(new.raw_user_meta_data ->> 'marketing_opt_in_at', '')::timestamptz;
  v_phone := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g');

  if v_terms_version is not null and v_privacy_version is not null then
    insert into public.customer_consents (
      user_id,
      terms_version,
      terms_accepted_at,
      privacy_version,
      privacy_acknowledged_at,
      marketing_opt_in,
      marketing_opt_in_at,
      updated_at
    ) values (
      new.id,
      v_terms_version,
      coalesce(v_terms_at, now()),
      v_privacy_version,
      coalesce(v_privacy_at, now()),
      v_marketing,
      case when v_marketing then coalesce(v_marketing_at, now()) else null end,
      now()
    )
    on conflict (user_id) do update set
      terms_version = excluded.terms_version,
      terms_accepted_at = excluded.terms_accepted_at,
      privacy_version = excluded.privacy_version,
      privacy_acknowledged_at = excluded.privacy_acknowledged_at,
      marketing_opt_in = public.customer_consents.marketing_opt_in or excluded.marketing_opt_in,
      marketing_opt_in_at = case
        when excluded.marketing_opt_in then coalesce(public.customer_consents.marketing_opt_in_at, excluded.marketing_opt_in_at)
        else public.customer_consents.marketing_opt_in_at
      end,
      updated_at = now();
  end if;

  if v_marketing then
    if new.email is not null and btrim(new.email) <> '' then
      insert into public.marketing_subscriptions (
        user_id, channel, destination, status, consented_at, revoked_at, source, updated_at
      ) values (
        new.id, 'email', lower(btrim(new.email)), 'subscribed', coalesce(v_marketing_at, now()), null, 'account_signup', now()
      )
      on conflict (channel, destination) do update set
        user_id = coalesce(excluded.user_id, public.marketing_subscriptions.user_id),
        status = 'subscribed',
        consented_at = excluded.consented_at,
        revoked_at = null,
        source = excluded.source,
        updated_at = now();
    end if;

    if v_phone <> '' then
      insert into public.marketing_subscriptions (
        user_id, channel, destination, status, consented_at, revoked_at, source, updated_at
      ) values (
        new.id, 'whatsapp', v_phone, 'subscribed', coalesce(v_marketing_at, now()), null, 'account_signup', now()
      )
      on conflict (channel, destination) do update set
        user_id = coalesce(excluded.user_id, public.marketing_subscriptions.user_id),
        status = 'subscribed',
        consented_at = excluded.consented_at,
        revoked_at = null,
        source = excluded.source,
        updated_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_altavera_capture_signup_consents on auth.users;
create trigger zz_altavera_capture_signup_consents
after insert on auth.users
for each row execute function public.altavera_capture_signup_consents();

create index if not exists marketing_subscriptions_status_channel_idx
  on public.marketing_subscriptions(status, channel);

create index if not exists marketing_subscriptions_user_id_idx
  on public.marketing_subscriptions(user_id);
