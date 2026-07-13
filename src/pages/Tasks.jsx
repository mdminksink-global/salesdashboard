import { useMemo, useState } from 'react';
import { Plus, Check, Pencil, Trash2, ListTodo, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCollection } from '../hooks/useCollection';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { fmtDate, daysUntil, todayISO, classNames } from '../lib/utils';

const PRIORITY = {
  High:   'text-rose-700 bg-rose-50 ring-rose-200',
  Medium: 'text-amber-700 bg-amber-50 ring-amber-200',
  Low:    'text-slate-600 bg-slate-100 ring-slate-200',
};
const EMPTY = { title: '', client_name: '', due_date: todayISO(), priority: 'Medium', notes: '' };

export default function Tasks() {
  const { user } = useAuth();
  const { rows, loading } = useCollection('tasks', { orderBy: 'due_date', ascending: true });
  const [filter, setFilter] = useState('open');
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const shown = useMemo(() => {
    if (filter === 'open') return rows.filter((t) => !t.done);
    if (filter === 'done') return rows.filter((t) => t.done);
    return rows;
  }, [rows, filter]);

  const openModal = (t) => { setForm(t ? { ...EMPTY, ...t } : EMPTY); setModal({ open: true, editing: t }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { title: form.title, client_name: form.client_name, due_date: form.due_date || null, priority: form.priority, notes: form.notes };
    if (modal.editing) await supabase.from('tasks').update(payload).eq('id', modal.editing.id);
    else await supabase.from('tasks').insert({ ...payload, owner_id: user.id });
    setSaving(false);
    setModal({ open: false, editing: null });
  };

  const toggle = (t) => supabase.from('tasks').update({ done: !t.done }).eq('id', t.id);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-white border border-slate-200 p-1">
          {['open', 'done', 'all'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={classNames('px-3 py-1.5 text-[13px] font-medium rounded-lg capitalize cursor-pointer transition-colors',
                filter === f ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {f}
            </button>
          ))}
        </div>
        <button className="btn-primary btn-sm" onClick={() => openModal(null)}><Plus className="h-4 w-4" /> New Task</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="card"><EmptyState icon={ListTodo} title="No tasks here" hint="Create a task or reminder to stay on top of follow-ups." /></div>
      ) : (
        <div className="space-y-2">
          {shown.map((t) => {
            const d = daysUntil(t.due_date);
            const overdue = !t.done && d !== null && d < 0;
            return (
              <div key={t.id} className="card p-3.5 flex items-center gap-3">
                <button onClick={() => toggle(t)} aria-label="Toggle done"
                  className={classNames('h-6 w-6 rounded-md border grid place-items-center shrink-0 cursor-pointer transition-colors',
                    t.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 hover:border-brand-500')}>
                  {t.done && <Check className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={classNames('font-semibold truncate', t.done ? 'text-slate-400 line-through' : 'text-slate-900')}>{t.title}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    {t.client_name && <span className="truncate">{t.client_name}</span>}
                    {t.due_date && (
                      <span className={classNames('num', overdue && 'text-rose-600 font-semibold')}>
                        {overdue ? 'Overdue · ' : ''}{fmtDate(t.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={classNames('hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ring-1', PRIORITY[t.priority])}>
                  <Flag className="h-3 w-3" /> {t.priority}
                </span>
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 cursor-pointer" onClick={() => openModal(t)}><Pencil className="h-4 w-4" /></button>
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 cursor-pointer" onClick={() => setToDelete(t)}><Trash2 className="h-4 w-4" /></button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Edit Task' : 'New Task'}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal({ open: false, editing: null })}>Cancel</button>
          <button className="btn-primary" form="taskForm" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        <form id="taskForm" onSubmit={save} className="space-y-4">
          <div><label className="label">Task *</label><input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Call Rajesh about reorder" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Due date</label><input type="date" className="input" value={form.due_date || ''} onChange={set('due_date')} /></div>
            <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={set('priority')}>{['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}</select></div>
          </div>
          <div><label className="label">Client (optional)</label><input className="input" value={form.client_name} onChange={set('client_name')} placeholder="Client name" /></div>
          <div><label className="label">Notes</label><textarea rows={2} className="input resize-none" value={form.notes} onChange={set('notes')} /></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => supabase.from('tasks').delete().eq('id', toDelete.id)}
        title="Delete task" message={`Delete "${toDelete?.title}"?`} />
    </div>
  );
}
