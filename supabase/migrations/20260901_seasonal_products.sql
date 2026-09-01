ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_seasonal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_is_seasonal_idx
ON public.products (is_seasonal)
WHERE is_seasonal = true;

COMMENT ON COLUMN public.products.is_seasonal IS
  'Marca productos que se muestran en la colección visual Productos de temporada.';

-- Pitahaya ya existe en el catálogo actual.
UPDATE public.products
SET is_seasonal = true
WHERE id = 214;
