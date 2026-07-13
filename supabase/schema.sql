-- ═══════════════════════════════════════════════════════════════════
--  MDM Inks Sales CRM · Supabase schema
--  Run this in Supabase → SQL Editor → New query → Run.
--  Safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'rep');
exception when duplicate_object then null; end $$;

-- ── profiles: one row per auth user (the salesperson / admin) ──────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  role        user_role not null default 'rep',
  created_at  timestamptz not null default now()
);

-- ── clients ────────────────────────────────────────────────────────
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  company     text,
  phone       text,
  email       text,
  city        text,
  category    text,               -- Hot Lead / Warm Lead / Cold Lead / Active Client / Inactive / Blacklisted
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── visits ─────────────────────────────────────────────────────────
create table if not exists public.visits (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  visit_date       date not null default current_date,
  client_name      text not null,
  company          text,
  phone            text,
  email            text,
  address          text,
  visit_status     text,          -- Visited / Meeting Scheduled / No Response / Order Placed / Follow-Up Required / Not Interested
  requirement      text,
  next_visit_date  date,
  next_visit_time  text,
  follow_up_done   boolean default false,
  order_received   boolean default false,
  order_value      numeric,
  fulfill_date     date,
  invoice_no       text,
  doc_attached     boolean default false,
  remarks          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists visits_owner_date_idx on public.visits (owner_id, visit_date desc);
create index if not exists clients_owner_idx on public.clients (owner_id);

-- ── Auto-create a profile whenever a new auth user signs up ────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'rep'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper: is the current user an admin? (SECURITY DEFINER avoids RLS recursion) ──
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ── Row Level Security ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.clients  enable row level security;
alter table public.visits   enable row level security;

-- profiles: everyone reads own row; admins read all; users update own row
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (id = auth.uid());

-- clients: rep owns own rows; admin sees/edits everything
drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert with check (owner_id = auth.uid());

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete using (owner_id = auth.uid() or public.is_admin());

-- visits: same ownership model
drop policy if exists "visits_select" on public.visits;
create policy "visits_select" on public.visits
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "visits_insert" on public.visits;
create policy "visits_insert" on public.visits
  for insert with check (owner_id = auth.uid());

drop policy if exists "visits_update" on public.visits;
create policy "visits_update" on public.visits
  for update using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "visits_delete" on public.visits;
create policy "visits_delete" on public.visits
  for delete using (owner_id = auth.uid() or public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
--  AFTER you sign up your first user, promote them to admin:
--    update public.profiles set role = 'admin' where email = 'you@example.com';
-- ═══════════════════════════════════════════════════════════════════
