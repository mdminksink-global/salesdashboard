import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useCollection } from '../hooks/useCollection';
import { useProfiles } from '../hooks/useProfiles';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const visits = useCollection('visits', { orderBy: 'visit_date', ascending: false });
  const clients = useCollection('clients', { orderBy: 'name', ascending: true });
  const { profiles, byId, loading: profilesLoading } = useProfiles();

  const [visitModal, setVisitModal] = useState({ open: false, editing: null });
  const [clientModal, setClientModal] = useState({ open: false, editing: null });

  const openVisitModal = useCallback((editing = null) => setVisitModal({ open: true, editing }), []);
  const closeVisitModal = useCallback(() => setVisitModal({ open: false, editing: null }), []);
  const openClientModal = useCallback((editing = null) => setClientModal({ open: true, editing }), []);
  const closeClientModal = useCallback(() => setClientModal({ open: false, editing: null }), []);

  const saveVisit = useCallback(
    async (form, id) => {
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (id) return supabase.from('visits').update(payload).eq('id', id);
      return supabase.from('visits').insert({ ...payload, owner_id: user.id });
    },
    [user]
  );

  const deleteVisit = useCallback((id) => supabase.from('visits').delete().eq('id', id), []);

  const saveClient = useCallback(
    async (form, id) => {
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (id) return supabase.from('clients').update(payload).eq('id', id);
      return supabase.from('clients').insert({ ...payload, owner_id: user.id });
    },
    [user]
  );

  const deleteClient = useCallback((id) => supabase.from('clients').delete().eq('id', id), []);

  const value = {
    visits: visits.rows,
    clients: clients.rows,
    profiles,
    profilesById: byId,
    loading: visits.loading || clients.loading || profilesLoading,
    refresh: () => { visits.refresh(); clients.refresh(); },
    visitModal, openVisitModal, closeVisitModal, saveVisit, deleteVisit,
    clientModal, openClientModal, closeClientModal, saveClient, deleteClient,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
