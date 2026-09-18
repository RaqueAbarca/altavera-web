# Fix de completitud Walmart regional — 18/09/2026

Este parche corrige la validación que comparaba el catálogo regional de Walmart Alajuela contra el catálogo genérico histórico de Altavera.

## Qué cambia

- Usa `recordsFiltered` reportado por VTEX para comprobar que se descargó el total de la búsqueda regional.
- Usa como referencia futura la última corrida exitosa de la misma `regionId`, no el total histórico de `competitor_products`.
- En la primera corrida regional solo exige el mínimo de seguridad configurado (50 por defecto) y que la descarga coincida con el total reportado por Walmart.
- Desactiva explícitamente productos patrocinados en la consulta (`showSponsored=false`).
- El Admin muestra cuántos productos dijo Walmart que existían para esa búsqueda y cuántas páginas se descargaron.

No requiere SQL adicional.
