import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseCreds = Boolean(url && anonKey);

if (!hasSupabaseCreds) {
  // Surfaced in the UI via <ConfigMissing/> — keeps the app from hard-crashing.
  console.warn('[MDM CRM] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example → .env.');
}

export const supabase = hasSupabaseCreds
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
