import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Generic Supabase table hook with realtime refresh.
 * RLS scopes rows automatically (rep → own, admin → all).
 */
export function useCollection(table, { orderBy = 'created_at', ascending = false } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending });
    if (!mounted.current) return;
    if (error) setError(error.message);
    else { setRows(data || []); setError(null); }
    setLoading(false);
  }, [table, orderBy, ascending]);

  useEffect(() => {
    mounted.current = true;
    fetchRows();
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, fetchRows)
      .subscribe();
    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [table, fetchRows]);

  return { rows, loading, error, refresh: fetchRows };
}
