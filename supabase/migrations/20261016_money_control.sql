-- Control de dinero de Altavera
-- 2026-10-16

create extension if not exists pgcrypto;

create table if not exists public.money_closures (
  id uuid primary key default gen_random_uuid(),
  delivery_cycle_id uuid not null unique references public.delivery_cycles(id) on delete restrict,
  delivery_date date not null,
  status text not null default 'draft' check (status in ('draft','review','closed')),
  version integer not null default 1 check (version > 0),
  product_revenue_snapshot numeric(14,2),
  shipping_revenue_snapshot numeric(14,2),
  total_revenue_snapshot numeric(14,2),
  order_snapshot jsonb,
  order_snapshot_hash text,
  notes text,
  closed_at timestamptz,
  closed_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_product_costs (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.money_closures(id) on delete cascade,
  item_key text not null,
  product_id bigint,
  product_name_snapshot text not null,
  unit_snapshot text,
  maturity_preference text,
  needed_quantity numeric(14,3) not null default 0,
  opening_stock_quantity numeric(14,3) not null default 0,
  opening_stock_value numeric(14,2) not null default 0,
  purchased_quantity numeric(14,3),
  purchase_total numeric(14,2),
  used_quantity numeric(14,3),
  leftover_quantity numeric(14,3),
  loss_quantity numeric(14,3),
  cenada_reference_price numeric(14,2),
  cenada_reference_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (closure_id, item_key)
);

create table if not exists public.money_expenses (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.money_closures(id) on delete cascade,
  concept text not null,
  amount numeric(14,2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_labor (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null unique references public.money_closures(id) on delete cascade,
  hourly_rate numeric(14,2) not null default 0 check (hourly_rate >= 0),
  purchase_hours numeric(10,2) not null default 0 check (purchase_hours >= 0),
  packing_hours numeric(10,2) not null default 0 check (packing_hours >= 0),
  delivery_hours numeric(10,2) not null default 0 check (delivery_hours >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_labor_splits (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.money_closures(id) on delete cascade,
  person_name text not null,
  percentage numeric(7,4) not null check (percentage >= 0 and percentage <= 100),
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (closure_id, person_name)
);

create table if not exists public.money_vehicle (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null unique references public.money_closures(id) on delete cascade,
  cenada_km numeric(10,2) not null default 0 check (cenada_km >= 0),
  delivery_km numeric(10,2) not null default 0 check (delivery_km >= 0),
  fuel_per_km numeric(14,4) not null default 0 check (fuel_per_km >= 0),
  maintenance_per_km numeric(14,4) not null default 0 check (maintenance_per_km >= 0),
  fuel_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null check (unit in ('g','unit')),
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_material_purchases (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.money_materials(id) on delete restrict,
  purchased_at date not null default current_date,
  quantity numeric(14,3) not null check (quantity > 0),
  total_cost numeric(14,2) not null check (total_cost >= 0),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_material_usage (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.money_closures(id) on delete cascade,
  material_id uuid not null references public.money_materials(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity >= 0),
  unit_cost_snapshot numeric(14,6) not null default 0 check (unit_cost_snapshot >= 0),
  total_cost_snapshot numeric(14,2) not null default 0 check (total_cost_snapshot >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (closure_id, material_id)
);

create table if not exists public.money_closure_history (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.money_closures(id) on delete cascade,
  version integer not null,
  action text not null,
  snapshot jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index if not exists money_closures_delivery_date_idx on public.money_closures(delivery_date desc);
create index if not exists money_product_costs_closure_idx on public.money_product_costs(closure_id);
create index if not exists money_expenses_closure_idx on public.money_expenses(closure_id);
create index if not exists money_material_purchases_material_idx on public.money_material_purchases(material_id, purchased_at, created_at);
create index if not exists money_material_usage_material_idx on public.money_material_usage(material_id);
create index if not exists money_history_closure_idx on public.money_closure_history(closure_id, changed_at desc);

alter table public.money_closures enable row level security;
alter table public.money_product_costs enable row level security;
alter table public.money_expenses enable row level security;
alter table public.money_labor enable row level security;
alter table public.money_labor_splits enable row level security;
alter table public.money_vehicle enable row level security;
alter table public.money_materials enable row level security;
alter table public.money_material_purchases enable row level security;
alter table public.money_material_usage enable row level security;
alter table public.money_closure_history enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'money_closures','money_product_costs','money_expenses','money_labor',
    'money_labor_splits','money_vehicle','money_materials',
    'money_material_purchases','money_material_usage','money_closure_history'
  ]
  loop
    execute format('drop policy if exists admin_only on public.%I', t);
    execute format(
      'create policy admin_only on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;
