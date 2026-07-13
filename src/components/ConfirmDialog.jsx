import { useState } from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Confirm delete'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-danger" onClick={run} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-xl bg-rose-100 grid place-items-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed pt-1.5">{message || 'This action cannot be undone.'}</p>
      </div>
    </Modal>
  );
}
