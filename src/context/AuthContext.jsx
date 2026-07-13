import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, hasSupabaseCreds } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) { setProfile(null); return; }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    // A deactivated salesperson is signed out immediately.
    // (`active` is undefined until schema_v7 adds the column — treated as active.)
    if (data && data.active === false) {
      setProfile(null);
      await supabase.auth.signOut();
      return;
    }
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (!hasSupabaseCreds) { setLoading(false); return; }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) loadProfile(s.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? 'rep',
    isAdmin: profile?.role === 'admin',
    loading,
    hasSupabaseCreds,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, fullName) =>
      supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }),
    // Local sign-out clears the session without a server round-trip that can
    // fail on a stale token; we also reset state explicitly so the UI always
    // returns to the login screen.
    signOut: async () => {
      try { await supabase.auth.signOut({ scope: 'local' }); }
      catch { /* ignore — clear locally regardless */ }
      setSession(null);
      setProfile(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
