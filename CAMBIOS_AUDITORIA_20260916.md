# Altavera — cierre de auditoría 2026-09-16

Este paquete parte del proyecto compartido el 2026-09-13.

## Cambios aplicados

1. Validación de cantidades por peso
   - `kg`, `Kg`, `Kilo`, `Kilogramo` y `Kilogramos` usan la misma regla.
   - Los productos por peso aceptan incrementos de 0,5 kg.
   - Las demás unidades siguen requiriendo cantidades enteras.
   - Se agregaron pruebas para estas variantes.

2. Cancelación de pedidos
   - Nueva pestaña `Cancelados` en Admin > Pedidos.
   - Botón `Cancelar pedido` en pedidos no entregados/no cancelados.
   - Confirmación antes de cancelar.
   - Los cancelados quedan fuera de la lista de compra.
   - Se envía correo transaccional de cancelación cuando Resend está configurado.

3. Recuperación de contraseña
   - Opción `¿Olvidaste tu contraseña?` en el login.
   - Envío de enlace con Supabase Auth.
   - Nueva página `/restablecer-contrasena` para definir una contraseña nueva.
   - Página marcada como privada/no indexable.

4. Sincronización de consentimiento/marketing
   - Nueva API autenticada `/api/marketing/sync-account`.
   - Sincroniza la preferencia de marketing del registro con `marketing_subscriptions`.
   - Sincronización automática al detectar una sesión iniciada.
   - Nunca inventa fechas de aceptación legal: solo copia datos de consentimiento existentes en los metadatos de registro.

5. SEO / teléfonos
   - Google/Schema usa dinámicamente el número de `Atención al cliente` configurado en Admin.
   - El número de SINPE permanece separado y se usa únicamente para pagos.
   - Si cambia el teléfono de atención en Admin, los datos estructurados de Google se actualizan sin tocar código.

## Validaciones realizadas aquí

- Todos los imports locales `@/...` resuelven a archivos existentes.
- 224 archivos TS/TSX parsean sin errores sintácticos.
- Pruebas directas de cantidades:
  - 0,5 kg: válido.
  - 1,5 Kilo: válido.
  - 2,5 Kilogramo: válido.
  - 0,25 Kg: inválido.
  - 1,5 Und: inválido.
  - 2 Und: válido.

## Pruebas que requieren despliegue/configuración real

- Build completo con dependencias instaladas.
- Flujo de recuperación de contraseña mediante correo real de Supabase.
- Correo de cancelación vía Resend.
- Pedido real de punta a punta en producción.
- Confirmar valores reales de tarifa de envío, SINPE, cuentas bancarias, WhatsApp y correo.
- Push administrativo en el dispositivo final.
