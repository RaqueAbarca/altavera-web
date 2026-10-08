# Altavera — WhatsApp de instrucciones de pago

Este parche cambia el botón de WhatsApp en **Admin → Pedidos** cuando un pedido está en **Pago por confirmar**.

## Qué cambia

- El botón pasa de **Contactar al cliente** a **Enviar instrucciones de pago** mientras el pedido está pendiente de pago.
- Abre WhatsApp con un mensaje listo para enviar que incluye:
  - nombre del cliente;
  - número corto del pedido;
  - fecha de entrega;
  - total;
  - método de pago seleccionado;
  - indicación general de pagar por el medio elegido (SINPE Móvil o transferencia bancaria);
  - solicitud del comprobante por el mismo chat;
  - opción de pedir el detalle completo del pedido con productos, cantidades y precios.
- Para pedidos en otros estados se conserva el botón **Contactar al cliente** con el comportamiento anterior.

## Aplicación

Desde la raíz del proyecto:

```bash
cd ~/Documents/APPS/altavera_web
unzip -o ~/Downloads/altavera_patch_whatsapp_pago_20261008.zip -d .
npm run build
```

No requiere SQL ni cambios en Supabase.
