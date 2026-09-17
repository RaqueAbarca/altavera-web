# Altavera — confirmación de cuenta

Cambios:
- Los enlaces de confirmación y recuperación usan https://www.altaveraenlinea.com cuando el registro se hace desde localhost.
- Pantalla de confirmación con reenvío de correo (60 s de espera entre intentos).
- Opción "Corregir correo o datos".
- Si se corrige un registro pendiente, la cuenta no confirmada anterior se elimina de forma segura antes de crear la nueva.
- Detección de correo ya registrado.

Configuración recomendada en Supabase > Authentication > URL Configuration:
- Site URL: https://www.altaveraenlinea.com
- Redirect URLs:
  - https://www.altaveraenlinea.com/**
  - http://localhost:3000/**

Nota: un correo de confirmación ya enviado conserva el enlace que tenía al momento de enviarse. Tras aplicar este parche, usa "Reenviar correo" para generar uno nuevo con la URL correcta.
