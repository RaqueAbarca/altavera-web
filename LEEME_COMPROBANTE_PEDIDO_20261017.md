# Comprobante imprimible de pedido · Altavera

Este parche agrega un comprobante imprimible por pedido desde el Panel de pedidos.

## Decisión de UX
El botón **Imprimir comprobante** es independiente del cambio de estado. Imprimir no modifica el pedido y se puede repetir cuantas veces sea necesario.

Aparece en pedidos con pago confirmado o estados posteriores: Confirmado, Preparando, En camino y Entregado. No aparece en pedidos pendientes de pago ni cancelados.

## Contenido del comprobante
- Logo Altavera.
- Número de pedido.
- Cliente y fecha de entrega.
- Método de pago y dirección.
- Productos, cantidades, precio y subtotal.
- Envío y total pagado.
- Si hay productos marcados como no conseguidos en Dinero, los muestra como **No entregado** y enseña el reembolso correspondiente.
- Total final después de reembolsos cuando aplique.
- Agradecimiento.
- QR para dejar reseña en Google usando la misma URL oficial ya configurada en Altavera.
- Nota de que el comprobante no sustituye factura electrónica.

El formato de impresión está preparado para A5 vertical, útil como media hoja A4.

## Supabase
No requiere SQL ni tablas nuevas.

## Aplicación
```bash
cd ~/Documents/APPS/altavera_web
unzip -o ~/Downloads/altavera_patch_comprobante_pedido_20261017.zip -d .
npm run build
```

Si el build termina bien:
```bash
git add .
git commit -m "Agrega comprobante imprimible de pedidos"
git push origin main
```
