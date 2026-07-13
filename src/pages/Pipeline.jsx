import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCollection } from '../hooks/useCollection';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { fmtCompact, fmtCurrency, classNames } from '../lib/utils';

const STAGES = ['Lead', 'Quoted', 'Negotiation', 'Won', 'Lost'];
const STAGE_DOT = {
  Lead: 'bg-slate-400', Quoted: 'bg-blue-500', Negotiation: 'bg-amber-500', Won: 'bg-emerald-500', Lost: 'bg-rose-500',
};
const EMPTY = { title: '', client_name: '', company: '', value: '', stage: 'Lead', expected_close: '', notes: '' };

export default function Pipeline() {
  const { user } = useAuth();
  const { rows } = useCollection('deals', { orderBy: 'created_at', ascending: false });
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const byStage = useMemo(() => {
    const m = Object.fromEntries(STAGES.map((s) => [s, []]));
    rows.forEach((d) => (m[d.stage] || m.Lead).push(d));
    return m;
  }, [rows]);

  const totals = useMemo(() => {
    const open = rows.filter((d) => !['Won', 'Lost'].includes(d.stage));
    const won = rows.filter((d) => d.stage === 'Won');
    return {
      openValue: open.reduce((s, d) => s + (Number(d.value) || 0), 0),
      wonValue: won.reduce((s, d) => s + (Number(d.value) || 0), 0),
      openCount: open.length, wonCount: won.length,
    };
  }, [rows]);

  const openModal = (d) => { setForm(d ? { ...EMPTY, ...d, value: d.value ?? '' } : EMPTY); setModal({ open: true, editing: d }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title, client_name: form.client_name, company: form.company,
      value: form.value === '' ? 0 : Number(form.value), stage: form.stage,
      expected_close: form.expected_close || null, notes: form.notes, updated_at: new Date().toISOString(),
    };
    if (modal.editing) await supabase.from('deals').update(payload).eq('id', modal.editing.id);
    else await supabase.from('deals').insert({ ...payload, owner_id: user.id });
    setSaving(false);
    setModal({ open: false, editing: null });
  };

  const moveTo = (d, stage) => supabase.from('deals').update({ stage, updated_at: new Date().toISOString() }).eq('id', d.id);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Stat label="Open pipeline" value={fmtCompact(totals.openValue)} sub={`${totals.openCount} deals`} />
          <Stat label="Won" value={fmtCompact(totals.wonValue)} sub={`${totals.wonCount} deals`} tone="emerald" />
        </div>
        <button className="btn-primary btn-sm" onClick={() => openModal(null)}><Plus className="h-4 w-4" /> New Deal</button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {STAGES.map((stage) => {
          const list = byStage[stage];
          const sum = list.reduce((s, d) => s + (Number(d.value) || 0), 0);
          return (
            <div key={stage} className="w-[280px] shrink-0">
              <div className="flex items-center gap-2 px-1 pb-2">
                <span className={classNames('h-2.5 w-2.5 rounded-full', STAGE_DOT[stage])} />
                <span className="text-sm font-semibold text-slate-900">{stage}</span>
                <span className="text-xs text-slate-400 num">{list.length}</span>
                <span className="ml-auto text-xs text-slate-500 num">{fmtCompact(sum)}</span>
              </div>
              <div className="space-y-2 min-h-[80px] rounded-2xl bg-slate-100/60 p-2">
                {list.map((d) => {
                  const idx = STAGES.indexOf(d.stage);
                  const next = STAGES[idx + 1];
                  return (
                    <div key={d.id} className="card p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-900 text-sm leading-snug">{d.title}</div>
                        <div className="flex gap-0.5 shrink-0">
                          <button className="p-1 rounded text-slate-400 hover:text-brand-600 cursor-pointer" onClick={() => openModal(d)}><Pencil className="h-3.5 w-3.5" /></button>
                          <button className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer" onClick={() => setToDelete(d)}><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      {(d.client_name || d.company) && <div className="text-xs text-slate-500 mt-0.5 truncate">{d.client_name}{d.company ? ` · ${d.company}` : ''}</div>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="num text-sm font-bold text-slate-900">{fmtCurrency(d.value)}</span>
                        {next && !['Won', 'Lost'].includes(d.stage) && (
                          <button onClick={() => moveTo(d, next)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
                            {next} <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Edit Deal' : 'New Deal'}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal({ open: false, editing: null })}>Cancel</button>
          <button className="btn-primary" form="dealForm" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        <form id="dealForm" onSubmit={save} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Deal title *</label><input className="input" value={form.title} onChange={set('title')} placeholder="e.g. 200kg ink reorder" /></div>
          <div><label className="label">Client</label><input className="input" value={form.client_name} onChange={set('client_name')} /></div>
          <div><label className="label">Company</label><input className="input" value={form.company} onChange={set('company')} /></div>
          <div><label className="label">Value (₹)</label><input type="number" min="0" className="input num" value={form.value} onChange={set('value')} placeholder="0" /></div>
          <div><label className="label">Stage</label><select className="input" value={form.stage} onChange={set('stage')}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="col-span-2"><label className="label">Expected close</label><input type="date" className="input" value={form.expected_close || ''} onChange={set('expected_close')} /></div>
          <div className="col-span-2"><label className="label">Notes</label><textarea rows={2} className="input resize-none" value={form.notes} onChange={set('notes')} /></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => supabase.from('deals').delete().eq('id', toDelete.id)}
        title="Delete deal" message={`Delete "${toDelete?.title}"?`} />
    </div>
  );
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className="card px-4 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={classNames('num text-lg font-bold', tone === 'emerald' ? 'text-emerald-600' : 'text-slate-900')}>{value}</div>
      <div className="text-[11px] text-slate-400 num">{sub}</div>
    </div>
  );
}
