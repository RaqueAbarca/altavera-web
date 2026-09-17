# Configuración de producción de Altavera

## Resend

Para que funcionen los correos de confirmación y cambios de estado deben existir en Vercel:

- `RESEND_API_KEY`
- `ALTAVERA_EMAIL_FROM`
- `ALTAVERA_SITE_URL=https://www.altaveraenlinea.com`

`ALTAVERA_EMAIL_FROM` debe usar un remitente autorizado por Resend, por ejemplo:

```text
Altavera <pedidos@altaveraenlinea.com>
```

El correo de respuesta del cliente no se toma de una variable de entorno: se usa el correo configurado en **Admin → Configuración → Atención al cliente** cuando está disponible.

## Teléfonos

- **SINPE Móvil:** solo para instrucciones de pago.
- **Atención al cliente / WhatsApp:** contacto público, comprobantes y datos estructurados de Google.

No deben intercambiarse aunque ambos sean números telefónicos.

## Buscador de lugares

El checkout incluye búsqueda manual de lugares/puntos de referencia. La petición pasa por `/api/geocode/search`, con caché y rate limiting en Supabase. No usa autocompletado.

Antes de usarlo en producción aplica la migración:

```text
supabase/migrations/20260916_rate_limits_and_geocoding_cache.sql
```

La URL del geocodificador puede cambiarse sin modificar el frontend mediante `ALTAVERA_GEOCODING_URL` siempre que el servidor sea compatible con la API Search de Nominatim.
