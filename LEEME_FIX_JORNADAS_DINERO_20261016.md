# Fix Jornadas de Dinero — 2026-10-16

Corrige un problema donde la pantalla Dinero podía mostrar 0 jornadas y ₡0 en pedidos apartados aunque existieran pedidos confirmados.

## Causa
La API tomaba primero los 24 ciclos de entrega más futuros y luego buscaba pedidos dentro de esos ciclos. Si había suficientes ciclos futuros vacíos, la jornada actual quedaba fuera.

## Cambio
Ahora la API busca primero los pedidos con estados pagados (`confirmed`, `preparing`, `ready`, `delivered`) y sus cierres financieros, y luego carga exactamente los ciclos relacionados.

No requiere cambios en Supabase ni ejecutar SQL adicional.
