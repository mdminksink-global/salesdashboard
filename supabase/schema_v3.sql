-- ═══════════════════════════════════════════════════════════════════
--  MDM Inks Sales CRM · schema_v3 (Quotations)
--  Run AFTER schema.sql + schema_v2.sql. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.quotes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  quote_number  text not null,
  client_name   text,
  company       text,
  phone         text,
  email         text,
  quote_date    date not null default current_date,
  valid_until   date,
  items         jsonb not null default '[]'::jsonb,   -- [{ name, qty, price }]
  tax_percent   numeric default 0,
  discount      numeric default 0,                    -- flat amount
  subtotal      numeric default 0,
  total         numeric default 0,
  notes         text,
  terms         text,
  status        text not null default 'Draft',        -- Draft / Sent / Accepted / Rejected
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists quotes_owner_idx on public.quotes (owner_id, created_at desc);

alter table public.quotes enable row level security;

drop policy if exists "quotes_select" on public.quotes;
create policy "quotes_select" on public.quotes for select using (owner_id = auth.uid() or public.is_admin());
drop policy if exists "quotes_insert" on public.quotes;
create policy "quotes_insert" on public.quotes for insert with check (owner_id = auth.uid());
drop policy if exists "quotes_update" on public.quotes;
create policy "quotes_update" on public.quotes for update using (owner_id = auth.uid() or public.is_admin());
drop policy if exists "quotes_delete" on public.quotes;
create policy "quotes_delete" on public.quotes for delete using (owner_id = auth.uid() or public.is_admin());

do $$
begin
  begin
    alter publication supabase_realtime add table public.quotes;
  exception when duplicate_object then null;
  end;
end $$;
