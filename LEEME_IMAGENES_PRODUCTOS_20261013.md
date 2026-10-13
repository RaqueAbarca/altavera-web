# Altavera — imágenes de productos desde Admin

Este parche reemplaza el campo manual de URL por un selector de imagen en **Admin → Productos**.

## Qué hace

- Permite seleccionar/cambiar una imagen al editar un producto.
- Permite seleccionar una imagen al crear un producto.
- Muestra vista previa antes de guardar.
- Acepta JPG, PNG y WebP, máximo 5 MB.
- Valida también la firma real del archivo en el servidor.
- La subida pasa por una ruta protegida con `requireAdmin()` y usa `supabaseAdmin`; la service role nunca llega al navegador.
- Guarda archivos nuevos como `products/{productId}/{timestamp}-{uuid}.ext` para evitar problemas de caché.
- Actualiza `products.image_url` automáticamente.
- Al reemplazar/quitar una imagen de Supabase, elimina el archivo anterior solo si ningún otro producto sigue usando esa misma URL.
- Si un producto usa una ruta local como `/logo.svg`, no intenta borrarla de Storage.

## Bucket de Supabase

Normalmente no hay que configurar nada: el servidor intenta detectar automáticamente el bucket a partir de las URLs de imágenes que ya existen en `products.image_url`.

Si no logra identificarlo, configura en `.env.local` y también en Vercel:

```env
SUPABASE_PRODUCT_IMAGES_BUCKET=nombre-exacto-del-bucket
```

No uses `NEXT_PUBLIC_` para esta variable.

## Archivos

- `src/app/admin/productos/page.tsx`
- `src/app/admin/productos/productos-admin.css`
- `src/app/api/admin/products/[id]/image/route.ts`
- `src/lib/productImageStorage.ts`

## Aplicar

```bash
cd ~/Documents/APPS/altavera_web
unzip -o ~/Downloads/altavera_patch_imagenes_productos_20261013.zip -d .
npm run build
```

No requiere SQL.

## Prueba recomendada

1. Admin → Productos → editar un producto.
2. Pulsa **Cambiar imagen** y selecciona una foto.
3. Comprueba la vista previa y guarda.
4. Verifica que la nueva imagen aparezca en catálogo.
5. Crea un producto nuevo y prueba **Seleccionar imagen**.
