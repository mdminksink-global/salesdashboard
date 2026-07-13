-- ═══════════════════════════════════════════════════════════════════
--  MDM Inks Sales CRM · schema_v6 (daily "follow-ups due today" push)
--  Uses pg_cron + pg_net to call the send-push Edge Function on a schedule.
--
--  PREREQUISITES (do these first):
--    • schema_v5.sql applied (push_subscriptions table)          ✓ already done
--    • send-push Edge Function deployed + VAPID secrets set
--    • at least one user has enabled push in Settings
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── STEP 1 — store secrets in Vault ONCE ───────────────────────────
-- Run these TWO lines manually (replace the service_role value; find it in
-- Supabase → Project Settings → API → "service_role" secret). They are commented
-- out so this file stays safe to commit — the key must never live in the repo.
--
--   select vault.create_secret('https://wikoprtzxxrhovtyqjzm.supabase.co', 'project_url');
--   select vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'service_role_key');

-- ── STEP 2 — the notifier: one push per rep with follow-ups due today ──
create or replace function public.notify_due_followups()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  rec  record;
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  if v_url is null or v_key is null then
    raise notice 'Vault secrets project_url / service_role_key are not set — skipping.';
    return;
  end if;

  for rec in
    select owner_id, count(*)::int as due
    from (
      select owner_id from public.visits
        where next_visit_date = current_date and coalesce(order_received, false) = false
      union all
      select owner_id from public.tasks
        where due_date = current_date and coalesce(done, false) = false
    ) t
    group by owner_id
  loop
    perform net.http_post(
      url     := v_url || '/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body    := jsonb_build_object(
        'title',   'Follow-ups due today',
        'body',    rec.due || ' item' || case when rec.due > 1 then 's' else '' end || ' need attention today',
        'url',     '/',
        'ownerId', rec.owner_id
      )
    );
  end loop;
end $$;

-- ── STEP 3 — schedule daily at 02:30 UTC (08:00 IST). Re-run-safe. ──
select cron.unschedule('daily-followup-push')
where exists (select 1 from cron.job where jobname = 'daily-followup-push');

select cron.schedule('daily-followup-push', '30 2 * * *', $cron$ select public.notify_due_followups(); $cron$);

-- ── Test immediately (fires now for anyone with follow-ups due today): ──
--   select public.notify_due_followups();
-- ── Inspect / remove: ──
--   select jobname, schedule, active from cron.job;
--   select cron.unschedule('daily-followup-push');
