create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_user_id_idx
  on public.admin_push_subscriptions(user_id);

alter table public.admin_push_subscriptions enable row level security;

comment on table public.admin_push_subscriptions is
  'Dispositivos administradores autorizados para recibir Web Push de nuevos pedidos. Se gestiona únicamente desde rutas server-side con service role.';
