import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { UserPlus, Target, BarChart3, ShieldCheck, User as UserIcon, Info, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useProfiles } from '../hooks/useProfiles';
import { useCollection } from '../hooks/useCollection';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { initials, fmtCompact, classNames } from '../lib/utils';
import { createRep, deleteRep, setRole, setActive, setTarget } from '../lib/adminApi';

export default function AdminUsers() {
  const { isAdmin, user } = useAuth();
  const { visits } = useData();
  const { profiles } = useProfiles();
  const { rows: targets } = useCollection('targets', { orderBy: 'period', ascending: false });
  const period = format(new Date(), 'yyyy-MM');

  const [addOpen, setAddOpen] = useState(false);
  const [targetFor, setTargetFor] = useState(null); // profile
  const [toRemove, setToRemove] = useState(null);    // profile
  const [removeErr, setRemoveErr] = useState('');

  const stats = useMemo(() => {
    const byOwner = {};
    for (const v of visits) {
      if (!v.visit_date?.startsWith(period)) continue;
      const s = (byOwner[v.owner_id] ||= { visits: 0, revenue: 0 });
      s.visits++;
      if (v.order_received) s.revenue += Number(v.order_value) || 0;
    }
    return byOwner;
  }, [visits, period]);

  const targetFor2 = (id) => targets.find((t) => t.owner_id === id && t.period === period);

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{profiles.length} team member{profiles.length !== 1 ? 's' : ''} · {format(new Date(), 'MMMM yyyy')}</p>
        <button className="btn-primary btn-sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Add Salesperson</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 font-medium">Salesperson</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">This Month</th>
                <th className="py-3 px-4 font-medium">Target</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => {
                const s = stats[p.id] || { visits: 0, revenue: 0 };
                const t = targetFor2(p.id);
                const active = p.active !== false;
                const self = p.id === user.id;
                const vPct = t?.visit_goal ? Math.min(100, Math.round((s.visits / t.visit_goal) * 100)) : null;
                const rPct = t?.revenue_goal ? Math.min(100, Math.round((s.revenue / t.revenue_goal) * 100)) : null;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-[11px] font-bold text-white">{initials(p.full_name || p.email)}</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{p.full_name || '—'}</div>
                          <div className="text-xs text-slate-500 truncate">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={p.role} disabled={self}
                        onChange={(e) => setRole(p.id, e.target.value)}
                        className={classNames('text-xs font-semibold rounded-lg border px-2 py-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
                          p.role === 'admin' ? 'text-accent-700 bg-accent-50 border-accent-200' : 'text-slate-600 bg-white border-slate-200')}
                        title={self ? "You can't change your own role" : 'Change role'}
                      >
                        <option value="rep">Rep</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => !self && setActive(p.id, !active)}
                        disabled={self}
                        className={classNames('text-[11px] font-semibold rounded-full px-2.5 py-1 ring-1 cursor-pointer disabled:cursor-not-allowed',
                          active ? 'text-emerald-700 bg-emerald-50 ring-emerald-200' : 'text-slate-500 bg-slate-100 ring-slate-200')}
                        title={self ? 'You cannot deactivate yourself' : active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 num whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{s.visits}</span> <span className="text-slate-400">visits</span>
                      <span className="text-slate-300"> · </span>
                      <span className="text-emerald-600 font-semibold">{fmtCompact(s.revenue)}</span>
                    </td>
                    <td className="py-3 px-4">
                      {t && (t.visit_goal || t.revenue_goal) ? (
                        <div className="space-y-1 min-w-[130px]">
                          {t.visit_goal > 0 && <Bar label="Visits" pct={vPct} tone="from-brand-500 to-brand-600" sub={`${s.visits}/${t.visit_goal}`} />}
                          {t.revenue_goal > 0 && <Bar label="Rev" pct={rPct} tone="from-emerald-500 to-emerald-600" sub={`${fmtCompact(s.revenue)}/${fmtCompact(t.revenue_goal)}`} />}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-ghost btn-sm" onClick={() => setTargetFor(p)}><Target className="h-4 w-4" /> Target</button>
                        <Link className="btn-ghost btn-sm" to={`/admin/reps/${p.id}`}><BarChart3 className="h-4 w-4" /> Report</Link>
                        <button
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => { setRemoveErr(''); setToRemove(p); }}
                          disabled={self}
                          title={self ? "You can't remove your own account" : 'Remove user'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {profiles.length === 0 && <EmptyState icon={UserIcon} title="No team members yet" hint="Add your first salesperson." />}
      </div>

      {addOpen && <AddSalesperson onClose={() => setAddOpen(false)} />}
      {targetFor && <SetTargetModal profile={targetFor} period={period} existing={targetFor2(targetFor.id)} onClose={() => setTargetFor(null)} />}

      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        title="Remove user"
        message={
          <>
            Permanently remove <b>{toRemove?.full_name || toRemove?.email}</b> and <b>all their data</b> (visits, clients,
            deals, quotes, tasks)? This cannot be undone. To keep their data, use <b>Deactivate</b> instead.
            {removeErr && <span className="block mt-2 text-rose-600">{removeErr}</span>}
          </>
        }
        onConfirm={async () => {
          try { await deleteRep(toRemove.id); }
          catch (e) { setRemoveErr(e.message); throw e; }
        }}
      />
    </div>
  );
}

function Bar({ label, pct, sub, tone }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-7 text-slate-400 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] num text-slate-500 shrink-0 w-20 text-right">{sub}</span>
    </div>
  );
}

