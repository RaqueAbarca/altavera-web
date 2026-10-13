# Altavera — variantes por tamaño con precio automático

Esta versión reemplaza el parche anterior de variantes por tamaño.

## Qué cambia
- Sandía, melón y productos similares pueden venderse por tamaño.
- Cada tamaño guarda:
  - nombre (Pequeña / Mediana / Grande)
  - peso mínimo aproximado
  - peso máximo aproximado
  - peso de referencia para precio
  - activo/inactivo
- El precio ya NO se escribe manualmente.
- Se calcula desde el precio vigente del producto por kg:

  precio de variante = precio vigente por kg × peso de referencia

- El resultado se redondea al múltiplo de CRC 50 más cercano.
- Cuando Admin → Precios publica un nuevo precio por kg, las variantes cambian automáticamente porque no guardan un precio independiente.
- El servidor vuelve a calcular el precio al crear el pedido; no confía en el precio enviado por el navegador.

## Ejemplo
Si Sandía vale CRC 800/kg y la variante Mediana tiene:
- rango 3–5 kg
- peso de referencia 4 kg

la tienda muestra CRC 3.200 / unidad.

## Pedidos anteriores
No se modifica ningún pedido existente. Un pedido viejo de "Sandía · 1 kg" conserva nombre, cantidad y precio históricos.

## Base de datos
Ejecutar `APLICAR_VARIANTES_TAMANOS_AUTO_20261013.sql` una vez.
Es idempotente y también puede ejecutarse si ya se aplicó el SQL del parche anterior.

## Instalación
Desde la raíz del proyecto:

```bash
unzip -o ~/Downloads/altavera_patch_variantes_precio_auto_20261013.zip -d .
npm run build
```

Si compila:

```bash
git add .
git commit -m "Calcular automaticamente precios por tamano"
git push
```
