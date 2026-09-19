# Ajustes de asociaciones Walmart — 2026-09-18

Incluye:
- Ajo (1x3): factor 1 porque Altavera y Walmart venden paquete de 3.
- Apio Verde: referencia única `Apio Hortifruti en rollo`, factor 1.
- Las otras dos presentaciones de apio quedan ignoradas para no volver a sugerirlas.
- Protección en base de datos contra dos referencias activas Walmart para un mismo producto Altavera.
- Al reasignar desde Admin, la referencia Walmart anterior del mismo competidor se reemplaza y queda ignorada.
- Descuentos menores a 2% no se muestran ni se tratan como oferta, aunque se conserva el precio regular original.
- Conversión automática entiende presentaciones Altavera como `1x3` y pesos escritos en el nombre, por ejemplo `500 gramos`.

## Aplicación
1. Ejecutar `APLICAR_AJUSTES_ASOCIACIONES_WALMART_20260918.sql` en Supabase SQL Editor.
2. Aplicar los archivos del parche al proyecto.
3. Ejecutar `npm run build`.
