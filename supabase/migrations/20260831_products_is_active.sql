ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS products_is_active_idx
ON public.products (is_active);
