# Sonidos personalizados del admin de Altavera

Este patch agrega sonidos cuando el panel administrativo está abierto:

- **Nuevo pedido:** “New Notification 09” de Universfield (Pixabay).
- **Pago confirmado:** “Correct answer tone” de Mixkit.

## Qué hace

- Cuando llega un Web Push de un pedido nuevo y hay una pestaña del admin abierta, el service worker avisa a la página y Altavera reproduce el sonido de nuevo pedido.
- Cuando en `Admin > Pedidos` se cambia un pedido de `Pago por confirmar` a `Confirmado`, reproduce el sonido de pago confirmado.
- En `Admin > Configuración` se pueden activar/desactivar los sonidos, cambiar el volumen y probar ambos sonidos.
- La preferencia de sonido y volumen se guarda por dispositivo en `localStorage`.

## Aplicación

```bash
unzip -o ~/Downloads/altavera_sonidos_admin.zip -d .
rm -rf .next
npm run build
```

Como cambió `supabase/functions/new-order-push/index.ts`, vuelve a desplegar la función:

```bash
supabase functions deploy new-order-push
```

Luego haz `git add`, commit y push normalmente.

## Importante

Los sonidos personalizados solo pueden reproducirse mientras existe una pestaña/app de Altavera Admin abierta. Cuando el admin está cerrado, Web Push sigue usando el sonido que decida macOS/iOS/Android.

El sonido de pago se dispara actualmente cuando un administrador confirma el pago. Si en el futuro el pago se confirma automáticamente mediante webhook/pasarela, se puede mover el disparo al evento real de pago.
