-- Configuración operativa pública de Altavera.
-- Los valores de esta tabla NO son secretos. Se leen desde el servidor y se
-- exponen al cliente únicamente por /api/app-settings.
--
-- La configuración de delivery_pricing usa JSONB para que en el futuro podamos
-- agregar cálculo por distancia sin depender de variables de Vercel ni tener que
-- rediseñar la tabla.

create table if not exists public.app_settings (
  id text primary key,
  delivery_pricing jsonb not null default '{"mode":"flat","flat_fee_crc":null}'::jsonb,
  payment_settings jsonb not null default '{}'::jsonb,
  contact_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  constraint app_settings_singleton check (id = 'main')
);

alter table public.app_settings enable row level security;

-- La web pública y los clientes autenticados no leen/escriben esta tabla de
-- forma directa. Las lecturas públicas pasan por una API segura y las escrituras
-- requieren sesión de administrador.
revoke all on table public.app_settings from anon, authenticated;

insert into public.app_settings (
  id,
  delivery_pricing,
  payment_settings,
  contact_settings
)
values (
  'main',
  '{"mode":"flat","flat_fee_crc":null}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;
