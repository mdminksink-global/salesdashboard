import { useMemo } from 'react';
import { useCollection } from './useCollection';

/**
 * Profiles the current user can see (admin → everyone, rep → self).
 * Returns a lookup map for resolving owner_id → name.
 */
export function useProfiles() {
  const { rows, loading } = useCollection('profiles', { orderBy: 'full_name', ascending: true });

  const byId = useMemo(() => {
    const m = {};
    for (const p of rows) m[p.id] = p;
    return m;
  }, [rows]);

  return { profiles: rows, byId, loading };
}
