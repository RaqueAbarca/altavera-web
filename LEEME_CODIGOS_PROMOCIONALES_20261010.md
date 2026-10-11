# Altavera · Códigos promocionales

Este parche agrega una primera versión segura y simple de códigos de **envío gratis**.

## Incluye
- Nueva sección **Admin → Códigos**.
- Crear códigos con nombre, activo/inactivo, inicio opcional, vencimiento opcional y máximo de usos opcional.
- Contador de usos.
- Activar/desactivar sin borrar el código.
- Campo de código promocional en checkout.
- Validación en servidor: el navegador no puede forzar envío gratis por sí solo.
- Validación final al crear el pedido para evitar que un código vencido o desactivado se use después de haberlo aplicado.
- Registro del código y del descuento de envío en el pedido.

## Instalación
1. En Supabase → SQL Editor, ejecutar `APLICAR_PROMOCIONES_20261010.sql`.
2. Copiar el contenido del parche sobre la raíz del proyecto.
3. Ejecutar `npm run build`.
4. Si compila, commit + push.

## Primer código sugerido
En Admin → Códigos:
- Código: `FAMILIA`
- Descripción: `Familia y amigos`
- Beneficio: Envío gratis
- Activo: Sí
- Inicio: vacío o la fecha que querás
- Vencimiento: opcional
- Máximo de usos: opcional

Si dejás vencimiento y máximo de usos vacíos, el código seguirá funcionando hasta que lo desactives manualmente.
