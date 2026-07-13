import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Users, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CategoryBadge } from '../components/Badge';
import ContactActions from '../components/ContactActions';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { CLIENT_CATEGORIES, initials } from '../lib/utils';

export default function Clients() {
  const { clients, visits, loading, openClientModal, deleteClient } = useData();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    return clients.filter((c) => {
      const matchQ = !term || [c.name, c.company, c.city, c.phone].some((f) => (f || '').toLowerCase().includes(term));
      return matchQ && (!cat || c.category === cat);
    });
  }, [clients, q, cat]);

  const visitCountByName = useMemo(() => {
    const m = {};
    visits.forEach((v) => { m[v.client_name] = (m[v.client_name] || 0) + 1; });
    return m;
  }, [visits]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input className="input pl-9" placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input sm:w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CLIENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="btn-primary" onClick={() => openClientModal(null)}><Plus className="h-4 w-4" /> Add Client</button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-40 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="No clients yet" hint="Add clients to build your directory." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            <div key={c.id} className="card p-5 group hover:ring-1 hover:ring-brand-200 transition-all">
              <div className="flex items-start gap-3">
                <Link to={`/clients/${c.id}`} className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-sm font-bold text-white shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate group-hover:text-brand-700 transition-colors">{c.name}</div>
                    {c.company && <div className="text-xs text-slate-400 truncate flex items-center gap-1"><Building2 className="h-3 w-3" /> {c.company}</div>}
                  </div>
                </Link>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-slate-100 cursor-pointer" onClick={() => openClientModal(c)} title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-100 cursor-pointer" onClick={() => setToDelete(c)} title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-[13px] text-slate-500">
                {c.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> <span className="num">{c.phone}</span></div>}
                {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> <span className="truncate">{c.email}</span></div>}
                {c.city && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {c.city}</div>}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <CategoryBadge category={c.category} />
                <ContactActions phone={c.phone} email={c.email} address={c.address || c.city} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteClient(toDelete.id)}
        title="Delete client"
        message={`Delete "${toDelete?.name}" from your client directory? This cannot be undone.`}
      />
    </div>
  );
}
