create table if not exists public.customer_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists customer_favorites_user_created_idx
  on public.customer_favorites(user_id, created_at desc);

alter table public.customer_favorites enable row level security;

revoke all on table public.customer_favorites from anon;
grant select, insert, delete on table public.customer_favorites to authenticated;

drop policy if exists "Customers can read own favorites" on public.customer_favorites;
create policy "Customers can read own favorites"
  on public.customer_favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers can add own favorites" on public.customer_favorites;
create policy "Customers can add own favorites"
  on public.customer_favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Customers can remove own favorites" on public.customer_favorites;
create policy "Customers can remove own favorites"
  on public.customer_favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);

comment on table public.customer_favorites is
  'Productos favoritos guardados por usuarios autenticados de Altavera.';
