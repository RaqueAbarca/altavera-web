begin;

alter table public.products
  add column if not exists variant_selection_enabled boolean not null default false;

alter table public.products
  add column if not exists size_variants jsonb not null default '[]'::jsonb;

comment on column public.products.variant_selection_enabled is
  'Si está activo, el cliente debe elegir una variante/tamaño antes de agregar el producto.';

comment on column public.products.size_variants is
  'Variantes de tamaño del producto. Cada elemento guarda id, label, weightLabel, price y active.';

-- Evita valores que no sean listas JSON sin tocar datos existentes válidos.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_size_variants_is_array'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_size_variants_is_array
      check (jsonb_typeof(size_variants) = 'array');
  end if;
end $$;

commit;
