# Recalcular recomendaciones después de corregir Walmart

Este parche agrega un botón **Recalcular con correcciones** en Admin > Precios > Recomendaciones.

## Por qué hace falta
Las recomendaciones de un Run son una foto de las fuentes disponibles en el momento en que se generó. Si una observación de Walmart estaba bloqueada por precio sospechoso o conversión pendiente, el Run guardó esa recomendación sin Walmart. Aprobar o verificar la observación posteriormente sincroniza Walmart, pero no modifica el Run ya creado.

## Nuevo flujo
1. Ejecutar el proceso normal de precios.
2. Revisar Walmart y aprobar precios sospechosos / verificar conversiones.
3. Volver a Recomendaciones.
4. Pulsar **Recalcular con correcciones**.

Se crea un Run nuevo usando el mismo ciclo CENADA y los datos Walmart ya corregidos, sin volver a subir boletines ni ejecutar una nueva actualización Walmart.

No requiere cambios SQL.
