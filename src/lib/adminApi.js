import { supabase } from './supabase';

/** Create a salesperson via the admin-users Edge Function. Throws a friendly Error. */
export async function createRep({ email, password, full_name, role = 'rep' }) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { email, password, full_name, role },
  });
  if (error) {
    let msg = error.message || 'Request failed';
    let notConfigured = false;
    try {
      const ctx = await error.context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* ignore */ }
    if (/not found|404|Failed to send/i.test(msg)) notConfigured = true;
    const e = new Error(msg);
    e.notConfigured = notConfigured;
    throw e;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Permanently remove a user (auth account + all their data). Admin-only, via Edge Function. */
export async function deleteRep(userId) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete', userId },
  });
  if (error) {
    let msg = error.message || 'Request failed';
    try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* ignore */ }
    if (/not found|404|Failed to send/i.test(msg)) msg = 'The admin-users function isn’t deployed yet (see README).';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Change a user's role (admin | rep). Allowed by RLS for admins. */
export function setRole(userId, role) {
  return supabase.from('profiles').update({ role }).eq('id', userId);
}

/** Activate / deactivate a user (soft — keeps their data). */
export function setActive(userId, active) {
  return supabase.from('profiles').update({ active }).eq('id', userId);
}

/** Upsert a rep's monthly target. */
export function setTarget(ownerId, period, visit_goal, revenue_goal) {
  return supabase.from('targets').upsert(
    { owner_id: ownerId, period, visit_goal: Number(visit_goal) || 0, revenue_goal: Number(revenue_goal) || 0 },
    { onConflict: 'owner_id,period' },
  );
}
