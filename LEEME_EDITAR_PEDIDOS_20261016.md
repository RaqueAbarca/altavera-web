# Editar productos de un pedido

Este patch agrega un botón **Editar** a cada producto dentro de un pedido del administrador.

Permite:
- cambiar un producto por otro del catálogo;
- corregir la cantidad;
- seleccionar presentación cuando el producto usa variantes;
- conservar el precio histórico si solo se corrige la cantidad del mismo producto;
- recalcular automáticamente subtotal y total;
- avisar cuánto falta cobrar o cuánto queda a favor del cliente si el total cambia;
- avisar si la jornada ya tenía un cierre de Dinero.

No permite modificar pedidos cancelados o ya entregados.

## Limpieza opcional de jornadas viejas

El archivo `LIMPIAR_JORNADAS_ANTERIORES_20261016.sql` elimina datos de jornadas con fecha anterior al 10 de octubre de 2026. Conserva el 10 de octubre, el 17 de octubre y cualquier fecha futura. Ejecutarlo solo si esas jornadas anteriores eran pruebas.
