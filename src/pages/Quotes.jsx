import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, FileText, Download, MessageCircle, Pencil, Trash2, Trash, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useCollection } from '../hooks/useCollection';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { fmtDate, fmtCurrency, computeTotals, todayISO, classNames } from '../lib/utils';

// PDF engine (jsPDF + deps) is loaded on demand to keep the initial bundle small.
const loadPdf = () => import('../lib/pdf');
const onDownloadPdf = async (q, seller) => (await loadPdf()).downloadQuotePdf(q, seller);
const onShareWhatsApp = async (q, seller) => (await loadPdf()).shareQuoteOnWhatsApp(q, seller);

const STATUSES = ['Draft', 'Sent', 'Accepted', 'Rejected'];
const STATUS_STYLE = {
  Draft:    'text-slate-600 bg-slate-100 ring-slate-200',
  Sent:     'text-blue-700 bg-blue-50 ring-blue-200',
  Accepted: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
  Rejected: 'text-rose-700 bg-rose-50 ring-rose-200',
};
const emptyItem = () => ({ name: '', qty: 1, price: '' });
const EMPTY = {
  quote_number: '', client_name: '', company: '', phone: '', email: '',
  quote_date: todayISO(), valid_until: '', items: [emptyItem()],
  tax_percent: '', discount: '', notes: '', terms: 'Prices valid until the date above. Taxes extra as applicable.', status: 'Draft',
};

