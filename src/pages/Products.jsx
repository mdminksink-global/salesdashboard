import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCollection } from '../hooks/useCollection';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { fmtCurrency, classNames } from '../lib/utils';

const EMPTY = { name: '', sku: '', category: '', price: '', unit: 'unit', description: '', active: true };

export default function Products() {
  const { user } = useAuth();
  const { rows, loading } = useCollection('products', { orderBy: 'name', ascending: true });
  const [q, setQ] = useState('');
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const shown = useMemo(() => {
    const term = q.toLowerCase();
    return rows.filter((p) => !term || [p.name, p.sku, p.category].some((f) => (f || '').toLowerCase().includes(term)));
  }, [rows, q]);

  const openModal = (p) => { setForm(p ? { ...EMPTY, ...p } : EMPTY); setModal({ open: true, editing: p }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name, sku: form.sku, category: form.category, price: form.price === '' ? null : Number(form.price), unit: form.unit, description: form.description, active: form.active };
    if (modal.editing) await supabase.from('products').update(payload).eq('id', modal.editing.id);
    else await supabase.from('products').insert({ ...payload, owner_id: user.id });
    setSaving(false);
    setModal({ open: false, editing: null });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => openModal(null)}><Plus className="h-4 w-4" /> Add Product</button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="card"><EmptyState icon={Package} title="No products yet" hint="Build your catalog so quotes and orders are one tap away." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((p) => (
            <div key={p.id} className="card p-5 group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 num truncate">{p.sku || '—'}{p.category ? ` · ${p.category}` : ''}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 cursor-pointer" onClick={() => openModal(p)}><Pencil className="h-4 w-4" /></button>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 cursor-pointer" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {p.description && <p className="text-[13px] text-slate-500 mt-2 line-clamp-2">{p.description}</p>}
              <div className="mt-4 flex items-center justify-between">
                <span className="num text-lg font-bold text-slate-900">{fmtCurrency(p.price)}<span className="text-xs font-normal text-slate-400">/{p.unit}</span></span>
                <span className={classNames('text-[11px] font-semibold rounded-full px-2 py-0.5 ring-1',
                  p.active ? 'text-emerald-700 bg-emerald-50 ring-emerald-200' : 'text-slate-500 bg-slate-100 ring-slate-200')}>
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Edit Product' : 'Add Product'}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal({ open: false, editing: null })}>Cancel</button>
          <button className="btn-primary" form="productForm" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        <form id="productForm" onSubmit={save} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Name *</label><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Black Offset Ink 1kg" /></div>
          <div><label className="label">SKU</label><input className="input num" value={form.sku} onChange={set('sku')} placeholder="INK-BLK-1" /></div>
          <div><label className="label">Category</label><input className="input" value={form.category} onChange={set('category')} placeholder="Offset / Flexo…" /></div>
          <div><label className="label">Price (₹)</label><input type="number" min="0" className="input num" value={form.price} onChange={set('price')} placeholder="0" /></div>
          <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={set('unit')} placeholder="kg / unit / box" /></div>
          <div className="col-span-2"><label className="label">Description</label><textarea rows={2} className="input resize-none" value={form.description} onChange={set('description')} /></div>
          <label className="col-span-2 inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-brand-600 h-4 w-4" checked={form.active} onChange={set('active')} /> Active (available to sell)
          </label>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => supabase.from('products').delete().eq('id', toDelete.id)}
        title="Delete product" message={`Delete "${toDelete?.name}"?`} />
    </div>
  );
}
