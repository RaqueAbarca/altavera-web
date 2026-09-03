# Notificaciones de nuevos pedidos — Altavera

Este patch agrega Web Push para administradores. Cada dispositivo se activa desde `/admin/configuracion`.

## 1. Ejecutar migración

En Supabase SQL Editor ejecutar:

`supabase/migrations/20260903_admin_push_subscriptions.sql`

## 2. Generar llaves VAPID una sola vez

Desde la raíz del proyecto:

```bash
npm run vapid:generate
```

Guardá ambos valores. La llave privada no debe subirse a Git.

## 3. Variables de Next.js / Vercel

Agregar al `.env.local` y posteriormente a las variables del proyecto en Vercel:

```env
VAPID_PUBLIC_KEY="..."
```

Next.js solo necesita la llave pública para crear la suscripción del navegador.

## 4. Secrets de Supabase Edge Functions

```bash
supabase secrets set VAPID_PUBLIC_KEY="TU_PUBLIC_KEY"
supabase secrets set VAPID_PRIVATE_KEY="TU_PRIVATE_KEY"
supabase secrets set VAPID_SUBJECT="mailto:TU_CORREO"
```

La public y private key deben ser el mismo par generado en el paso 2.

## 5. Desplegar la Edge Function

```bash
supabase functions deploy new-order-push
```

## 6. Reiniciar Next.js

Después de agregar `VAPID_PUBLIC_KEY` al `.env.local`:

```bash
rm -rf .next
npm run build
```

Para desarrollo:

```bash
npm run dev
```

## 7. Activar un dispositivo

Iniciar sesión en Admin → Configuración → Activar notificaciones.

Cada administrador/dispositivo debe activarse por separado.

### iPhone/iPad

En iOS/iPadOS 16.4 o posterior, Altavera debe agregarse a la pantalla de inicio y abrirse desde ese icono para solicitar Web Push. La app ya tiene manifest `standalone`.

### Sonido

Altavera envía la notificación como no silenciosa y solicita vibración cuando el navegador lo soporta. El sonido final depende de los ajustes de notificaciones, volumen y modos de concentración del dispositivo; una web no puede forzar un sonido personalizado del sistema.

## Prueba

Después de activar el dispositivo, crear un pedido de prueba desde la tienda. El pedido debe crearse aunque el envío de la notificación falle: Push no forma parte de la transacción del pedido.

También podés usar **Enviar prueba** en Admin → Configuración. La prueba usa la misma Edge Function y las mismas suscripciones que los pedidos reales.
