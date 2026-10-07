# Tendencias CENADA/Walmart y fallback Walmart — 07/10/2026

## Qué cambia

- CENADA y Walmart muestran una tendencia por producto comparando el precio fuente usado en el Run actual contra el Run anterior.
- El icono funciona con hover (y foco de teclado), sin clic.
- El tooltip muestra precio anterior, precio actual, diferencia, porcentaje, Run y fecha de la fuente.
- Walmart puede reutilizar un precio válido reciente cuando una referencia asociada NO apareció en la última actualización.
- Si la referencia sí apareció pero fue bloqueada por validación, cambio de presentación o conversión, NO se reutiliza un precio viejo.
- Los precios Walmart reutilizados quedan marcados como `Precio reciente anterior` y el tooltip explica la situación.
- El algoritmo pasa de V2.4 a V2.5 para que el cambio quede auditado.

## Antes de desplegar

Aplicar primero en Supabase SQL Editor:

`APLICAR_EN_SUPABASE_20261007.sql`

Luego desplegar el código.

## Archivos modificados

- `src/lib/pricing/services/buildPricingPreview.ts`
- `src/lib/pricing/services/createPricingRun.ts`
- `src/app/api/pricing/recommendations/route.ts`
- `src/app/api/pricing/run/route.ts`
- `src/app/admin/precios/page.tsx`
- `src/app/admin/precios/PricingRecommendationsPanel.tsx`
- `src/app/admin/precios/precios.css`
- `LEEME_WALMART_ROBUSTO.md`

## SQL agregado

- `supabase/migrations/20261007_pricing_source_trends_and_walmart_fallback.sql`
- `APLICAR_EN_SUPABASE_20261007.sql`
