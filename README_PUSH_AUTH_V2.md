# Fix Web Push - autenticacion de Edge Function

Este ajuste evita depender de `supabase.functions.invoke()` para una llamada interna con llaves nuevas `sb_secret_...`.

- Next.js llama `new-order-push` con la llave de servidor en el header `apikey`.
- La Edge Function acepta tanto las llaves secret actuales expuestas por `SUPABASE_SECRET_KEYS` como el `service_role` legacy.
- `verify_jwt = false` queda fijado en `supabase/config.toml` para esta funcion.
- La ruta de prueba ahora muestra el status/error real que devuelva la funcion.

Despues de aplicar:

```bash
supabase functions deploy new-order-push
rm -rf .next
npm run build
npm run dev
```

No hace falta regenerar VAPID ni volver a correr SQL.
