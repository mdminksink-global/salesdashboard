import { useMemo, useState } from 'react';
import { Search, Download, Pencil, Trash2, Plus, ClipboardList, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, YesNo } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { VISIT_STATUSES, fmtDate, fmtCurrency, downloadCSV } from '../lib/utils';

export default function Visits() {
  const { visits, loading, openVisitModal, deleteVisit, profilesById } = useData();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [rep, setRep] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const reps = useMemo(() => {
    const ids = [...new Set(visits.map((v) => v.owner_id))];
    return ids.map((id) => ({ id, name: profilesById[id]?.full_name || profilesById[id]?.email || 'Unknown' }));
  }, [visits, profilesById]);

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    return visits.filter((v) => {
      const matchQ = !term ||
        [v.client_name, v.company, v.requirement, v.phone, v.email].some((f) => (f || '').toLowerCase().includes(term));
      const matchS = !status || v.visit_status === status;
      const matchR = !rep || v.owner_id === rep;
      const matchF = !from || v.visit_date >= from;
      const matchT = !to || v.visit_date <= to;
      return matchQ && matchS && matchR && matchF && matchT;
    });
  }, [visits, q, status, rep, from, to]);

  const hasFilters = q || status || rep || from || to;
  const clear = () => { setQ(''); setStatus(''); setRep(''); setFrom(''); setTo(''); };

  const exportCsv = () =>
    downloadCSV('visits.csv', rows, [
      { label: 'Date', get: (r) => r.visit_date },
      { label: 'Client', get: (r) => r.client_name },
      { label: 'Company', get: (r) => r.company },
      { label: 'Phone', get: (r) => r.phone },
      { label: 'Email', get: (r) => r.email },
      { label: 'Status', get: (r) => r.visit_status },
      { label: 'Requirement', get: (r) => r.requirement },
      { label: 'Next Visit', get: (r) => r.next_visit_date },
      { label: 'Order', get: (r) => (r.order_received ? 'Yes' : 'No') },
      { label: 'Order Value', get: (r) => r.order_value },
      { label: 'Invoice', get: (r) => r.invoice_no },
    ]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input className="input pl-9" placeholder="Search client, company, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {VISIT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {isAdmin && (
              <select className="input w-auto" value={rep} onChange={(e) => setRep(e.target.value)}>
                <option value="">All reps</option>
                {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
            <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
            {hasFilters && (
              <button className="btn-ghost btn-sm" onClick={clear}><X className="h-4 w-4" /> Clear</button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-500 num">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> Export CSV</button>
            <button className="btn-primary btn-sm" onClick={() => openVisitModal(null)}><Plus className="h-4 w-4" /> Add Visit</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Client</th>
                <th className="py-3 px-4 font-medium">Company</th>
                {isAdmin && <th className="py-3 px-4 font-medium">Rep</th>}
                <th className="py-3 px-4 font-medium">Phone</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Next Visit</th>
                <th className="py-3 px-4 font-medium">Order</th>
                <th className="py-3 px-4 font-medium">Value</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}><td colSpan={isAdmin ? 10 : 9} className="py-4 px-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={isAdmin ? 10 : 9}><EmptyState icon={ClipboardList} title="No visits match your filters" hint={hasFilters ? 'Try clearing filters.' : 'Add your first visit.'} /></td></tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 num text-xs text-slate-400 whitespace-nowrap">{fmtDate(v.visit_date)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{v.client_name}</td>
                    <td className="py-3 px-4 text-slate-400">{v.company || '—'}</td>
                    {isAdmin && <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{profilesById[v.owner_id]?.full_name || '—'}</td>}
                    <td className="py-3 px-4 num text-xs text-slate-400 whitespace-nowrap">{v.phone || '—'}</td>
                    <td className="py-3 px-4"><StatusBadge status={v.visit_status} /></td>
                    <td className="py-3 px-4 num text-xs text-slate-400 whitespace-nowrap">{v.next_visit_date ? fmtDate(v.next_visit_date) : '—'}</td>
                    <td className="py-3 px-4"><YesNo value={v.order_received} /></td>
                    <td className="py-3 px-4 num text-xs text-slate-600 whitespace-nowrap">{v.order_received ? fmtCurrency(v.order_value) : '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-slate-100 transition-colors cursor-pointer" title="Edit" onClick={() => openVisitModal(v)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-100 transition-colors cursor-pointer" title="Delete" onClick={() => setToDelete(v)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteVisit(toDelete.id)}
        title="Delete visit"
        message={`Delete the visit for "${toDelete?.client_name}"? This cannot be undone.`}
      />
    </div>
  );
}
