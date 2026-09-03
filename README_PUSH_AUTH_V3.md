# Fix Push Auth v3

Este cambio deja de comparar llaves internas de Supabase y usa un secreto privado propio de Altavera para autenticar las llamadas servidor -> Edge Function.

## 1. Generar el secreto

En Terminal:

```bash
openssl rand -hex 32
```

Copie el resultado sin compartirlo.

## 2. .env.local

Agregue:

```env
ALTAVERA_PUSH_INTERNAL_SECRET="EL_MISMO_SECRETO"
```

## 3. Supabase secrets

En Terminal:

```bash
supabase secrets set ALTAVERA_PUSH_INTERNAL_SECRET="EL_MISMO_SECRETO"
supabase functions deploy new-order-push
```

## 4. Reiniciar Next

```bash
rm -rf .next
npm run build
npm run dev
```

No regenere VAPID ni repita el SQL.
