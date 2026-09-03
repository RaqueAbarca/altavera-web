# Patch: flujo de estados de pedidos

Nuevo flujo:

`pending_payment` → `confirmed` → `preparing` → `ready` → `delivered`

En el admin se muestra como:

1. Pago por confirmar
2. Confirmados
3. Preparando
4. En camino
5. Entregados

No requiere migración SQL: `orders.status` ya acepta texto.

Si la Edge Function `order-status` está desplegada en Supabase y quieres que también reconozca el nuevo estado `confirmed`, vuelve a desplegar esa función después de aplicar el patch.
