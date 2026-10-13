# Altavera — presentaciones de producto

Este parche generaliza “Vender por tamaño” a “Vender por presentación”.

No requiere SQL nuevo: reutiliza `variant_selection_enabled` y `size_variants` para mantener compatibilidad con las variantes ya creadas.

## Formas de cálculo
- Por peso: kg de referencia × precio base. Ideal para Sandía/Melón.
- Por fracción: precio base ÷ cantidad. Ejemplo: una mata de apio dividida entre 13 ramas.
- Por factor: precio base × factor. Ejemplo: una presentación menor o mayor que la unidad base.

## Compatibilidad
- Las variantes antiguas de Sandía/Melón se interpretan automáticamente como “Por peso”.
- Los pedidos ya creados no se modifican.
- Si todas las presentaciones son por peso, el cliente sigue viendo “Tamaño”.
- Si hay fracciones/factores, el cliente ve “Presentación”.
- Una sola presentación sigue sin mostrar un selector innecesario.

## Ejemplo Apio
Base: precio de una mata.
- Rama: cálculo “Por fracción”, dividir entre 13, unidad mostrada “rama”.
- Mata pequeña: cálculo “Por factor”, factor definido según la relación real con la mata base, unidad “mata”.
- Mata grande: igual, con su factor real.

## Instalación
Desde la raíz del proyecto:

```bash
unzip -o ~/Downloads/altavera_patch_presentaciones_productos_20261013.zip -d .
npm run build
```

Si compila:

```bash
git add .
git commit -m "Generalizar variantes a presentaciones de producto"
git push
```
