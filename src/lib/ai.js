import { supabase } from './supabase';

/**
 * Call the `ai` Edge Function. Returns { text } or throws a friendly Error.
 * `notConfigured` is set on the error when the Gemini key isn't set server-side.
 */
export async function runAI(task, payload) {
  const { data, error } = await supabase.functions.invoke('ai', { body: { task, payload } });

  if (error) {
    // Edge function returned a non-2xx — try to read its JSON body for a nicer message.
    let msg = error.message || 'AI request failed';
    let notConfigured = false;
    try {
      const ctx = await error.context?.json?.();
      if (ctx?.error) msg = ctx.error;
      if (ctx?.error === 'AI not configured') notConfigured = true;
    } catch { /* ignore */ }
    const e = new Error(msg);
    e.notConfigured = notConfigured;
    throw e;
  }
  if (data?.error) {
    const e = new Error(data.error);
    e.notConfigured = data.error === 'AI not configured';
    throw e;
  }
  return data?.text || '';
}

// Compact a client + visits into a small payload for the model.
export function clientContext(client, visits) {
  return {
    client: { name: client.name, company: client.company, category: client.category, city: client.city },
    recent_visits: (visits || []).slice(0, 8).map((v) => ({
      date: v.visit_date, status: v.visit_status, requirement: v.requirement,
      order: v.order_received ? v.order_value : null, next: v.next_visit_date,
    })),
  };
}
