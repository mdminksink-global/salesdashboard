import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { CLIENT_CATEGORIES } from '../lib/utils';

const EMPTY = {
  name: '', company: '', phone: '', email: '', city: '',
  category: 'Warm Lead', address: '', notes: '',
};

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function ClientModal() {
  const { clientModal, closeClientModal, saveClient } = useData();
  const { open, editing } = clientModal;
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(editing ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, editing[k] ?? EMPTY[k]])) } : EMPTY);
  }, [open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Client name is required.'); return; }
    setSaving(true); setError('');
    const { error } = await saveClient(form, editing?.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    closeClientModal();
  };

  return (
    <Modal
      open={open}
      onClose={closeClientModal}
      title={editing ? 'Edit Client' : 'Add Client'}
      subtitle="Maintain your client directory"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={closeClientModal}>Cancel</button>
          <button type="submit" form="clientForm" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Client'}
          </button>
        </>
      }
    >
      <form id="clientForm" onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {error && (
          <div className="sm:col-span-2 text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">{error}</div>
        )}
        <Field label="Name *">
          <input className="input" value={form.name} onChange={set('name')} placeholder="Client name" />
        </Field>
        <Field label="Company">
          <input className="input" value={form.company} onChange={set('company')} placeholder="Company" />
        </Field>
        <Field label="Phone">
          <input className="input num" value={form.phone} onChange={set('phone')} placeholder="+91…" />
        </Field>
        <Field label="Email">
          <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="name@email.com" />
        </Field>
        <Field label="City">
          <input className="input" value={form.city} onChange={set('city')} placeholder="City" />
        </Field>
        <Field label="Category">
          <select className="input" value={form.category} onChange={set('category')}>
            {CLIENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <input className="input" value={form.address} onChange={set('address')} placeholder="Full address" />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea rows={2} className="input resize-none" value={form.notes} onChange={set('notes')} placeholder="Anything worth remembering" />
        </Field>
      </form>
    </Modal>
  );
}
