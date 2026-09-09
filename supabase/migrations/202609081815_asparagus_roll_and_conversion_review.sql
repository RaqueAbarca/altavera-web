-- Ajustes posteriores a la revisión de equivalencias del catálogo.
-- Las cantidades son orientativas: el tamaño real de frutas y verduras varía.

-- Espárragos: en CENADA se comercializan por rollo. Incer Produce, proveedor
-- ubicado en CENADA, publica una presentación de 450 g por rollo.
-- Se revierte la conversión anterior a kg y se conserva el precio equivalente
-- que Altavera tenía antes del cambio (₡5.850 por rollo) cuando aplica.
update public.products
set
  unit = 'Rollo',
  price = case when price = 13000 then 5850 else price end,
  average_unit_weight_g = 450,
  approx_units_per_kg_min = null,
  approx_units_per_kg_max = null
where name ilike 'Espárragos'
   or name ilike 'Esparragos';

-- Tomate primera: se ajusta a un rango más conservador para una pieza de
-- tamaño grande/primera. Como referencia comercial, Walmart publica tomate
-- selección especial en un rango aproximado de 4-6 unidades por kg.
update public.products
set
  approx_units_per_kg_min = 4,
  approx_units_per_kg_max = 6,
  average_unit_weight_g = 200
where name ilike 'Tomate primera';