function AddSalesperson({ onClose }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'rep' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setOk('');
    try {
      await createRep(form);
      setOk(`${form.full_name || form.email} added. Share their email + password so they can sign in.`);
      setForm({ full_name: '', email: '', password: '', role: 'rep' });
    } catch (err) {
      setError(err.notConfigured
        ? 'The admin-users function isn’t deployed yet. Deploy supabase/functions/admin-users, then try again.'
        : err.message);
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Add Salesperson" subtitle="Creates a login they can use immediately"
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Close</button>
        <button className="btn-primary" form="addRepForm" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
      </>}>
      <form id="addRepForm" onSubmit={submit} className="space-y-4">
        {error && <div className="text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">{error}</div>}
        {ok && <div className="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-3 py-2">{ok}</div>}
        <div><label className="label">Full name</label><input className="input" value={form.full_name} onChange={set('full_name')} placeholder="e.g. Ramesh Gupta" /></div>
        <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={set('email')} placeholder="ramesh@company.com" required /></div>
        <div>
          <label className="label">Temporary password *</label>
          <input className="input num" value={form.password} onChange={set('password')} placeholder="min 6 characters" required minLength={6} />
          <p className="text-xs text-slate-400 mt-1">They can change it later. Share it with them securely.</p>
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={set('role')}>
            <option value="rep">Sales Rep — sees only their own data</option>
            <option value="admin">Admin — full access & this console</option>
          </select>
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 ring-1 ring-slate-200 rounded-lg px-3 py-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
          Requires the <code className="font-mono">admin-users</code> Edge Function (uses your service key server-side — see README).
        </div>
      </form>
    </Modal>
  );
}

function SetTargetModal({ profile, period, existing, onClose }) {
  const [visitGoal, setVisitGoal] = useState(existing?.visit_goal ?? '');
  const [revenueGoal, setRevenueGoal] = useState(existing?.revenue_goal ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    await setTarget(profile.id, period, visitGoal, revenueGoal);
    setBusy(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Target · ${profile.full_name || profile.email}`} subtitle={format(new Date(), 'MMMM yyyy')}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save target'}</button>
      </>}>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Visits goal</label><input type="number" min="0" className="input num" value={visitGoal} onChange={(e) => setVisitGoal(e.target.value)} placeholder="e.g. 60" /></div>
        <div><label className="label">Revenue goal (₹)</label><input type="number" min="0" className="input num" value={revenueGoal} onChange={(e) => setRevenueGoal(e.target.value)} placeholder="e.g. 500000" /></div>
      </div>
    </Modal>
  );
}
