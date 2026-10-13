# Altavera — envío configurable + OpenRouteService (versión ajustada)

Esta versión reemplaza los parches anteriores de envío configurable/OpenRouteService que todavía no se hayan aplicado.

## Qué queda configurable en Admin → Configuración → Entregas
- Tarifa fija o cálculo dinámico.
- Punto de salida.
- Vehículos y vehículo activo.
- Tipo de combustible.
- Consumo L/100 km.
- Mantenimiento/desgaste en CRC por km.
- Precio de Súper, Regular y Diésel.
- Pago por hora de entrega.
- Minutos adicionales por parada.
- Margen sobre el costo.
- Envío mínimo (precargado en CRC 1.500).
- Redondeo de la tarifa.

## Qué NO se configura manualmente
- Velocidad promedio.
- Factor de carretera.
- Distancia del cliente.
- Duración de conducción.

OpenRouteService obtiene automáticamente la distancia y la duración por carretera.
Si OpenRouteService no está disponible, el cálculo dinámico no inventa una tarifa: pide reintentar.

## Vista del cliente
El cliente solo ve la línea normal de envío y el monto final calculado. La API pública de cotización no devuelve el desglose interno de gasolina, mantenimiento, distancia ni tiempo.

## Historial por pedido
Cada pedido nuevo guarda:
- shipping_base
- shipping_discount
- shipping_cost_estimated
- shipping_calculation

Así los pedidos antiguos conservan los valores con los que fueron calculados aunque luego cambien vehículo, gasolina, salario o mantenimiento.

## OpenRouteService
Crear una API key y agregarla en `.env.local` y Vercel:

OPENROUTESERVICE_API_KEY=TU_CLAVE

La clave queda solo del lado del servidor.

## Base de datos
Si todavía no se aplicó, ejecutar una sola vez:

APLICAR_ENVIO_CONFIGURABLE_20261012.sql

## Instalación
Desde la raíz del proyecto:

unzip -o ~/Downloads/altavera_patch_envios_ors_ajustado_20261012.zip -d .
npm run build

Si compila correctamente:

git add .
git commit -m "Agregar envio dinamico con OpenRouteService"
git push
