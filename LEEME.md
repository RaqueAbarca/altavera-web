# WhatsApp sin iconos problemáticos

Este parche elimina los emojis de las plantillas de WhatsApp para evitar que algunos dispositivos/navegadores los muestren como iconos inválidos.

No requiere SQL.

Aplicar desde la raíz del proyecto:

```bash
unzip -o ~/Downloads/altavera_patch_whatsapp_sin_iconos_20261011.zip -d .
npm run build
```

Si el build pasa:

```bash
git add .
git commit -m "Corregir iconos en mensajes de WhatsApp"
git push
```
