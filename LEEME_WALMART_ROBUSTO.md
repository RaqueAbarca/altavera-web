# Walmart robusto para Altavera — 18/09/2026

Este parche reemplaza los parches Walmart anteriores del 18/09/2026. Si todavía no los aplicó, use únicamente este.

## Objetivo

La actualización de Walmart queda diseñada para fallar de forma segura: si no podemos demostrar que el dato es reciente, regionalizado y comparable, ese precio no entra al cálculo de Altavera.

No usa IA.

## Qué hace

1. Consulta Walmart usando la API Intelligent Search v1 de VTEX y contexto explícito de región.
2. Usa como referencia geográfica Walmart Alajuela, Río Segundo / Las Cañas.
3. Primero resuelve con Walmart la región comercial y los sellers que atienden esa ubicación.
4. Guarda el precio actual (incluyendo promoción si aplica) y el precio regular/lista por separado.
5. Cada actualización obtiene un ID propio y queda auditada con fecha, región y cantidades.
6. Si Walmart devuelve 0 productos, un error, o una cantidad anormalmente pequeña, la actualización falla.
7. Si un precio cambia más de 40% respecto al último precio válido, se bloquea hasta revisión manual.
8. Si cambia la presentación/unidad de Walmart, se invalida la conversión y el precio no se usa hasta volver a verificarla.
9. Las recomendaciones solo pueden usar precios de la última actualización Walmart exitosa. Nunca reutilizan silenciosamente un precio de una corrida anterior.
10. Si la última actualización Walmart falló, el motor de precios también se bloquea aunque exista una actualización anterior reciente.
11. Por defecto una actualización se considera suficientemente fresca durante 24 horas, aunque el flujo normal vuelve a actualizar Walmart cada vez que se procesan boletines CENADA.

## Precio actual vs. precio regular

- `current_price`: lo que el cliente pagaría en Walmart en esa observación. Si existe una oferta, este es el precio con oferta.
- `regular_price`: precio normal/lista informado por Walmart.
- `discount_percent`: diferencia porcentual entre ambos.

Altavera sigue comparando competitivamente contra el precio actual, porque es el precio que el cliente ve al comprar. El precio regular queda guardado para estudiar promociones e historial.

## 1. Aplicar primero el SQL en Supabase

Desde la raíz del proyecto puede copiarlo con:

```bash
pbcopy < APLICAR_EN_SUPABASE_WALMART_20260918.sql
```

Luego:

Supabase → SQL Editor → pegar → Run

El SQL agrega columnas y tablas de auditoría. No elimina los productos ni los precios Walmart existentes.

## 2. Aplicar el código

Descomprima este ZIP desde la raíz del proyecto.

Luego ejecute:

```bash
npm run build
```

Si el build termina correctamente, haga el push/deploy normal.

## 3. Primera prueba: solamente Walmart

No procese PDFs de CENADA todavía.

En producción vaya a:

Admin → Precios → Walmart → Actualizar Walmart

Una actualización correcta debe mostrar una cantidad mayor que 0 y, normalmente, una cifra parecida al catálogo que ya conoce Altavera. También mostrará:

- referencia geográfica;
- datos válidos;
- cambios de precio sospechosos;
- cambios de presentación;
- productos sin precio;
- conversiones automáticas/pedientes;
- referencias bloqueadas por seguridad.

Si devuelve un error, no genere precios todavía. El error es intencional: significa que el sistema prefirió detenerse antes que utilizar una fuente dudosa.

## 4. Verificación en Supabase

Ejecute:

`VERIFICAR_WALMART_20260918.sql`

La primera consulta muestra la última corrida Walmart. Debe quedar en `success`.

Las siguientes consultas permiten revisar una muestra de observaciones, precio actual/regular, región, seller y precios normalizados que realmente pueden entrar al motor.

## Estados de seguridad

- `valid`: se puede usar.
- `suspicious_price`: el precio cambió demasiado; no se usa hasta aprobarlo manualmente.
- `presentation_changed`: Walmart cambió unidad/presentación; no se usa hasta verificar la conversión.
- `no_price`: no existe un precio de venta utilizable; no se usa.

## Límites configurables

No hace falta agregar variables nuevas a Vercel porque existen valores por defecto. Solo se agregan si se quiere cambiar el comportamiento:

```text
WALMART_MAX_PRICE_CHANGE_PERCENT=40
WALMART_MAX_FRESHNESS_HOURS=24
WALMART_MIN_PRODUCTS=50
WALMART_MIN_CATALOG_RATIO=0.5
```

`WALMART_MIN_CATALOG_RATIO=0.5` significa que si Walmart devuelve menos de la mitad del catálogo que Altavera ya conoce, se considera una respuesta probablemente incompleta y se detiene.

## Nota importante sobre “tienda”

La referencia son las coordenadas del Walmart Alajuela de Río Segundo/Las Cañas. Altavera no inventa un ID interno de tienda: consulta a Walmart/VTEX para resolver la región y sellers correspondientes a esa ubicación y guarda lo que Walmart respondió. Esto permite auditar qué contexto regional produjo cada precio.

## Nota sobre actualidad del dato

Altavera registra cuándo hizo la consulta y obliga a usar esa misma corrida. La API pública de Walmart/VTEX puede aplicar caché propia (una respuesta guardada temporalmente por su infraestructura), por lo que ningún integrador externo puede prometer que el dato cambió en el mismo segundo que una etiqueta interna de Walmart. Lo que sí garantiza este código es que Altavera no presenta un dato viejo de su propia base como si se hubiera obtenido en una corrida nueva.
