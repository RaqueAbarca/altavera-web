# WhatsApp automático al marcar un pedido "En camino"

Este patch reemplaza el `sendWhatsApp()` simulado de la Edge Function `order-status` por una llamada real a WhatsApp Cloud API.

## Qué hace

- Solo envía WhatsApp cuando el estado recibido es `ready` (la interfaz lo muestra como **En camino**).
- Los demás cambios de estado siguen funcionando, pero no generan mensajes automáticos.
- Si el teléfono tiene 8 dígitos, agrega automáticamente el código de Costa Rica `506`.
- El cambio de estado del pedido no depende del envío: si WhatsApp falla, el pedido ya habrá quedado marcado como En camino y el error aparecerá en la consola del admin.

## 1. Crear la plantilla en WhatsApp Manager

Crea una plantilla de categoría **UTILITY** con:

- Nombre: `altavera_pedido_en_camino`
- Idioma: Español (`es`)
- Cuerpo sugerido:

```text
Hola {{1}}, tu pedido #{{2}} de Altavera ya va en camino a la dirección que registraste. Gracias por comprar con nosotros.
```

Los parámetros se llenan así:

- `{{1}}`: nombre del cliente
- `{{2}}`: primeros 8 caracteres del número de pedido

Espera a que Meta apruebe la plantilla antes de probar con clientes reales.

## 2. Configurar secrets de la Edge Function

Desde la raíz del proyecto:

```bash
supabase secrets set WHATSAPP_ACCESS_TOKEN="TU_TOKEN_PERMANENTE"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="TU_PHONE_NUMBER_ID"
supabase secrets set WHATSAPP_TEMPLATE_NAME="altavera_pedido_en_camino"
supabase secrets set WHATSAPP_TEMPLATE_LANGUAGE="es"
supabase secrets set WHATSAPP_GRAPH_VERSION="v26.0"
```

No guardes el access token en `.env.local`, GitHub ni archivos que vayas a compartir.

## 3. Desplegar la Edge Function

```bash
supabase functions deploy order-status
```

## 4. Probar

En Admin > Pedidos o Admin > Entregas:

1. Usa un pedido cuyo teléfono sea tu propio WhatsApp.
2. Lleva el pedido hasta **Preparando**.
3. Pulsa **Marcar en camino**.
4. El pedido cambia a `ready` y la Edge Function envía la plantilla de WhatsApp.

Si el pedido cambia de estado pero el mensaje no llega, revisa los logs de `order-status` en Supabase Functions.
