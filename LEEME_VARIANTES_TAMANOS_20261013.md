# Altavera — variantes de tamaño

Este parche agrega venta por tamaño para productos completos como sandía y melón sin modificar pedidos ya existentes.

## Qué hace
- Admin → Productos permite activar **Vender por tamaño**.
- Cada tamaño tiene nombre, peso aproximado, precio y estado activo/inactivo.
- En catálogo el cliente elige tamaño antes de agregar.
- Los productos por tamaño se venden por **unidad**.
- Carrito y checkout muestran el tamaño y peso aproximado.
- El servidor vuelve a validar la variante y su precio antes de crear el pedido.
- En la lista de compra, los pedidos anteriores por kg y los nuevos por tamaño quedan separados.

Ejemplo:
- Pedido anterior: `Sandía · 1 kg`
- Pedido nuevo: `Sandía · Mediana · 3–5 kg aprox. · 1 und`

El pedido existente de 1 kg no se actualiza ni se recalcula.

## Base de datos
Ejecutar una vez en Supabase:

`APLICAR_VARIANTES_TAMANOS_20261013.sql`

Solo agrega configuración al producto; no altera registros de `orders` ni `order_item` existentes.

## Configurar Sandía / Melón
Después del deploy:
1. Admin → Productos.
2. Editar Sandía o Melón.
3. Activar **Vender por tamaño**.
4. Agregar Pequeña / Mediana / Grande con el rango de peso y precio que decidas.
5. Guardar.

No cambia la unidad/precio base usada por el sistema de precios; las variantes tienen su propio precio de venta.
