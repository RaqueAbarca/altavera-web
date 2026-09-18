-- Verificación Walmart robusto. Solo consulta; no modifica datos.

-- 1) Últimas corridas. La primera de Walmart debe ser SUCCESS antes de generar precios.
select
  r.id,
  r.status,
  r.started_at,
  r.finished_at,
  r.reference_label,
  r.reference_region_id,
  r.downloaded_count,
  r.saved_count,
  r.valid_count,
  r.suspicious_count,
  r.presentation_changed_count,
  r.no_price_count,
  r.prices_saved_count,
  r.error
from public.competitor_update_runs r
join public.competitors c on c.id = r.competitor_id
where lower(c.name) = 'walmart'
order by r.started_at desc
limit 5;

-- 2) Muestra de productos observados en la última corrida Walmart.
with latest as (
  select r.id
  from public.competitor_update_runs r
  join public.competitors c on c.id = r.competitor_id
  where lower(c.name) = 'walmart'
  order by r.started_at desc
  limit 1
)
select
  cp.name as walmart_producto,
  cp.current_price as precio_actual,
  cp.regular_price as precio_regular,
  cp.discount_percent as descuento_porcentaje,
  cp.measurement_unit as unidad,
  cp.quantity_text as presentacion,
  cp.selected_seller_name as seller_reportado,
  cp.reference_label as referencia,
  cp.validation_status as validacion,
  cp.price_change_percent as cambio_porcentaje,
  cp.validation_warning as advertencia,
  cp.last_seen_at as observado_en
from public.competitor_products cp
join latest l on l.id = cp.last_update_run_id
order by cp.name
limit 40;

-- 3) Solo observaciones bloqueadas de la última corrida.
with latest as (
  select r.id
  from public.competitor_update_runs r
  join public.competitors c on c.id = r.competitor_id
  where lower(c.name) = 'walmart'
  order by r.started_at desc
  limit 1
)
select
  cp.name,
  cp.current_price,
  cp.regular_price,
  cp.validation_status,
  cp.price_change_percent,
  cp.validation_warning
from public.competitor_products cp
join latest l on l.id = cp.last_update_run_id
where cp.validation_status <> 'valid'
order by cp.validation_status, cp.name;

-- 4) Precios Walmart normalizados que sí quedaron disponibles para Altavera en la última corrida exitosa.
with latest_success as (
  select r.id
  from public.competitor_update_runs r
  join public.competitors c on c.id = r.competitor_id
  where lower(c.name) = 'walmart'
    and r.status = 'success'
  order by r.started_at desc
  limit 1
)
select
  p.name as producto_altavera,
  p.unit as unidad_altavera,
  cpr.price as walmart_actual_normalizado,
  cpr.regular_price as walmart_regular_normalizado,
  cpr.discount_percent as descuento_porcentaje,
  cpr.reference_label as referencia,
  cpr.observed_at as observado_en,
  cp.name as producto_walmart
from public.competitor_prices cpr
join latest_success l on l.id = cpr.update_run_id
join public.products p on p.id = cpr.product_id
left join public.competitor_products cp on cp.id = cpr.source_competitor_product_id
order by p.name;
