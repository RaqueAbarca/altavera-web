# Ajustes catálogo — 11/10/2026

Este parche hace tres cambios en `/productos`:

1. Tarjetas más angostas en desktop (máximo 410 px) y ligeramente menos altas.
2. El carrito lateral sigue siendo `sticky`, pero deja más espacio debajo del header y puede hacer scroll interno si crece mucho.
3. La búsqueda ignora tildes/diacríticos: por ejemplo `brocoli` encuentra `Brócoli`, `rabano` encuentra `Rábano` y `pina` encuentra `Piña`.

No requiere SQL.
