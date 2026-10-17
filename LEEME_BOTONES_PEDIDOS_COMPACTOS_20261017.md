# Botones compactos en pedidos — 2026-10-17

Este patch ajusta solamente la interfaz de acciones del Panel de pedidos.

Cambios:
- Contactar al cliente: solo icono.
- Imprimir comprobante: solo icono.
- Cambiar fecha: solo icono.
- La acción principal del estado (por ejemplo, Marcar en camino) conserva texto.
- Cancelar pedido conserva texto.
- Los iconos tienen title/aria-label para mantener claridad y accesibilidad.
- En móvil los iconos se mantienen compactos en lugar de ocupar todo el ancho.

No requiere SQL ni cambios en Supabase.
