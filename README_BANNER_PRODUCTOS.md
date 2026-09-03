# Banner de cuenta movido a Productos

Este overlay:
- elimina `LoginPromo` del Home;
- lo agrega en `/productos`, debajo del encabezado y antes del buscador;
- conserva la lógica de ocultarlo cuando el usuario ya inició sesión;
- agrega CSS propio al componente para que no dependa de `home.css`.

No requiere SQL.
