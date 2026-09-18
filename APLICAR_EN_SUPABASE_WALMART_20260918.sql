-- Walmart robusto: referencia geográfica, doble precio, historial de observaciones,
-- corridas auditables y bloqueos determinísticos de datos dudosos.

alter table public.competitor_products
  add column if not exists current_price numeric,
  add column if not exists regular_price numeric,
  add column if not exists discount_percent numeric,
  add column if not exists reference_label text,
  add column if not exists reference_region_id text,
  add column if not exists reference_sellers jsonb,
  add column if not exists selected_seller_id text,
  add column if not exists selected_seller_name text,
  add column if not exists previous_current_price numeric,
  add column if not exists last_valid_current_price numeric,
  add column if not exists price_change_percent numeric,
  add column if not exists validation_status text,
  add column if not exists validation_warning text,
  add column if not exists presentation_signature text,
  add column if not exists last_update_run_id uuid,
  add column if not exists validation_reviewed_at timestamptz,
  add column if not exists validation_reviewed_by uuid references auth.users(id) on delete set null;

update public.competitor_products
   set current_price = coalesce(current_price, raw_price),
       regular_price = coalesce(regular_price, raw_price),
       discount_percent = coalesce(discount_percent, 0),
       last_valid_current_price = coalesce(last_valid_current_price, current_price, raw_price),
       validation_status = coalesce(validation_status, 'valid')
 where current_price is null
    or regular_price is null
    or discount_percent is null
    or last_valid_current_price is null
    or validation_status is null;

alter table public.competitor_prices
  add column if not exists regular_price numeric,
  add column if not exists discount_percent numeric,
  add column if not exists reference_label text,
  add column if not exists reference_region_id text,
  add column if not exists update_run_id uuid,
  add column if not exists observed_at timestamptz,
  add column if not exists source_competitor_product_id bigint;

update public.competitor_prices
   set regular_price = coalesce(regular_price, price),
       discount_percent = coalesce(discount_percent, 0)
 where regular_price is null
    or discount_percent is null;

create table if not exists public.competitor_update_runs (
  id uuid primary key,
  competitor_id bigint not null references public.competitors(id) on delete cascade,
  status text not null check (status in ('running','success','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  reference_label text,
  reference_region_id text,
  reference_sellers jsonb,
  downloaded_count integer not null default 0,
  saved_count integer not null default 0,
  valid_count integer not null default 0,
  suspicious_count integer not null default 0,
  presentation_changed_count integer not null default 0,
  no_price_count integer not null default 0,
  prices_saved_count integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists competitor_update_runs_competitor_finished_idx
  on public.competitor_update_runs (competitor_id, finished_at desc);

create table if not exists public.competitor_product_observations (
  id bigserial primary key,
  competitor_product_id bigint not null references public.competitor_products(id) on delete cascade,
  update_run_id uuid not null references public.competitor_update_runs(id) on delete cascade,
  observed_at timestamptz not null default now(),
  current_price numeric,
  regular_price numeric,
  discount_percent numeric,
  previous_current_price numeric,
  price_change_percent numeric,
  measurement_unit text,
  quantity_text text,
  unit_multiplier numeric,
  reference_label text,
  reference_region_id text,
  selected_seller_id text,
  selected_seller_name text,
  validation_status text not null,
  validation_warning text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (competitor_product_id, update_run_id)
);

create index if not exists competitor_product_observations_product_observed_idx
  on public.competitor_product_observations (competitor_product_id, observed_at desc);

create index if not exists competitor_product_observations_run_idx
  on public.competitor_product_observations (update_run_id);

comment on column public.competitor_products.raw_price is
  'Precio actual observado en Walmart; se conserva por compatibilidad con el motor existente.';
comment on column public.competitor_products.current_price is
  'Precio efectivo/actual observado en Walmart, incluyendo promoción si aplica.';
comment on column public.competitor_products.regular_price is
  'Precio regular/lista informado por Walmart antes de descuento.';
comment on column public.competitor_products.discount_percent is
  'Porcentaje de descuento calculado entre precio regular y precio actual.';
comment on column public.competitor_products.validation_status is
  'Estado determinístico del dato: valid, suspicious_price, presentation_changed o no_price.';
comment on column public.competitor_products.last_valid_current_price is
  'Último precio actual que superó validación o fue aprobado manualmente; sirve de referencia para detectar anomalías.';
comment on column public.competitor_products.last_update_run_id is
  'Corrida Walmart exacta en la que se observó por última vez este producto.';
comment on column public.competitor_products.selected_seller_id is
  'Seller específico de Walmart usado para leer el precio dentro de la región resuelta.';
comment on column public.competitor_products.selected_seller_name is
  'Nombre del seller específico de Walmart usado para leer el precio.';
comment on column public.competitor_prices.price is
  'Precio Walmart actual normalizado a la unidad de Altavera.';
comment on column public.competitor_prices.regular_price is
  'Precio Walmart regular normalizado a la unidad de Altavera.';
comment on column public.competitor_prices.update_run_id is
  'Corrida Walmart de la que proviene este precio normalizado.';

-- Estas tablas son de auditoría interna. El navegador no necesita modificarlas directamente.
alter table public.competitor_update_runs enable row level security;
alter table public.competitor_product_observations enable row level security;
