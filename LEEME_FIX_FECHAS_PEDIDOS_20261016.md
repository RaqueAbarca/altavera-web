# Fix de fechas del Panel de pedidos — 2026-10-16

Este ajuste evita que el Panel de pedidos muestre ciclos vacíos que pertenecen a días de entrega que ya no están configurados.

Regla aplicada:
- Se muestran los días de entrega configurados actualmente, aunque el corte ya se haya realizado.
- Se conservan y muestran ciclos antiguos/no configurados si tienen pedidos o una lista de compras asociada.
- Se ocultan ciclos obsoletos vacíos. No se borran de Supabase.

No requiere SQL ni cambios en Supabase.
