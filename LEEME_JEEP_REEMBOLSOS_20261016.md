# Altavera — Jeep automático + reembolsos

## Qué cambia

### Jeep
- La jornada ya no pide escribir kilómetros ni costos por km manualmente.
- CENADA se calcula desde el punto de salida configurado con OpenRouteService: origen → CENADA → origen.
- Se suman una sola vez 2,8 km de recorrido interno de CENADA.
- La ruta de entregas se optimiza con los pedidos pagados de la jornada y regresa al punto de salida.
- Gasolina por km y mantenimiento por km salen del vehículo activo y de la configuración de Entregas.
- Al cerrar la jornada los valores quedan guardados como históricos.
- Si un pedido pagado no tiene ubicación válida o ORS no puede calcular, no deja cerrar la jornada con un costo incompleto.

En `Admin → Configuración → Entregas` queda una sección `Ruta fija a CENADA` para revisar una sola vez el punto de CENADA y los 2,8 km internos.

### Productos no conseguidos y reembolsos
- En `Dinero → Jornada → Productos` aparece `Marcar no conseguido`.
- El producto no exige costo de compra y no consume un sobrante anterior.
- Altavera identifica automáticamente qué clientes pagaron ese producto, la cantidad y el monto correspondiente según el precio guardado en cada pedido.
- Se muestra una lista de reembolsos con cliente, teléfono, producto, cantidad y monto.
- Cada reembolso puede marcarse como `Reembolso realizado`.
- Los reembolsos pendientes quedan como obligación y se separan del dinero disponible.
- Los reportes distinguen total cobrado, reembolsos e ingreso neto.
- El estado de reembolso se puede actualizar incluso después de cerrar la jornada, sin reabrir todo el cierre.

## Supabase
Ejecutar una sola vez en SQL Editor:

`APLICAR_JEEP_REEMBOLSOS_20261016.sql`

La migración:
- agrega `unavailable` a `money_product_costs`;
- agrega `refund_total_snapshot` a `money_closures`;
- crea `money_refunds`;
- habilita RLS en `money_refunds` y limita el acceso a administradores mediante `public.is_admin()`.

## Aplicar patch

```bash
cd ~/Documents/APPS/altavera_web
unzip -o ~/Downloads/altavera_patch_jeep_reembolsos_20261016.zip -d .
npm run build
```

Después de un build exitoso:

```bash
git add .
git commit -m "Automatiza jeep y agrega control de reembolsos"
git push origin main
```
