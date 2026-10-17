# Fix mínimo permitido de precios — 2026-10-17

Corrige la validación de decisiones manuales en Admin > Precios.

## Problema
El sistema utilizaba `minimum_allowed_price`, que incorpora el objetivo comercial de quedar aproximadamente 10% debajo de Walmart, como si fuera el piso absoluto para mantener o asignar un precio manual.

Eso hacía que una recomendación como ₡2.150 bloqueara precios menores aunque el mínimo real para conservar 30% de margen fuera, por ejemplo, ₡930.

## Cambio
- La recomendación automática frente a Walmart no cambia.
- `Mantener precio actual` se permite mientras respete el piso real de margen.
- `Asignar otro precio` se permite mientras respete el piso real de margen.
- Normalmente se usa `minimum_price` (margen normal configurado, p. ej. 30%).
- Si existe una excepción competitiva activa, se usa `competitive_minimum_price`.
- La API aplica la misma regla que la interfaz para evitar inconsistencias.

No requiere cambios en Supabase.
