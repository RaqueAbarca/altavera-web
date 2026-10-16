# Cambiar fecha de entrega de un pedido

Agrega un botón **Cambiar fecha** dentro de cada pedido activo en **Admin → Pedidos**.

Permite:
- mover un pedido de una semana a otra;
- moverlo a una fecha cuyo corte ya fue realizado;
- mostrar una advertencia antes de moverlo a un ciclo cerrado;
- actualizar inmediatamente la fecha, el total pagado y la lista de compra del ciclo correspondiente.

El cambio es administrativo y no usa las restricciones del checkout del cliente.
No modifica el total, los productos, el pago ni el estado del pedido.

## Aplicar

```bash
cd ~/Documents/APPS/altavera_web
unzip -o ~/Downloads/altavera_patch_cambiar_fecha_pedido_20261015.zip -d .
npm run build
```

No requiere SQL.

Después de mover un pedido a una fecha cuyo corte ya estaba hecho, revisá la lista de compra y volvé a optimizar la ruta si ya la habías calculado.
