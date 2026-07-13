-- ═══════════════════════════════════════════════════════════════════
--  MDM Inks Sales CRM · schema_v4 (map coordinates)
--  Adds lat/lng to clients for the Map view. Run after schema_v3.sql.
-- ═══════════════════════════════════════════════════════════════════

alter table public.clients add column if not exists lat numeric;
alter table public.clients add column if not exists lng numeric;
