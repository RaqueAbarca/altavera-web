# Ajustes de cuenta - 17/09/2026

Este parche incluye:

- Mensajes comunes de autenticación de Supabase traducidos al español.
- Registro separado en Nombre + Apellido.
- Campo opcional "Nombre corto o apodo" para saludos.
- Compatibilidad con usuarios existentes que solo tengan `full_name`.
- El encabezado del perfil muestra "¡Hola, <nombre corto>!".
- El header usa el nombre corto cuando existe.
- Los datos personales siguen mostrando el nombre completo.
- Después de un registro que requiere confirmar correo, se muestra una pantalla dedicada "Revisa tu correo" sin botón de continuar/iniciar sesión.
- Los errores de recuperación/restablecimiento de contraseña también pasan por mensajes en español.

No requiere cambios SQL ni nuevas tablas.
