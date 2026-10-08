#!/bin/bash
set -e

if [ ! -f "package.json" ] || [ ! -d "src" ]; then
  echo "ERROR: Ejecuta este script desde la raiz de altavera_web."
  exit 1
fi

echo "Limpiando carpetas viejas de parches..."
rm -rf \
  altavera_patch_walmart_admin_rls_20260918 \
  patch-checkout-aviso-ubicacion

# Basura de macOS que no forma parte del proyecto.
find . -name '.DS_Store' -type f -delete 2>/dev/null || true

echo "Listo. Se conservaron src, public, scripts, supabase y los documentos/SQL del proyecto."
echo "Ahora ejecuta: npm run build"
