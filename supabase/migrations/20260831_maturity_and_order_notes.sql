-- ============================================================
-- ALTAVERA
-- Preferencia de maduración por producto + notas por pedido
-- ============================================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS maturity_selection_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.order_item
ADD COLUMN IF NOT EXISTS maturity_preference text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_notes text;

ALTER TABLE public.order_item
DROP CONSTRAINT IF EXISTS order_item_maturity_preference_check;

ALTER TABLE public.order_item
ADD CONSTRAINT order_item_maturity_preference_check
CHECK (
  maturity_preference IS NULL
  OR maturity_preference IN (
    'green',
    'turning',
    'ripe',
    'mixed'
  )
);

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_customer_notes_length_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_customer_notes_length_check
CHECK (
  customer_notes IS NULL
  OR char_length(customer_notes) <= 1000
);

COMMENT ON COLUMN public.products.maturity_selection_enabled IS
  'Permite al cliente indicar una preferencia de maduración para este producto.';

COMMENT ON COLUMN public.order_item.maturity_preference IS
  'Preferencia elegida por el cliente: green, turning, ripe, mixed o null.';

COMMENT ON COLUMN public.orders.customer_notes IS
  'Notas generales opcionales del cliente para el pedido.';
