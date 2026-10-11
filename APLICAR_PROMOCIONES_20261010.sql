-- Altavera · Códigos promocionales de envío gratis
-- Ejecutar una sola vez en Supabase SQL Editor antes de desplegar el código.

begin;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  discount_type text not null default 'free_shipping'
    check (discount_type in ('free_shipping')),
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_codes_code_format check (
    code = upper(code)
    and code ~ '^[A-Z0-9_-]{3,40}$'
  ),
  constraint promo_codes_date_order check (
    starts_at is null or expires_at is null or expires_at > starts_at
  )
);

alter table public.promo_codes enable row level security;

alter table public.orders
  add column if not exists promo_code_id uuid references public.promo_codes(id) on delete set null,
  add column if not exists promo_code text,
  add column if not exists shipping_discount numeric(12,2) not null default 0;

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  guest_phone text,
  discount_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint promo_redemptions_order_unique unique(order_id)
);

alter table public.promo_redemptions enable row level security;

create index if not exists promo_codes_active_idx
  on public.promo_codes(is_active, code);

create index if not exists promo_redemptions_promo_idx
  on public.promo_redemptions(promo_code_id, created_at desc);

create or replace function public.altavera_claim_promo_code(p_code text)
returns table (
  promo_id uuid,
  promo_code text,
  discount_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
begin
  select *
  into v_promo
  from public.promo_codes
  where code = upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'))
  for update;

  if not found then
    return;
  end if;

  if not v_promo.is_active
     or (v_promo.starts_at is not null and v_promo.starts_at > now())
     or (v_promo.expires_at is not null and v_promo.expires_at <= now())
     or (v_promo.max_uses is not null and v_promo.use_count >= v_promo.max_uses)
     or v_promo.discount_type <> 'free_shipping' then
    return;
  end if;

  update public.promo_codes
  set use_count = use_count + 1,
      updated_at = now()
  where id = v_promo.id;

  return query
  select v_promo.id, v_promo.code, v_promo.discount_type;
end;
$$;

create or replace function public.altavera_release_promo_code(p_promo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.promo_codes
  set use_count = greatest(use_count - 1, 0),
      updated_at = now()
  where id = p_promo_id;
end;
$$;

revoke all on function public.altavera_claim_promo_code(text) from public, anon, authenticated;
revoke all on function public.altavera_release_promo_code(uuid) from public, anon, authenticated;
grant execute on function public.altavera_claim_promo_code(text) to service_role;
grant execute on function public.altavera_release_promo_code(uuid) to service_role;

commit;
