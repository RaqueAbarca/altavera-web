# Confirmación de cuenta con sesión iniciada

Este parche agrega `/auth/confirm`, que verifica el token enviado por Supabase, crea la sesión en cookies y redirige a `/profile`.

## Cambio necesario en Supabase

En Authentication > Emails > Confirm sign up, cambia SOLO el href del botón.

Antes:

    href="{{ .ConfirmationURL }}"

Después:

    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"

No cambies el resto del diseño.

## Aplicar

    unzip -o ~/Downloads/altavera_patch_sesion_confirmacion_20260917.zip -d .
    npm run build

Después haz push/deploy y crea una cuenta nueva de prueba. Al confirmar, debe abrir `/profile` con la sesión iniciada.
