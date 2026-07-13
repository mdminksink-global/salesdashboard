-- ═══════════════════════════════════════════════════════════════════
--  MDM Inks Sales CRM · schema_v5 (Web Push)
--  Stores browser push subscriptions. Run after schema_v4.sql.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_owner_idx on public.push_subscriptions (owner_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select" on public.push_subscriptions;
create policy "push_select" on public.push_subscriptions for select using (owner_id = auth.uid() or public.is_admin());
drop policy if exists "push_insert" on public.push_subscriptions;
create policy "push_insert" on public.push_subscriptions for insert with check (owner_id = auth.uid());
drop policy if exists "push_delete" on public.push_subscriptions;
create policy "push_delete" on public.push_subscriptions for delete using (owner_id = auth.uid() or public.is_admin());
