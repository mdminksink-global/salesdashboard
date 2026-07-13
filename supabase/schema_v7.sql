-- ═══════════════════════════════════════════════════════════════════
--  MDM Inks Sales CRM · schema_v7 (Admin console)
--  Adds profile activation + lets admins set targets for any rep.
--  Run after schema_v6.sql.
-- ═══════════════════════════════════════════════════════════════════

-- Enable/disable a salesperson without deleting their data.
alter table public.profiles add column if not exists active boolean not null default true;

-- Admins must be able to set targets for OTHER reps (not just themselves).
drop policy if exists "targets_insert" on public.targets;
create policy "targets_insert" on public.targets
  for insert with check (owner_id = auth.uid() or public.is_admin());

-- (update policy already allows admins; re-assert to be safe)
drop policy if exists "targets_update" on public.targets;
create policy "targets_update" on public.targets
  for update using (owner_id = auth.uid() or public.is_admin());

-- Admins may deactivate/rename any profile; reps only their own (re-assert).
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
