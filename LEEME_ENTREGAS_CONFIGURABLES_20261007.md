# Entregas configurables — 7 oct 2026

Este cambio permite configurar desde **Admin → Configuración** uno o varios días de entrega, con día y hora de corte independientes para cada día.

## Activación inicial

El despliegue no inventa una hora de corte. Mientras el nuevo calendario no se guarde, Altavera conserva el calendario histórico existente.

Al abrir Admin → Configuración por primera vez después del despliegue:

1. **Sábado** aparece preseleccionado como borrador.
2. Elegí el **día de corte** para la entrega del sábado.
3. Elegí la **hora de corte**.
4. Presioná **Guardar entregas y tarifa**.

Desde ese momento, solo los sábados quedarán habilitados si sábado es el único día seleccionado.

## Cambiar a dos o más días

Activá los días adicionales en la misma pantalla. Para cada uno podés definir un día y una hora de corte distintos.

Ejemplo conceptual:

- Entrega miércoles → corte lunes, 6:00 p. m.
- Entrega sábado → corte jueves, 6:00 p. m.

El ejemplo no se guarda automáticamente; los valores reales los elegís desde el panel.

## Base de datos

No requiere una migración nueva. La configuración se guarda dentro del JSONB `app_settings.delivery_pricing`, que ya existe.

## Compatibilidad

Se conserva la función histórica `altavera_finalize_delivery_cycles()` para no romper el cierre/finalización existente de ciclos. Después de ejecutarla, Altavera reconcilia los ciclos futuros con el calendario configurado por el administrador.
