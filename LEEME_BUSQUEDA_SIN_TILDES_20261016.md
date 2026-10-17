# Búsqueda de productos sin depender de tildes — 2026-10-16

Este parche hace que las búsquedas de productos ignoren tildes y diferencias entre mayúsculas y minúsculas.

Ejemplos:
- `sandia` encuentra `Sandía`
- `pina` encuentra `Piña`
- `rabano` encuentra `Rábano`
- `cebollin` encuentra `Cebollín`

No cambia los nombres guardados de los productos. Solo normaliza temporalmente el texto usado para buscar.

## Archivos
- `src/lib/searchText.ts`
- `src/components/productos/ProductsSection.tsx`
- `src/app/admin/productos/page.tsx`
- `src/app/admin/precios/WalmartMatchingList.tsx`
- `src/app/admin/precios/WalmartByAltaveraList.tsx`
- `src/app/admin/precios/PricingRecommendationsPanel.tsx`

No requiere cambios en Supabase.
