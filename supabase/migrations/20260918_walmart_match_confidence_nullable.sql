-- Una conversión Walmart que deja de estar verificada no tiene por qué conservar confidence.
alter table public.competitor_product_matches
  alter column confidence drop not null;
