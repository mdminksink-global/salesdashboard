-- ═══════════════════════════════════════════════════════════════════
--  MDM Inks Sales CRM · schema_v2 (product expansion)
--  Adds: products, deals (pipeline), tasks, targets  + realtime.
--  Run AFTER schema.sql. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

-- ── PRODUCT CATALOG ────────────────────────────────────────────────
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  sku         text,
  category    text,
  price       numeric,
  unit        text default 'unit',
  description text,
  active      boolean default true,
  created_at  timestamptz not null default now()
);

-- ── DEALS / ORDER PIPELINE ─────────────────────────────────────────
-- stage: Lead / Quoted / Negotiation / Won / Lost
create table if not exists public.deals (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users (id) on delete cascade,
  title          text not null,
  client_name    text,
  company        text,
  value          numeric default 0,
  stage          text not null default 'Lead',
  expected_close date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── TASKS / REMINDERS ──────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  client_name text,
  due_date    date,
  priority    text default 'Medium',   -- Low / Medium / High
  done        boolean default false,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── MONTHLY TARGETS / GOALS ────────────────────────────────────────
-- period is 'YYYY-MM'. One row per rep per month.
create table if not exists public.targets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  period       text not null,
  visit_goal   integer default 0,
  revenue_goal numeric default 0,
  created_at   timestamptz not null default now(),
  unique (owner_id, period)
);

create index if not exists deals_owner_idx on public.deals (owner_id, stage);
create index if not exists tasks_owner_idx on public.tasks (owner_id, done, due_date);
create index if not exists products_owner_idx on public.products (owner_id);

-- ── RLS: same ownership model (rep = own, admin = all) ─────────────
alter table public.products enable row level security;
alter table public.deals    enable row level security;
alter table public.tasks    enable row level security;
alter table public.targets  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['products','deals','tasks','targets'] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format('create policy "%1$s_select" on public.%1$s for select using (owner_id = auth.uid() or public.is_admin())', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$s', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert with check (owner_id = auth.uid())', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$s', t);
    execute format('create policy "%1$s_update" on public.%1$s for update using (owner_id = auth.uid() or public.is_admin())', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$s', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete using (owner_id = auth.uid() or public.is_admin())', t);
  end loop;
end $$;

-- ── REALTIME: make sure every app table streams changes ────────────
do $$
declare t text;
begin
  foreach t in array array['visits','clients','products','deals','tasks','targets'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%s', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
