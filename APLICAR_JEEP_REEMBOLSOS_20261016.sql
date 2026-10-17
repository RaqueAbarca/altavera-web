-- Jeep automático + reembolsos por producto no conseguido
-- Altavera · 2026-10-16

alter table public.money_product_costs
  add column if not exists unavailable boolean not null default false;

alter table public.money_closures
  add column if not exists refund_total_snapshot numeric(14,2) not null default 0;

create table if not exists public.money_refunds (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.money_closures(id) on delete cascade,
  order_id uuid not null,
  order_item_id uuid not null,
  item_key text not null,
  product_name_snapshot text not null,
  customer_name_snapshot text not null,
  customer_phone_snapshot text,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  unit_snapshot text,
  unit_price_snapshot numeric(14,2) not null default 0 check (unit_price_snapshot >= 0),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (closure_id, order_item_id)
);

create index if not exists money_refunds_closure_idx
  on public.money_refunds(closure_id, paid);

alter table public.money_refunds enable row level security;

drop policy if exists admin_only on public.money_refunds;
create policy admin_only on public.money_refunds
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
