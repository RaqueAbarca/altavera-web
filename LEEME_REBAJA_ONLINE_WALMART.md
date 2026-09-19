# Walmart: rebajas exclusivas en línea

Cambio intencional y acotado:

- Si VTEX/Walmart marca un producto como **"Rebaja Exclusiva en línea"**, Altavera ignora ese precio promocional para el cálculo competitivo y usa `ListPrice` (precio regular) como precio efectivo de Walmart.
- El dato crudo de Walmart sigue guardándose en `raw_data` para auditoría.
- Las promociones normales continúan funcionando igual.
- El umbral existente del 2% para descuentos sigue igual.
- No se modifican reglas de margen, excepciones competitivas, asociaciones ni conversiones.
- No requiere SQL ni cambios de Supabase.

Después de desplegar, actualice Walmart y regenere la corrida de precios para que Limón mandarina y cualquier otro producto con esa etiqueta use el precio regular.
