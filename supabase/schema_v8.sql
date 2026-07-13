-- ═══════════════════════════════════════════════════════════════════
--  MDM Inks Sales CRM · schema_v8 (privilege hardening)
--  Stops a signed-in rep from changing their own `role` or `active`
--  (self-promotion to admin). Admins + the service key are unaffected.
--  Safe to re-run. Run any time after schema.sql.
-- ═══════════════════════════════════════════════════════════════════

-- Make sure the column exists (also added in schema_v7).
alter table public.profiles add column if not exists active boolean not null default true;

-- Trigger: only admins may change role/active. The gate fires ONLY for
-- app users (auth.role() = 'authenticated'), so:
--   • rep in the app        → blocked from editing role/active   ✋
--   • admin in the app      → allowed (is_admin())                ✓
--   • service_role (Edge fn)→ allowed                             ✓
--   • SQL editor / postgres → allowed (your promote query works)  ✓
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change a user''s role';
    end if;
    if new.active is distinct from old.active then
      raise exception 'Only an admin can change activation status';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_profile_privileges on public.profiles;
create trigger trg_protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();
