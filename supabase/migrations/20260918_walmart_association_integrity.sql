BEGIN;

-- 1) Ajo (1x3): Altavera vende un paquete de 3 y Walmart también.
UPDATE public.competitor_product_matches m
SET
  conversion_factor = 1,
  verified = true,
  confidence = 'exact',
  notes = 'Conversión verificada manualmente: Altavera Ajo (1x3) y Walmart Ajo Malla 3 Uds representan un paquete de 3 ajos.',
  updated_at = now()
FROM public.products p,
     public.competitor_products cp,
     public.competitors c
WHERE m.product_id = p.id
  AND m.competitor_product_id = cp.id
  AND cp.competitor_id = c.id
  AND lower(c.name) = 'walmart'
  AND lower(p.name) = lower('Ajo (1x3)')
  AND lower(cp.name) = lower('Ajo Malla 3 Uds')
  AND m.action = 'use';

-- 2) Apio Verde: conservar únicamente la presentación por rollo como referencia comparable a 1 mata.
UPDATE public.competitor_product_matches m
SET
  product_id = NULL,
  action = 'ignore',
  conversion_factor = NULL,
  verified = false,
  confidence = NULL,
  notes = 'Ignorado para Altavera: se eligió Apio Hortifruti en rollo como referencia de 1 mata.',
  updated_at = now()
FROM public.products p,
     public.competitor_products cp,
     public.competitors c
WHERE m.product_id = p.id
  AND m.competitor_product_id = cp.id
  AND cp.competitor_id = c.id
  AND lower(c.name) = 'walmart'
  AND lower(p.name) = lower('Apio Verde')
  AND cp.name IN (
    'Apio Empacado Bolsa',
    'Apio verde Hortifruti - Precio indicado por kilo'
  )
  AND m.action = 'use';

INSERT INTO public.competitor_product_matches (
  competitor_product_id,
  product_id,
  action,
  priority,
  conversion_factor,
  verified,
  confidence,
  notes,
  updated_at
)
SELECT
  cp.id,
  p.id,
  'use',
  1,
  1,
  true,
  'measured',
  'Conversión verificada manualmente: 1 mata de Apio Verde Altavera se compara como una presentación equivalente a 1 Apio Hortifruti en rollo Walmart.',
  now()
FROM public.competitor_products cp
JOIN public.competitors c ON c.id = cp.competitor_id
CROSS JOIN public.products p
WHERE lower(c.name) = 'walmart'
  AND lower(cp.name) = lower('Apio Hortifruti en rollo')
  AND lower(p.name) = lower('Apio Verde')
ON CONFLICT (competitor_product_id)
DO UPDATE SET
  product_id = EXCLUDED.product_id,
  action = EXCLUDED.action,
  priority = EXCLUDED.priority,
  conversion_factor = EXCLUDED.conversion_factor,
  verified = EXCLUDED.verified,
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;

-- 3) Diferencias menores al 2% se conservan en precio regular/actual,
-- pero no se consideran una promoción real.
UPDATE public.competitor_products cp
SET discount_percent = 0
FROM public.competitors c
WHERE cp.competitor_id = c.id
  AND lower(c.name) = 'walmart'
  AND cp.discount_percent > 0
  AND cp.discount_percent < 2;

UPDATE public.competitor_product_observations o
SET discount_percent = 0
FROM public.competitor_products cp,
     public.competitors c
WHERE o.competitor_product_id = cp.id
  AND cp.competitor_id = c.id
  AND lower(c.name) = 'walmart'
  AND o.discount_percent > 0
  AND o.discount_percent < 2;

UPDATE public.competitor_prices pr
SET discount_percent = 0
FROM public.competitors c
WHERE pr.competitor_id = c.id
  AND lower(c.name) = 'walmart'
  AND pr.discount_percent > 0
  AND pr.discount_percent < 2;

-- 4) Protección de integridad: un mismo producto Altavera no puede tener
-- dos referencias activas del mismo competidor al mismo tiempo.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_active_competitor_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_competitor_id bigint;
BEGIN
  IF NEW.action <> 'use' OR NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT competitor_id
  INTO v_competitor_id
  FROM public.competitor_products
  WHERE id = NEW.competitor_product_id;

  IF v_competitor_id IS NULL THEN
    RAISE EXCEPTION 'Producto competidor % inexistente', NEW.competitor_product_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.competitor_product_matches existing
    JOIN public.competitor_products existing_cp
      ON existing_cp.id = existing.competitor_product_id
    WHERE existing.product_id = NEW.product_id
      AND existing.action = 'use'
      AND existing_cp.competitor_id = v_competitor_id
      AND existing.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'El producto Altavera % ya tiene una referencia activa para este competidor', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS competitor_product_matches_single_active_competitor
ON public.competitor_product_matches;

CREATE TRIGGER competitor_product_matches_single_active_competitor
BEFORE INSERT OR UPDATE OF product_id, competitor_product_id, action
ON public.competitor_product_matches
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_active_competitor_match();

COMMIT;

-- Verificación final.
WITH walmart AS (
  SELECT id FROM public.competitors WHERE lower(name)='walmart' LIMIT 1
), latest_run AS (
  SELECT r.id
  FROM public.competitor_update_runs r
  CROSS JOIN walmart w
  WHERE r.competitor_id=w.id AND r.status='success'
  ORDER BY r.started_at DESC
  LIMIT 1
), regional AS (
  SELECT cp.id
  FROM public.competitor_products cp
  CROSS JOIN walmart w
  CROSS JOIN latest_run lr
  WHERE cp.competitor_id=w.id AND cp.last_update_run_id=lr.id
), duplicates AS (
  SELECT m.product_id, count(*) AS associations
  FROM public.competitor_product_matches m
  JOIN public.competitor_products cp ON cp.id=m.competitor_product_id
  CROSS JOIN walmart w
  WHERE cp.competitor_id=w.id AND m.action='use' AND m.product_id IS NOT NULL
  GROUP BY m.product_id
  HAVING count(*)>1
)
SELECT
  (SELECT count(*) FROM regional) AS productos_regionales,
  (SELECT count(*)
   FROM regional r
   JOIN public.competitor_product_matches m ON m.competitor_product_id=r.id
   WHERE m.action='use') AS asociados_regionales,
  (SELECT count(*)
   FROM regional r
   JOIN public.competitor_product_matches m ON m.competitor_product_id=r.id
   WHERE m.action='ignore') AS ignorados_regionales,
  (SELECT count(*)
   FROM regional r
   LEFT JOIN public.competitor_product_matches m ON m.competitor_product_id=r.id
   WHERE m.id IS NULL) AS pendientes_regionales,
  (SELECT count(*) FROM duplicates) AS productos_altavera_con_asociacion_walmart_duplicada;
