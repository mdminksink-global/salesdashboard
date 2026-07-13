import { useEffect, useState } from 'react';
import Modal from './Modal';
import VoiceButton from './VoiceButton';
import ClientCombobox from './ClientCombobox';
import { useData } from '../context/DataContext';
import { VISIT_STATUSES, todayISO } from '../lib/utils';

const EMPTY = {
  visit_date: todayISO(),
  client_name: '', company: '', phone: '', email: '', address: '',
  visit_status: 'Visited', requirement: '',
  next_visit_date: '', next_visit_time: '',
  follow_up_done: false, order_received: false,
  order_value: '', fulfill_date: '', invoice_no: '', doc_attached: false,
  remarks: '',
};

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

// Open the native date/time picker when tapping anywhere on the field
// (desktop normally only opens it from the small icon; mobile is native anyway).
const openPicker = (e) => { try { e.currentTarget.showPicker?.(); } catch { /* unsupported / already open */ } };

export default function VisitModal() {
  const { visitModal, closeVisitModal, saveVisit, clients } = useData();
  const { open, editing } = visitModal;
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editing) {
      setForm({
        ...EMPTY,
        ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, editing[k] ?? EMPTY[k]])),
      });
    } else {
      setForm({ ...EMPTY, visit_date: todayISO() });
    }
  }, [open, editing]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const appendVoice = (k) => (text) =>
    setForm((f) => ({ ...f, [k]: (f[k] ? f[k].trim() + ' ' : '') + text }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) { setError('Client name is required.'); return; }
    setSaving(true); setError('');
    const payload = {
      ...form,
      order_value: form.order_received && form.order_value !== '' ? Number(form.order_value) : null,
      next_visit_date: form.next_visit_date || null,
      fulfill_date: form.fulfill_date || null,
    };
    const { error } = await saveVisit(payload, editing?.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    closeVisitModal();
  };

  const pickClient = (c) => setForm((f) => ({
    ...f,
    client_name: c.name || '',
    company: c.company || '',
    phone: c.phone || '',
    email: c.email || '',
    address: c.address || '',
  }));

  return (
    <Modal
      open={open}
      onClose={closeVisitModal}
      wide
      title={editing ? 'Edit Visit' : 'Add Client Visit'}
      subtitle="Log the details of a sales visit"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={closeVisitModal}>Cancel</button>
          <button type="submit" form="visitForm" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Visit'}
          </button>
        </>
      }
    >
      <form id="visitForm" onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Visit Date">
            <input type="date" className="input" value={form.visit_date} onChange={set('visit_date')} onClick={openPicker} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.visit_status} onChange={set('visit_status')}>
              {VISIT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Client Name *">
            <ClientCombobox
              value={form.client_name}
              clients={clients}
              placeholder="Search saved clients or type a new name…"
              onChange={(v) => setForm((f) => ({ ...f, client_name: v }))}
              onSelect={pickClient}
            />
          </Field>
          <Field label="Company">
            <input className="input" value={form.company} onChange={set('company')} placeholder="Company name" />
          </Field>
          <Field label="Phone">
            <input className="input num" value={form.phone} onChange={set('phone')} placeholder="+91…" />
          </Field>
          <Field label="Email">
            <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="name@email.com" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input className="input" value={form.address} onChange={set('address')} placeholder="Street, City" />
          </Field>
          <Field label="Requirement / Notes" className="sm:col-span-2">
            <div className="relative">
              <textarea rows={2} className="input resize-none pr-11" value={form.requirement} onChange={set('requirement')} placeholder="What does the client need? (or tap the mic)" />
              <div className="absolute top-2 right-2"><VoiceButton onAppend={appendVoice('requirement')} title="Dictate requirement" /></div>
            </div>
          </Field>
          <Field label="Next Visit Date">
            <input type="date" className="input" value={form.next_visit_date} onChange={set('next_visit_date')} onClick={openPicker} />
          </Field>
          <Field label="Next Visit Time">
            <input type="time" className="input" value={form.next_visit_time} onChange={set('next_visit_time')} onClick={openPicker} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-brand-500 h-4 w-4" checked={form.follow_up_done} onChange={set('follow_up_done')} />
            Follow-up done
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-emerald-500 h-4 w-4" checked={form.order_received} onChange={set('order_received')} />
            Order received
          </label>
        </div>

        {form.order_received && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4 animate-fade-in">
            <Field label="Order Value (₹)">
              <input type="number" min="0" className="input num" value={form.order_value} onChange={set('order_value')} placeholder="0" />
            </Field>
            <Field label="Fulfillment Date">
              <input type="date" className="input" value={form.fulfill_date} onChange={set('fulfill_date')} onClick={openPicker} />
            </Field>
            <Field label="Invoice No.">
              <input className="input num" value={form.invoice_no} onChange={set('invoice_no')} placeholder="INV-001" />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer self-end pb-2.5">
              <input type="checkbox" className="accent-emerald-500 h-4 w-4" checked={form.doc_attached} onChange={set('doc_attached')} />
              Document attached
            </label>
          </div>
        )}

        <Field label="Remarks">
          <div className="relative">
            <textarea rows={2} className="input resize-none pr-11" value={form.remarks} onChange={set('remarks')} placeholder="Any extra notes (or tap the mic)" />
            <div className="absolute top-2 right-2"><VoiceButton onAppend={appendVoice('remarks')} title="Dictate remarks" /></div>
          </div>
        </Field>
      </form>
    </Modal>
  );
}
