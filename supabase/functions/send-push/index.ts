// Supabase Edge Function: send-push
// Sends a Web Push notification to stored subscriptions.
//
// Deploy:
//   supabase functions deploy send-push
// Set secrets (PRIVATE key stays here, never in the repo):
//   supabase secrets set VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...  VAPID_SUBJECT="mailto:you@example.com"
//
// Invoke (e.g. from pg_cron, another function, or manually):
//   POST /functions/v1/send-push   body: { "title": "...", "body": "...", "url": "/tasks", "ownerId": "<uuid optional>" }
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { title = 'MDM Inks Sales', body = '', url = '/', ownerId } = await req.json().catch(() => ({}));

  let query = supabase.from('push_subscriptions').select('*');
  if (ownerId) query = query.eq('owner_id', ownerId);
  const { data: subs, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const payload = JSON.stringify({ title, body, url });
  let sent = 0, removed = 0;

  await Promise.all((subs || []).map(async (s) => {
    const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (err) {
      // 404/410 → subscription is dead; clean it up.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        removed++;
      }
    }
  }));

  return new Response(JSON.stringify({ sent, removed, total: subs?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
