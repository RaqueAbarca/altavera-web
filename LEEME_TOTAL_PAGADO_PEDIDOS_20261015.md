# Total pagado de pedidos

Agrega al panel **Admin > Pedidos** un resumen de dinero para la entrega seleccionada.

Muestra:
- **Total pagado por clientes**: suma de `order.total` de pedidos cuyo pago ya fue confirmado.
- **Productos cobrados**: suma de los subtotales de productos de esos pedidos.
- **Envíos cobrados**: suma del envío de esos pedidos.
- Cantidad de pedidos pagados incluidos.

Se consideran pagados los estados `confirmed`, `preparing`, `ready` y `delivered`.
No se incluyen pedidos `pending`, `pending_payment` ni `cancelled`.

## Aplicación

```bash
cd ~/Documents/APPS/altavera_web
unzip -o ~/Downloads/altavera_patch_total_pagado_pedidos_20261015.zip -d .
npm run build
```

No requiere SQL ni cambios en Supabase.
