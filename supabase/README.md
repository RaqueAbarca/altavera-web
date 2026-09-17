# Supabase de Altavera

La carpeta `migrations/` reúne nuevamente las migraciones que estaban repartidas entre versiones anteriores del proyecto. Las migraciones recuperadas del historial son:

- `20260903_admin_push_subscriptions.sql`
- `20260903_customer_consents.sql`
- `20260906_app_settings.sql`
- `202609081815_asparagus_roll_and_conversion_review.sql`
- `202609090945_order_item_unit_snapshot.sql`
- `20260909_customer_addresses.sql`
- `20260909_customer_favorites.sql`
- `20260916_rate_limits_and_geocoding_cache.sql`

## Importante: falta el baseline histórico original

Las primeras tablas del proyecto (por ejemplo productos, pedidos, ciclos de entrega, precios y algunas funciones RPC) se crearon antes de que el repositorio empezara a conservar migraciones. No es seguro reconstruirlas a mano sin comparar con la base remota actual.

Antes de considerar el repositorio 100% reconstruible, captura un snapshot **solo de esquema** de la base remota:

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db dump --linked --schema public -f supabase/schema.remote.sql
```

`db dump` es una operación de lectura del esquema. Revisa el archivo generado antes de incorporarlo al control de versiones y no exportes datos de producción.

Para revisar diferencias mediante el flujo oficial de migraciones, usa `supabase db pull` únicamente después de revisar el historial local/remoto y hacer respaldo.

## Migración nueva del 16 de septiembre

`20260916_rate_limits_and_geocoding_cache.sql` crea:

- `api_rate_limits`
- función `consume_api_rate_limit(...)`
- `geocoding_cache`

Esta migración es necesaria para que el buscador de lugares pueda llamar a Nominatim respetando el límite global configurado por la aplicación y para activar la protección anti-spam de pedidos/seguimiento.
