-- Limpieza de jornadas de prueba anteriores a 2026-10-10.
-- Conserva la jornada del 10 de octubre, la del 17 de octubre y cualquier jornada futura.
-- NO elimina los delivery_cycles; solo elimina los datos asociados a jornadas anteriores.

begin;

-- Cierres de Dinero anteriores (sus tablas hijas usan ON DELETE CASCADE).
delete from public.money_closures
where delivery_date < date '2026-10-10';

-- Listas de compra congeladas de ciclos anteriores.
delete from public.shopping_list_items sli
using public.shopping_lists sl, public.delivery_cycles dc
where sli.shopping_list_id = sl.id
  and sl.delivery_cycle_id = dc.id
  and dc.delivery_date < date '2026-10-10';

delete from public.shopping_lists sl
using public.delivery_cycles dc
where sl.delivery_cycle_id = dc.id
  and dc.delivery_date < date '2026-10-10';

-- Datos dependientes de pedidos anteriores.
delete from public.promo_redemptions pr
using public.orders o, public.delivery_cycles dc
where pr.order_id = o.id
  and o.delivery_cycle_id = dc.id
  and dc.delivery_date < date '2026-10-10';

delete from public.order_item oi
using public.orders o, public.delivery_cycles dc
where oi.order_id = o.id
  and o.delivery_cycle_id = dc.id
  and dc.delivery_date < date '2026-10-10';

delete from public.orders o
using public.delivery_cycles dc
where o.delivery_cycle_id = dc.id
  and dc.delivery_date < date '2026-10-10';

commit;
