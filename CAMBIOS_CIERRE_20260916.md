# Altavera — cierre técnico 16/09/2026

## Incluido en este parche

### Buscador de lugares en checkout
- Búsqueda manual por nombre o punto de referencia.
- Resultados limitados a Costa Rica y priorizados alrededor de Alajuela.
- Al elegir un resultado, el pin se mueve y vuelve a ejecutar la validación normal de cobertura.
- No hay autocomplete: la búsqueda solo ocurre al presionar Buscar o Enter.
- Proxy de servidor, atribución a OpenStreetMap, caché de 24 h y límite global antes de consultar Nominatim.
- La consulta escrita por el cliente no se guarda en texto dentro del caché; solo se conserva una huella hash.

### Protección anti-spam
- Creación de pedidos: límite por IP/fingerprint y límite adicional por contacto.
- Búsqueda de pedidos: límite por IP/fingerprint.
- Lectura segura de seguimiento: límite por IP/fingerprint.
- El identificador de red se guarda como hash, no como IP en texto.
- La aplicación de pedidos falla abierta si la migración de rate limiting aún no existe para no romper ventas.
- El geocodificador NO llama al proveedor externo si el limitador global no está instalado.

### Marketing
- Nueva preferencia en Perfil → Cuenta para activar o desactivar promociones.
- La baja marca las suscripciones como `unsubscribed` y registra `revoked_at`.
- La preferencia se mantiene sincronizada con metadatos de Auth y `customer_consents`.
- Si un usuario activa marketing desde checkout, su cuenta también queda actualizada para no perder esa decisión al siguiente login.
- Los correos transaccionales de pedidos siguen funcionando aunque promociones estén desactivadas.

### Migraciones recuperadas
Se restauraron desde versiones anteriores del proyecto:
- `20260903_admin_push_subscriptions.sql`
- `20260903_customer_consents.sql`
- `20260906_app_settings.sql`

Se agrega:
- `20260916_rate_limits_and_geocoding_cache.sql`

### Configuración / documentación
- `.env.example` con variables necesarias para Supabase, Resend, sitio, push y geocodificación.
- `CONFIGURACION_PRODUCCION.md`.
- `supabase/README.md` con procedimiento para capturar el baseline remoto que antecede al historial de migraciones.

## Paso obligatorio después de aplicar el parche

Aplicar en Supabase el SQL de:

`supabase/migrations/20260916_rate_limits_and_geocoding_cache.sql`

No es necesario volver a ejecutar a ciegas las migraciones históricas recuperadas si ya existen en la base remota.
