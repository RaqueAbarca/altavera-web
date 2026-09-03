# Fix de autenticación para new-order-push

El frontend podía registrar la suscripción, pero la Edge Function rechazaba la llamada si Supabase enviaba la secret/service-role key en el header `apikey` en lugar de `Authorization: Bearer ...`.

Este fix:
- acepta `apikey` y Bearer para llamadas internas;
- desactiva la validación JWT del gateway para esta función y mantiene la validación privada dentro del handler;
- no requiere SQL ni volver a generar las llaves VAPID.

Después de aplicar:

```bash
supabase functions deploy new-order-push --no-verify-jwt
rm -rf .next
npm run build
npm run dev
```

Después probá otra vez Admin > Configuración > Enviar prueba.
