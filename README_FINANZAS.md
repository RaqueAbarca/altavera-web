# Patch Finanzas - Altavera

Agrega `/admin/finanzas` y una tarjeta **Finanzas** al panel administrativo.

## Incluye
- Ventas confirmadas por 7, 30, 90 días o todo el historial.
- Pedidos pagados y ticket promedio.
- Ingreso por envíos.
- Margen bruto estimado ponderado por ventas.
- Utilidad bruta estimada.
- Cobertura de costos de las ventas.
- Margen promedio y mediana del catálogo actual.
- Productos con margen bajo.
- Margen por categoría.
- Resultado estimado por ciclo de entrega.
- Reglas de margen configuradas.

## Importante
El margen histórico se marca como **estimado** porque actualmente usa el costo efectivo del último ciclo de precios disponible. Para obtener rentabilidad histórica exacta, posteriormente conviene congelar el costo del producto al momento del pedido o registrar el costo real de compra de cada corte.

## Instalación
Descomprimir encima de la raíz de `altavera_web` y luego ejecutar:

```bash
rm -rf .next
npm run build
```

No requiere SQL nuevo.
