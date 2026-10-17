# Comprobante en una hoja Carta — 2026-10-17

Este parche ajusta únicamente el comprobante imprimible de pedidos.

Cambios:
- impresión en tamaño Carta vertical;
- layout de dos columnas para aprovechar mejor la hoja;
- productos a la izquierda y resumen/agradecimiento/QR a la derecha;
- tamaños y espacios compactos para intentar mantener pedidos normales en una sola hoja;
- compactación adicional automática para pedidos con 10+ y 16+ productos;
- al imprimir se ocultan el header administrativo, footer del sitio y controles de pantalla;
- la vista de pantalla funciona como previsualización aproximada del comprobante.

No requiere cambios en Supabase.

Nota: los encabezados/pies propios del navegador (URL, fecha, número de página) dependen del cuadro de impresión del navegador. Si aparecen, desactive la opción "Encabezados y pies de página" en el diálogo de impresión.
