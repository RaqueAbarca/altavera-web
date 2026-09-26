# Altavera — pedidos tipo factura + contacto al cliente

Este parche modifica únicamente el panel administrativo de pedidos.

## Cambios
- Cada pedido muestra una tabla con producto, cantidad, precio unitario y subtotal.
- Debajo se muestran subtotal de productos, envío y total.
- En pedidos pendientes, el total se resalta como “Total a verificar”.
- Se agrega botón “Contactar al cliente”, que abre WhatsApp al teléfono del pedido con un mensaje preparado.
- Se conserva ubicación, Waze/Maps, método de pago, notas y flujo de estados.
- Las tarjetas de pedido usan una sola columna para que el detalle tipo factura sea legible.

## Base de datos
No requiere SQL ni cambios de Supabase. Usa `orders.subtotal`, `orders.shipping`, `orders.total` y los precios históricos de `order_item` que ya existen.

## Aplicación
Desde la raíz de `altavera_web`:

```bash
unzip -o ~/Downloads/altavera_patch_admin_factura_contacto_20260925.zip -d .
npm run build
```

Si el build pasa:

```bash
git add .
git commit -m "Mejorar detalle administrativo de pedidos"
git push
```

Después del deploy, refrescar Admin → Pedidos y abrir el pedido de prueba real.