export default function Quotes() {
  const { user, profile } = useAuth();
  const { clients } = useData();
  const { rows: quotes, loading } = useCollection('quotes', { orderBy: 'created_at', ascending: false });
  const { rows: products } = useCollection('products', { orderBy: 'name', ascending: true });
  const seller = { name: profile?.full_name, email: user?.email };

  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const totals = useMemo(() => computeTotals(form.items, form.tax_percent, form.discount), [form.items, form.tax_percent, form.discount]);

  const nextNumber = () => `QT-${format(new Date(), 'yyyyMM')}-${String(quotes.length + 1).padStart(3, '0')}`;

  const openNew = () => { setForm({ ...EMPTY, quote_number: nextNumber(), items: [emptyItem()] }); setModal({ open: true, editing: null }); };
  const openEdit = (q) => { setForm({ ...EMPTY, ...q, tax_percent: q.tax_percent ?? '', discount: q.discount ?? '', items: (q.items?.length ? q.items : [emptyItem()]) }); setModal({ open: true, editing: q }); };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setItem = (i, k, v) => setForm((f) => {
    const items = f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it));
    return { ...f, items };
  });
  const onItemName = (i, name) => {
    const p = products.find((pr) => pr.name.toLowerCase() === name.toLowerCase());
    setForm((f) => {
      const items = f.items.map((it, idx) => (idx === i ? { ...it, name, price: p && (it.price === '' || it.price == null) ? (p.price ?? '') : it.price } : it));
      return { ...f, items };
    });
  };
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i).length ? f.items.filter((_, idx) => idx !== i) : [emptyItem()] }));

  const onClientName = (name) => {
    const c = clients.find((cl) => cl.name.toLowerCase() === name.toLowerCase());
    setForm((f) => ({ ...f, client_name: name, ...(c ? { company: c.company || '', phone: c.phone || '', email: c.email || '' } : {}) }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) return;
    setSaving(true);
    const items = form.items.filter((it) => it.name.trim()).map((it) => ({ name: it.name, qty: Number(it.qty) || 0, price: Number(it.price) || 0 }));
    const { subtotal, total } = computeTotals(items, form.tax_percent, form.discount);
    const payload = {
      quote_number: form.quote_number || nextNumber(), client_name: form.client_name, company: form.company, phone: form.phone, email: form.email,
      quote_date: form.quote_date || null, valid_until: form.valid_until || null, items,
      tax_percent: Number(form.tax_percent) || 0, discount: Number(form.discount) || 0, subtotal, total,
      notes: form.notes, terms: form.terms, status: form.status, updated_at: new Date().toISOString(),
    };
    if (modal.editing) await supabase.from('quotes').update(payload).eq('id', modal.editing.id);
    else await supabase.from('quotes').insert({ ...payload, owner_id: user.id });
    setSaving(false);
    setModal({ open: false, editing: null });
  };

  const setStatus = (q, status) => supabase.from('quotes').update({ status }).eq('id', q.id);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 num">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</p>
        <button className="btn-primary btn-sm" onClick={openNew}><Plus className="h-4 w-4" /> New Quote</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}</div>
      ) : quotes.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title="No quotations yet" hint="Create a branded quote and share it on WhatsApp in seconds." /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quotes.map((q) => (
            <div key={q.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="num text-xs text-slate-400">{q.quote_number}</div>
                  <div className="font-semibold text-slate-900 truncate">{q.client_name || '—'}</div>
                  {q.company && <div className="text-xs text-slate-500 truncate">{q.company}</div>}
                </div>
                <select value={q.status} onChange={(e) => setStatus(q, e.target.value)}
                  className={classNames('text-[11px] font-semibold rounded-full pl-2 pr-6 py-1 ring-1 cursor-pointer appearance-none bg-no-repeat', STATUS_STYLE[q.status])}
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'3\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundPosition: 'right 6px center' }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="num text-lg font-bold text-slate-900">{fmtCurrency(q.total)}</div>
                  <div className="num text-[11px] text-slate-400">{fmtDate(q.quote_date)} · {(q.items?.length || 0)} items</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1">
                <button className="btn-ghost btn-sm flex-1" onClick={() => onDownloadPdf(q, seller)} title="Download PDF"><Download className="h-4 w-4" /> PDF</button>
                <button className="btn-sm flex-1 bg-emerald-600 text-white hover:bg-emerald-700 btn" onClick={() => onShareWhatsApp(q, seller)} title="Share on WhatsApp"><MessageCircle className="h-4 w-4" /> Send</button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 cursor-pointer" onClick={() => openEdit(q)} title="Edit"><Pencil className="h-4 w-4" /></button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 cursor-pointer" onClick={() => setToDelete(q)} title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder */}
      <Modal open={modal.open} onClose={() => setModal({ open: false, editing: null })} wide
        title={modal.editing ? `Edit ${form.quote_number}` : 'New Quotation'}
        subtitle="Build a quote, then download a PDF or send on WhatsApp"
        footer={<>
          <div className="mr-auto text-sm text-slate-500">Total <span className="num font-bold text-slate-900 ml-1">{fmtCurrency(totals.total)}</span></div>
          <button className="btn-ghost" onClick={() => setModal({ open: false, editing: null })}>Cancel</button>
          <button className="btn-primary" form="quoteForm" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Quote'}</button>
        </>}>
        <form id="quoteForm" onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Quote #</label><input className="input num" value={form.quote_number} onChange={set('quote_number')} /></div>
            <div><label className="label">Status</label><select className="input" value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="col-span-2"><label className="label">Client *</label>
              <input className="input" list="quoteClients" value={form.client_name} onChange={(e) => onClientName(e.target.value)} placeholder="Client name" />
              <datalist id="quoteClients">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div><label className="label">Company</label><input className="input" value={form.company} onChange={set('company')} /></div>
            <div><label className="label">Phone</label><input className="input num" value={form.phone} onChange={set('phone')} /></div>
            <div><label className="label">Quote date</label><input type="date" className="input" value={form.quote_date} onChange={set('quote_date')} /></div>
            <div><label className="label">Valid until</label><input type="date" className="input" value={form.valid_until || ''} onChange={set('valid_until')} /></div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Line Items</label>
              <button type="button" className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer inline-flex items-center gap-1" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Add item</button>
            </div>
            <datalist id="quoteProducts">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input flex-1" list="quoteProducts" placeholder="Item / product" value={it.name} onChange={(e) => onItemName(i, e.target.value)} />
                  <input className="input num w-16 text-center" type="number" min="0" placeholder="Qty" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
                  <input className="input num w-24" type="number" min="0" placeholder="Rate" value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} />
                  <div className="num w-24 text-right text-sm text-slate-600 shrink-0">{fmtCurrency((Number(it.qty) || 0) * (Number(it.price) || 0))}</div>
                  <button type="button" className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0" onClick={() => removeItem(i)}><Trash className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals controls */}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Tax %</label><input className="input num" type="number" min="0" value={form.tax_percent} onChange={set('tax_percent')} placeholder="0" /></div>
            <div><label className="label">Discount (₹)</label><input className="input num" type="number" min="0" value={form.discount} onChange={set('discount')} placeholder="0" /></div>
          </div>
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 text-sm space-y-1">
            <Row label="Subtotal" value={fmtCurrency(totals.subtotal)} />
            {Number(form.tax_percent) > 0 && <Row label={`Tax (${form.tax_percent}%)`} value={fmtCurrency(totals.tax)} />}
            {Number(form.discount) > 0 && <Row label="Discount" value={'- ' + fmtCurrency(form.discount)} />}
            <div className="pt-1 mt-1 border-t border-slate-200"><Row label="Total" value={fmtCurrency(totals.total)} bold /></div>
          </div>

          <div><label className="label">Notes</label><textarea rows={2} className="input resize-none" value={form.notes} onChange={set('notes')} placeholder="Anything the client should know" /></div>
          <div><label className="label">Terms</label><textarea rows={2} className="input resize-none" value={form.terms} onChange={set('terms')} /></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => supabase.from('quotes').delete().eq('id', toDelete.id)}
        title="Delete quote" message={`Delete ${toDelete?.quote_number}?`} />
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-bold text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={classNames('num', bold ? 'font-bold text-slate-900 text-base' : 'text-slate-700')}>{value}</span>
    </div>
  );
}
