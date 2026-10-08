# Altavera — cobertura + limpieza de carpetas de parches

Este parche combina la corrección del mapa/cobertura con la limpieza de dos carpetas antiguas que quedaron dentro de la raíz del proyecto:

- `altavera_patch_walmart_admin_rls_20260918/`
- `patch-checkout-aviso-ubicacion/`

Esas carpetas contienen copias antiguas de archivos bajo otro `src/`. El `tsconfig.json` de Altavera incluye `**/*.ts` y `**/*.tsx`, por lo que TypeScript también puede intentar revisar esos archivos viejos durante el build. No deben vivir dentro del proyecto final.

Cambios funcionales incluidos:

- Todas las zonas de cobertura activas guardadas en Admin se publican al cliente; ya no se limita por nombre a Alajuela.
- `/api/delivery/zones` se fuerza como dinámico y sin caché.
- Checkout y mapa público recargan cobertura al recuperar foco.
- El mapa encuadra las zonas activas automáticamente.
- El aspecto de polígonos/controles públicos se alinea con el mapa de Admin.
- `.gitignore` y `tsconfig.json` quedan protegidos contra carpetas de parches temporales futuras.

No se elimina ningún SQL, documento, migración, código activo, `public/`, `scripts/` ni `supabase/`.

## Aplicación

Desde la raíz del proyecto, después de descomprimir el ZIP:

```bash
bash APLICAR_PATCH_COBERTURA_LIMPIEZA.sh
npm run build
```

Si el build pasa, revisar `git status` antes de hacer commit.
