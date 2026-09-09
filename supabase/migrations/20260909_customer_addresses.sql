create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  latitude double precision not null,
  longitude double precision not null,
  address_description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_label_length check (char_length(label) between 1 and 50),
  constraint customer_addresses_description_length check (
    address_description is null or char_length(address_description) <= 500
  ),
  constraint customer_addresses_latitude_range check (latitude between -90 and 90),
  constraint customer_addresses_longitude_range check (longitude between -180 and 180)
);

create index if not exists customer_addresses_user_id_idx
  on public.customer_addresses(user_id, created_at);

create unique index if not exists customer_addresses_one_default_per_user_idx
  on public.customer_addresses(user_id)
  where is_default = true;

alter table public.customer_addresses enable row level security;

comment on table public.customer_addresses is
  'Direcciones de entrega guardadas por usuarios autenticados de Altavera.';
