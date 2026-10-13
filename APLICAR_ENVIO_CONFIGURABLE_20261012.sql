-- Altavera · costos de envío configurables + trazabilidad por pedido
-- Ejecutar una sola vez en Supabase SQL Editor antes de desplegar el código.

begin;

alter table public.orders
  add column if not exists shipping_discount numeric(12,2) not null default 0,
  add column if not exists shipping_base numeric(12,2),
  add column if not exists shipping_cost_estimated numeric(12,2),
  add column if not exists shipping_calculation jsonb;

-- Para pedidos históricos, deja shipping_base con el valor que realmente se cobró
-- más cualquier descuento de envío conocido. No inventa un costo interno retroactivo.
update public.orders
set shipping_base = coalesce(shipping, 0) + coalesce(shipping_discount, 0)
where shipping_base is null;

comment on column public.orders.shipping_base is
  'Tarifa de envío antes de descuentos/promociones, congelada al crear el pedido.';
comment on column public.orders.shipping_cost_estimated is
  'Costo interno estimado de entregar el pedido según la configuración vigente al crearlo.';
comment on column public.orders.shipping_calculation is
  'Snapshot JSON del cálculo de envío usado al crear el pedido.';

commit;
