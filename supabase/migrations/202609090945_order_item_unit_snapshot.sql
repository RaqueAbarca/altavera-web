alter table public.order_item
  add column if not exists unit text;

comment on column public.order_item.unit is
  'Unidad de venta del producto al momento de crear el pedido. Se conserva como referencia histórica para compra y preparación.';

create or replace function public.altavera_snapshot_order_item_unit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.unit is null and new.product_id is not null then
    select nullif(trim(p.unit), '')
      into new.unit
    from public.products p
    where p.id = new.product_id;
  end if;

  return new;
end;
$$;

drop trigger if exists altavera_order_item_unit_snapshot on public.order_item;

create trigger altavera_order_item_unit_snapshot
before insert on public.order_item
for each row
execute function public.altavera_snapshot_order_item_unit();
