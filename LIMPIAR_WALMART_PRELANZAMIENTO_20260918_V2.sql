-- ALTAVERA · Limpieza pre-lanzamiento de Walmart · V2
-- No usa tablas temporales. Toda la limpieza ocurre dentro de un único bloque DO,
-- por lo que si alguna validación falla, ese bloque se revierte completo.
-- Conserva únicamente la última corrida regional EXITOSA de Walmart y sus productos actuales.
-- No toca productos Altavera, CENADA, pedidos, clientes ni reglas de precios.

do $$
declare
  v_competitor_id bigint;
  v_update_run_id uuid;
  v_reference_label text;
  v_downloaded integer;
  v_current_products integer;
begin
  -- Una conversión no verificada puede no tener confidence.
  execute 'alter table public.competitor_product_matches alter column confidence drop not null';

  select
    c.id,
    r.id,
    r.reference_label,
    r.downloaded_count
  into
    v_competitor_id,
    v_update_run_id,
    v_reference_label,
    v_downloaded
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
    and c.enabled=true
  limit 1;

  if v_competitor_id is null or v_update_run_id is null then
    raise exception 'No se encontró una corrida regional exitosa de Walmart. Se canceló la limpieza.';
  end if;

  if coalesce(v_downloaded,0)<50 then
    raise exception 'La corrida regional más reciente contiene solo % productos. Se canceló la limpieza por seguridad.',coalesce(v_downloaded,0);
  end if;

  select count(*)
  into v_current_products
  from public.competitor_products cp
  where cp.competitor_id=v_competitor_id
    and cp.last_update_run_id=v_update_run_id;

  if v_current_products<>v_downloaded then
    raise exception 'Walmart reportó % productos pero hay % productos vinculados a la corrida. Se canceló la limpieza.',v_downloaded,v_current_products;
  end if;

  -- La corrida regional actual pasa a ser nuestro punto cero.
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
  where cp.competitor_id=v_competitor_id
    and cp.last_update_run_id=v_update_run_id;

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
  where o.update_run_id=v_update_run_id;

  -- Elimina precios Walmart históricos anteriores al baseline regional.
  delete from public.competitor_prices p
  where p.competitor_id=v_competitor_id
    and p.update_run_id is distinct from v_update_run_id;

  -- Elimina asociaciones ligadas a productos que no existen en el catálogo regional actual.
  delete from public.competitor_product_matches m
  using public.competitor_products cp
  where m.competitor_product_id=cp.id
    and cp.competitor_id=v_competitor_id
    and cp.last_update_run_id is distinct from v_update_run_id;

  -- Elimina productos Walmart históricos/no regionales.
  delete from public.competitor_products cp
  where cp.competitor_id=v_competitor_id
    and cp.last_update_run_id is distinct from v_update_run_id;

  -- Las observaciones de corridas antiguas se eliminan por CASCADE.
  delete from public.competitor_update_runs r
  where r.competitor_id=v_competitor_id
    and r.id<>v_update_run_id;

  -- Recalcula los contadores del baseline.
  update public.competitor_update_runs r
  set
    valid_count=(
      select count(*)
      from public.competitor_products cp
      where cp.last_update_run_id=v_update_run_id
        and cp.validation_status='valid'
    ),
    suspicious_count=(
      select count(*)
      from public.competitor_products cp
      where cp.last_update_run_id=v_update_run_id
        and cp.validation_status='suspicious_price'
    ),
    presentation_changed_count=(
      select count(*)
      from public.competitor_products cp
      where cp.last_update_run_id=v_update_run_id
        and cp.validation_status='presentation_changed'
    ),
    no_price_count=(
      select count(*)
      from public.competitor_products cp
      where cp.last_update_run_id=v_update_run_id
        and cp.validation_status='no_price'
    ),
    prices_saved_count=(
      select count(*)
      from public.competitor_prices p
      where p.update_run_id=v_update_run_id
    ),
    error=null
  where r.id=v_update_run_id;

  raise notice 'Limpieza Walmart completada. Baseline: % · % productos.',v_reference_label,v_downloaded;
end $$;

-- Verificación final independiente (no depende de tablas temporales).
with b as (
  select
    c.id as competitor_id,
    r.id as update_run_id,
    r.reference_label
  from public.competitors c
  join public.competitor_update_runs r
    on r.competitor_id=c.id
  where lower(c.name)='walmart'
    and c.enabled=true
    and r.status='success'
    and r.reference_region_id is not null
  order by coalesce(r.finished_at,r.started_at) desc
  limit 1
)
select
  b.reference_label,
  b.update_run_id,
  (select count(*) from public.competitor_products cp where cp.competitor_id=b.competitor_id) as productos_walmart,
  (select count(*) from public.competitor_product_matches m join public.competitor_products cp on cp.id=m.competitor_product_id where cp.competitor_id=b.competitor_id and m.action='use') as asociaciones_activas,
  (select count(*) from public.competitor_product_matches m join public.competitor_products cp on cp.id=m.competitor_product_id where cp.competitor_id=b.competitor_id and m.action='use' and m.verified=true) as asociaciones_verificadas,
  (select count(*) from public.competitor_product_matches m join public.competitor_products cp on cp.id=m.competitor_product_id where cp.competitor_id=b.competitor_id and m.action='use' and m.verified=false) as asociaciones_pendientes,
  (select count(*) from public.competitor_prices p where p.competitor_id=b.competitor_id) as precios_walmart_conservados,
  (select count(*) from public.competitor_update_runs r where r.competitor_id=b.competitor_id) as corridas_walmart_conservadas
from b;
