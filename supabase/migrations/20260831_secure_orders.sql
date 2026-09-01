-- ============================================================
-- ALTAVERA - SEGURIDAD DE PEDIDOS Y CATÁLOGO
-- Ejecutar una sola vez en Supabase SQL Editor o como migración.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. ESTRUCTURA DE PEDIDOS
-- ------------------------------------------------------------

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_access_token uuid;

UPDATE public.orders
SET order_access_token = gen_random_uuid()
WHERE order_access_token IS NULL;

ALTER TABLE public.orders
ALTER COLUMN order_access_token
SET DEFAULT gen_random_uuid();

ALTER TABLE public.orders
ALTER COLUMN order_access_token
SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
orders_order_access_token_uidx
ON public.orders(order_access_token);

-- Un pedido invitado debe quedar realmente sin usuario.
ALTER TABLE public.orders
ALTER COLUMN customer_id DROP DEFAULT;

-- El default anterior era una fecha fija.
ALTER TABLE public.orders
ALTER COLUMN created_at SET DEFAULT now();

-- order_id siempre debe venir del pedido que acabamos de crear.
ALTER TABLE public.order_item
ALTER COLUMN order_id DROP DEFAULT;

CREATE INDEX IF NOT EXISTS
orders_customer_id_idx
ON public.orders(customer_id);

CREATE INDEX IF NOT EXISTS
orders_user_id_idx
ON public.orders(user_id);

CREATE INDEX IF NOT EXISTS
order_item_order_id_idx
ON public.order_item(order_id);

-- ------------------------------------------------------------
-- 2. PRODUCTS
-- Público: solo productos activos.
-- Admin: puede leer también borradores.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
  "Allow public read"
ON public.products;

DROP POLICY IF EXISTS
  "Public can read active products"
ON public.products;

DROP POLICY IF EXISTS
  "Admins can read all products"
ON public.products;

CREATE POLICY
  "Public can read active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY
  "Admins can read all products"
ON public.products
FOR SELECT
TO authenticated
USING (public.is_admin());

REVOKE ALL ON TABLE public.products
FROM anon, authenticated;

GRANT SELECT ON TABLE public.products
TO anon, authenticated;

-- ------------------------------------------------------------
-- 3. ORDERS
-- Se elimina el acceso directo de invitados.
-- Los pedidos se crean desde /api/orders/create con service role.
-- Usuarios autenticados solo leen sus pedidos.
-- Solo admins pueden leer todos y modificar estados.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
  "No deletes"
ON public.orders;

DROP POLICY IF EXISTS
  "Anyone can create orders"
ON public.orders;

DROP POLICY IF EXISTS
  "anon can insert orders"
ON public.orders;

DROP POLICY IF EXISTS
  "Allow admins to read all orders"
ON public.orders;

DROP POLICY IF EXISTS
  "Allow guest to read their own orders"
ON public.orders;

DROP POLICY IF EXISTS
  "Users can view their own orders"
ON public.orders;

DROP POLICY IF EXISTS
  "Allow admin update orders"
ON public.orders;

DROP POLICY IF EXISTS
  "No client updates"
ON public.orders;

DROP POLICY IF EXISTS
  "Users can read own orders"
ON public.orders;

DROP POLICY IF EXISTS
  "Admins can read all orders"
ON public.orders;

DROP POLICY IF EXISTS
  "Admins can update orders"
ON public.orders;

CREATE POLICY
  "Users can read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = customer_id
  OR
  (SELECT auth.uid()) = user_id
);

CREATE POLICY
  "Admins can read all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY
  "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

REVOKE ALL ON TABLE public.orders
FROM anon, authenticated;

GRANT SELECT, UPDATE ON TABLE public.orders
TO authenticated;

-- ------------------------------------------------------------
-- 4. ORDER ITEM
-- Invitados nunca consultan esta tabla directamente.
-- Usuarios autenticados solo ven items de sus pedidos.
-- Admin puede ver todos.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
  "Allow guest create order items"
ON public.order_item;

DROP POLICY IF EXISTS
  "Anyone can create order items"
ON public.order_item;

DROP POLICY IF EXISTS
  "anon can insert order items"
ON public.order_item;

DROP POLICY IF EXISTS
  "Allow admins to read all items"
ON public.order_item;

DROP POLICY IF EXISTS
  "Allow read order items"
ON public.order_item;

DROP POLICY IF EXISTS
  "Users can view their own order items"
ON public.order_item;

DROP POLICY IF EXISTS
  "Users can read own order items"
ON public.order_item;

DROP POLICY IF EXISTS
  "Admins can read all order items"
ON public.order_item;

CREATE POLICY
  "Users can read own order items"
ON public.order_item
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_item.order_id
      AND (
        o.customer_id = (SELECT auth.uid())
        OR
        o.user_id = (SELECT auth.uid())
      )
  )
);

CREATE POLICY
  "Admins can read all order items"
ON public.order_item
FOR SELECT
TO authenticated
USING (public.is_admin());

REVOKE ALL ON TABLE public.order_item
FROM anon, authenticated;

GRANT SELECT ON TABLE public.order_item
TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
