# Código promocional visible en celular

Este parche mueve el campo de código promocional fuera del resumen plegable en la vista móvil.

- En escritorio: permanece dentro del resumen lateral.
- En celular/tablet: aparece siempre visible debajo de "Ver resumen", aunque el resumen esté cerrado.
- Si el código se aplica, el total del resumen se actualiza como antes.
- No requiere SQL.

Aplicar desde la raíz del proyecto:

```bash
unzip -o ~/Downloads/altavera_patch_codigo_visible_movil_20261011.zip -d .
npm run build
```
