# Control de dinero — Altavera

## Qué cambia
- El módulo anterior **Finanzas** pasa a llamarse **Dinero** en el panel.
- Jornadas por fecha de entrega con guardado de avances y cierre.
- Costos reales por producto usando los pedidos existentes, sin volver a escribir productos.
- Separación entre referencia CENADA y costo real.
- Producto utilizado, sobrante e inventario perdido/dañado.
- El sobrante de producto cerrado se arrastra como inventario con su valor a la siguiente jornada compatible.
- Trabajo por horas con un presupuesto total y reparto entre Raquel/Axel sin duplicar el costo.
- Jeep: kilómetros a CENADA + entregas, gasolina y reserva de mantenimiento.
- Materiales reutilizables: compras, inventario restante y consumo por jornada.
- Reporte mensual, 1–15 y 16–fin.
- Diferencia entre resultado del negocio, obligaciones y disponible calculado.
- Historial/versiones del cierre y aviso si los pedidos cambian después de cerrar.
- Control optimista de versión para evitar que dos administradores sobrescriban el mismo cierre sin enterarse.
- Exportación CSV compatible con Excel.

## Aplicación
Desde la raíz del proyecto:

```bash
unzip -o ~/Downloads/altavera_patch_control_dinero_20261016.zip -d .
```

Luego abre Supabase > SQL Editor, copia todo el contenido de:

`APLICAR_CONTROL_DINERO_20261016.sql`

y ejecútalo una sola vez.

Después valida localmente:

```bash
npm run build
```

Si compila correctamente:

```bash
git status --short
git add .
git commit -m "Agrega control de dinero por jornadas"
git push
```

## Importante
El ZIP no contiene `node_modules` ni carpetas duplicadas del proyecto. Solo reemplaza/añade los archivos necesarios.

El valor **Disponible calculado** usa únicamente movimientos registrados dentro de Altavera. Si existe dinero que entró o salió fuera del sistema (aportes personales, retiros, transferencias no registradas), ese valor no pretende sustituir el saldo bancario real.
