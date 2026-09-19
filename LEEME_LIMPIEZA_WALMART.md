# Limpieza Walmart pre-lanzamiento

1. Ejecutar `LIMPIAR_WALMART_PRELANZAMIENTO_20260918.sql` en Supabase SQL Editor.
2. El resultado esperado debe dejar 153 productos Walmart y 1 corrida Walmart regional.
3. Aplicar este patch al proyecto y ejecutar `npm run build`.
4. Publicar en Vercel.
5. Volver a Admin > Precios > Walmart: la interfaz solo muestra la última corrida regional exitosa.
6. Revisar asociaciones/conversiones pendientes antes de procesar CENADA otra vez.

El SQL no toca productos Altavera, CENADA, pedidos, clientes ni reglas de precios.
