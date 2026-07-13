// Supabase Edge Function: admin-users
// Lets a company ADMIN create salesperson accounts. Creating auth users needs
// the service_role key, so it must run here (never in the browser).
//
// Deploy:  supabase functions deploy admin-users
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// POST body: { email, password, full_name, role? }  → creates the user + profile.
// The caller's JWT is verified to belong to an admin before anything happens.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 1) Identify the caller from their bearer token.
  const authHeader = req.headers.get('Authorization') || '';
  const caller = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await caller.auth.getUser();
  if (uErr || !user) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(URL, SERVICE);

  // 2) Ensure the caller is an admin.
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'admin') return json({ error: 'Forbidden — admin only' }, 403);

  // 3) Create the salesperson.
  const { email, password, full_name, role = 'rep' } = await req.json().catch(() => ({}));
  if (!email || !password) return json({ error: 'email and password are required' }, 400);
  if (String(password).length < 6) return json({ error: 'password must be at least 6 characters' }, 400);

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // let them log in immediately, no email step
    user_metadata: { full_name },
  });
  if (cErr) return json({ error: cErr.message }, 400);

  // 4) Set their profile (the signup trigger creates a default row; we refine it).
  const uid = created.user!.id;
  await admin.from('profiles').upsert(
    { id: uid, email, full_name: full_name || email.split('@')[0], role, active: true },
    { onConflict: 'id' },
  );

  return json({ id: uid, email, full_name, role });
});
