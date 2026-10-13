# Altavera · envío configurable + Configuración por pestañas

## Qué cambia

- Admin → Configuración ahora tiene 3 pestañas: **Entregas**, **Pagos y contacto** y **Alertas**.
- En Entregas se conserva el calendario de días/cortes.
- Se agrega un sistema de costo de envío configurable:
  - tarifa fija o cálculo individual por distancia;
  - punto de salida;
  - precio por litro de Súper, Regular y Diésel;
  - pago por hora de entrega;
  - varios vehículos con vehículo activo;
  - consumo L/100 km y mantenimiento/desgaste por km por vehículo;
  - factor estimado de carretera;
  - velocidad promedio;
  - minutos por parada;
  - margen sobre el costo;
  - redondeo del cobro.
- Los pedidos nuevos guardan una fotografía del cálculo de envío usado.
- Los códigos de envío gratis siguen descontando el 100% del envío calculado.

## Importante sobre la distancia

Esta primera versión NO usa todavía Google Maps/Mapbox/otro proveedor de rutas. Para no depender de una API externa, calcula:

`distancia en línea recta × factor de carretera configurable`

Después considera ida + regreso. El factor queda visible en Configuración y no se activa el modo por distancia hasta que completes todos los datos necesarios.

Más adelante se puede reemplazar esta aproximación por distancia/tiempo de carretera real sin rediseñar el modelo de costos.

## Valores iniciales

Se precargan únicamente datos ya definidos para Altavera:

- Jeep
- Súper
- 13.4 L/100 km
- Súper: ₡764/L
- Mano de obra de entrega: ₡1.400/h

**No se inventa mantenimiento, factor de carretera, velocidad ni tiempo por parada.** Esos campos quedan pendientes y deben definirse antes de activar “Calculado por distancia”.

## Instalación

1. Ejecutar en Supabase SQL Editor:

`APLICAR_ENVIO_CONFIGURABLE_20261012.sql`

2. Desde la raíz de Altavera, copiar el parche y ejecutar:

```bash
unzip -o ~/Downloads/altavera_patch_envios_config_20261012.zip -d .
npm run build
```

3. Si el build pasa:

```bash
git add .
git commit -m "Agregar envio configurable y organizar configuracion"
git push
```

## Activación segura

El sitio conserva el modo de tarifa fija que ya tenías. Primero podés llenar todos los costos nuevos sin alterar el checkout. Cuando los valores estén listos, seleccioná **Calculado por distancia** y guardá.
