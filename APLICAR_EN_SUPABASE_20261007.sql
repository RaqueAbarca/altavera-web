-- Historial de fuentes usado por cada recomendación de precios.
-- Permite mostrar tendencia por corrida y distinguir un precio Walmart
-- observado en la corrida actual de un precio reciente reutilizado.

alter table public.price_recommendations
  add column if not exists cenada_source_date date,
  add column if not exists cenada_bulletin_number text,
  add column if not exists competitor_source_date date,
  add column if not exists competitor_update_run_id uuid references public.competitor_update_runs(id) on delete set null,
  add column if not exists competitor_observed_at timestamptz,
  add column if not exists competitor_is_fallback boolean not null default false;

comment on column public.price_recommendations.cenada_source_date is
  'Fecha del precio CENADA utilizado por esta recomendación.';
comment on column public.price_recommendations.cenada_bulletin_number is
  'Tipo de boletín CENADA utilizado por esta recomendación.';
comment on column public.price_recommendations.competitor_update_run_id is
  'Corrida Walmart de la que proviene el precio competitivo utilizado.';
comment on column public.price_recommendations.competitor_is_fallback is
  'True cuando Walmart no observó la referencia en la corrida actual y se reutilizó una observación válida reciente.';
