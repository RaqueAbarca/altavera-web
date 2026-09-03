# WhatsApp manual al marcar En camino

Este patch no usa WhatsApp Cloud API ni requiere credenciales.

Cuando un pedido cambia a **En camino** desde Admin > Pedidos o Admin > Entregas:

1. Altavera actualiza el estado del pedido.
2. Abre WhatsApp Web/app en una pestaña nueva.
3. Selecciona automáticamente el número del cliente.
4. Deja el mensaje listo para enviar.
5. La persona administradora solo debe pulsar **Enviar**.

Los teléfonos locales de Costa Rica de 8 dígitos reciben automáticamente el prefijo `506`.

No requiere SQL, Edge Functions, API de WhatsApp ni cambios en Supabase.
