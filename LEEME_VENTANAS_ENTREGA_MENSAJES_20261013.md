# Altavera — ventanas de entrega, ETA y mensajes

Este parche se aplica encima de la versión que ya tiene envío dinámico + OpenRouteService.

## Qué agrega

### Horario general configurable por día de entrega
En Admin → Configuración → Entregas, cada día configurado tiene ahora:
- Día de corte
- Hora de corte
- Entregas desde
- Entregas hasta

Para los sábados la configuración inicial es 12:00–16:00.
Los horarios siguen siendo configurables desde Admin; no están fijos en código.

Si ya existía un calendario guardado sin horario de entrega, Altavera usa temporalmente 12:00–16:00 como valor por defecto hasta volver a guardar Configuración.

### Vista del cliente
El cliente ve la ventana general de entrega junto con la fecha, por ejemplo:
- Sábado 17 de octubre
- Entregas entre 12:00 p. m. y 4:00 p. m.

### Mensajes de WhatsApp
- Instrucciones de pago: recuerda que el detalle completo del pedido llega por correo y que las notificaciones importantes también se envían por correo.
- Confirmado: confirma el pago y recuerda las notificaciones por correo.
- Preparando: recuerda el horario general de entrega.
- En camino: intenta calcular con OpenRouteService la llegada aproximada de ese pedido dentro de la ruta optimizada.
- Entregado: agradece la compra e incluye el enlace oficial para dejar una reseña de Altavera.

La hora de llegada de “En camino” es aproximada y puede variar por tráfico y entregas anteriores.

### Ruta de entregas
Al optimizar la ruta en Admin → Entregas ahora se muestra:
- horario general
- inicio estimado de ruta
- distancia total
- tiempo conduciendo
- tiempo de paradas
- tiempo total
- llegada estimada de cada parada

Si la ruta estimada termina después del horario general, Admin muestra una advertencia.

## Google reseñas
El enlace configurado es:
https://g.page/r/CZ3xrpmV8wfOECE/review

No se incluyó ningún descuento condicionado a dejar una reseña.

## Base de datos
No requiere SQL nuevo. Las horas de entrega se guardan dentro de la configuración existente.

## OpenRouteService
Mantiene la variable ya configurada:
OPENROUTESERVICE_API_KEY=...

## Después de instalar
1. Ejecutar `npm run build`.
2. Ir a Admin → Configuración → Entregas.
3. Confirmar para sábado:
   - Entregas desde: 12:00
   - Entregas hasta: 16:00
4. Guardar Configuración.
5. Probar un pedido y los cambios de estado.

## Instalación
Desde la raíz del proyecto:

```bash
unzip -o ~/Downloads/altavera_patch_ventanas_entrega_mensajes_20261013.zip -d .
npm run build
```

Si compila correctamente:

```bash
git add .
git commit -m "Agregar ventanas de entrega y ETA por ruta"
git push
```
