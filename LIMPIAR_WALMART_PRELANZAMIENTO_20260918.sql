-- ALTAVERA · Limpieza pre-lanzamiento de Walmart
-- Conserva únicamente la última corrida regional EXITOSA de Walmart y sus 153 productos actuales.
-- Elimina catálogo/asociaciones/precios/observaciones Walmart anteriores.
-- No toca productos Altavera, CENADA, pedidos, clientes ni reglas de precios.

begin;

-- Deja compatible la lógica nueva: una conversión no verificada puede no tener confidence.
alter table public.competitor_product_matches
  alter column confidence drop not null;

create temp table _altavera_walmart_baseline on commit drop as
select
  c.id as competitor_id,
  r.id as update_run_id,
  r.reference_label,
  r.reference_region_id,
  r.downloaded_count,
  r.started_at,
  r.finished_at
from public.competitors c
join lateral (
  select r.*
  from public.competitor_update_runs r
  where r.competitor_id=c.id
    and r.status='success'
    and r.reference_region_id is not null
  order by coalesce(r.finished_at,r.started_at) desc
  limit 1
) r on true
where lower(c.name)='walmart'
  and c.enabled=true;

do $$
declare
  v_rows integer;
  v_downloaded integer;
  v_current_products integer;
  v_label text;
begin
  select count(*) into v_rows
  from _altavera_walmart_baseline;

  if v_rows<>1 then
    raise exception 'No se encontró exactamente una corrida regional exitosa de Walmart. Se canceló la limpieza.';
  end if;

  select downloaded_count,reference_label
    into v_downloaded,v_label
  from _altavera_walmart_baseline;

  if v_downloaded<50 then
    raise exception 'La corrida regional más reciente contiene solo % productos. Se canceló la limpieza por seguridad.',v_downloaded;
  end if;

  select count(*) into v_current_products
  from public.competitor_products cp
  join _altavera_walmart_baseline b
    on b.competitor_id=cp.competitor_id
   and b.update_run_id=cp.last_update_run_id;

  if v_current_products<>v_downloaded then
    raise exception 'Walmart reportó % productos pero hay % productos vinculados a la corrida. Se canceló la limpieza.',v_downloaded,v_current_products;
  end if;

  raise notice 'Baseline Walmart: % · % productos',v_label,v_downloaded;
end $$;

-- La primera corrida regional pasa a ser nuestro punto cero.
-- Los cambios sospechosos contra el catálogo genérico anterior dejan de contar como anomalía.
update public.competitor_products cp
set
  previous_current_price=null,
  price_change_percent=null,
  last_valid_current_price=coalesce(cp.current_price,cp.raw_price,cp.last_valid_current_price),
  validation_status=case
    when cp.validation_status='suspicious_price'
      and coalesce(cp.current_price,cp.raw_price) is not null
      then 'valid'
    else cp.validation_status
  end,
  validation_warning=case
    when cp.validation_status='suspicious_price' then null
    else cp.validation_warning
  end,
  validation_reviewed_at=null,
  validation_reviewed_by=null
from _altavera_walmart_baseline b
where cp.competitor_id=b.competitor_id
  and cp.last_update_run_id=b.update_run_id;

update public.competitor_product_observations o
set
  previous_current_price=null,
  price_change_percent=null,
  validation_status=case
    when o.validation_status='suspicious_price'
      and o.current_price is not null
      then 'valid'
    else o.validation_status
  end,
  validation_warning=case
    when o.validation_status='suspicious_price' then null
    else o.validation_warning
  end,
  reviewed_at=null,
  reviewed_by=null
from _altavera_walmart_baseline b
where o.update_run_id=b.update_run_id;

-- Borra precios Walmart históricos anteriores al punto cero regional.
delete from public.competitor_prices p
using _altavera_walmart_baseline b
where p.competitor_id=b.competitor_id
  and p.update_run_id is distinct from b.update_run_id;

-- Borra decisiones de asociación ligadas a productos que ya no existen
-- en el catálogo regional actual.
delete from public.competitor_product_matches m
using public.competitor_products cp,
      _altavera_walmart_baseline b
where m.competitor_product_id=cp.id
  and cp.competitor_id=b.competitor_id
  and cp.last_update_run_id is distinct from b.update_run_id;

-- Borra del catálogo Walmart local todo lo que no apareció en la
-- última actualización regional exitosa.
delete from public.competitor_products cp
using _altavera_walmart_baseline b
where cp.competitor_id=b.competitor_id
  and cp.last_update_run_id is distinct from b.update_run_id;

-- Al borrar corridas viejas, sus observaciones se eliminan por CASCADE.
delete from public.competitor_update_runs r
using _altavera_walmart_baseline b
where r.competitor_id=b.competitor_id
  and r.id<>b.update_run_id;

-- Recalcula los contadores de la corrida que queda como baseline.
update public.competitor_update_runs r
set
  valid_count=(
    select count(*)
    from public.competitor_products cp
    where cp.last_update_run_id=r.id
      and cp.validation_status='valid'
  ),
  suspicious_count=(
    select count(*)
    from public.competitor_products cp
    where cp.last_update_run_id=r.id
      and cp.validation_status='suspicious_price'
  ),
  presentation_changed_count=(
    select count(*)
    from public.competitor_products cp
    where cp.last_update_run_id=r.id
      and cp.validation_status='presentation_changed'
  ),
  no_price_count=(
    select count(*)
    from public.competitor_products cp
    where cp.last_update_run_id=r.id
      and cp.validation_status='no_price'
  ),
  prices_saved_count=(
    select count(*)
    from public.competitor_prices p
    where p.update_run_id=r.id
  ),
  error=null
from _altavera_walmart_baseline b
where r.id=b.update_run_id;

-- Resultado final para verificar antes del COMMIT.
select
  b.reference_label,
  b.update_run_id,
  (select count(*) from public.competitor_products cp where cp.competitor_id=b.competitor_id) as productos_walmart,
  (select count(*) from public.competitor_product_matches m join public.competitor_products cp on cp.id=m.competitor_product_id where cp.competitor_id=b.competitor_id and m.action='use') as asociaciones_activas,
  (select count(*) from public.competitor_product_matches m join public.competitor_products cp on cp.id=m.competitor_product_id where cp.competitor_id=b.competitor_id and m.action='use' and m.verified=true) as asociaciones_verificadas,
  (select count(*) from public.competitor_product_matches m join public.competitor_products cp on cp.id=m.competitor_product_id where cp.competitor_id=b.competitor_id and m.action='use' and m.verified=false) as asociaciones_pendientes,
  (select count(*) from public.competitor_prices p where p.competitor_id=b.competitor_id) as precios_walmart_conservados,
  (select count(*) from public.competitor_update_runs r where r.competitor_id=b.competitor_id) as corridas_walmart_conservadas
from _altavera_walmart_baseline b;

commit;
