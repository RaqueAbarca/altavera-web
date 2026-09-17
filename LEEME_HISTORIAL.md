# Historial de pedidos — 17/09/2026

Agrega una vista administrativa separada en `/admin/historial-pedidos`.

Incluye:
- Todos los pedidos, sin limitarse a los ciclos visibles en el panel operativo.
- Búsqueda por nombre y correo.
- Búsqueda por teléfono completo.
- Búsqueda por ID completo del pedido.
- Filtros por estado y rango de fechas.
- Paginación de 25 pedidos.
- Indicador de cuenta vinculada/desvinculada.
- Acceso desde el dashboard admin.

No requiere cambios de base de datos ni SQL adicional.

Después de aplicar:

```bash
npm run build
npm run dev
```

Abrir:

`http://localhost:3000/admin/historial-pedidos`
