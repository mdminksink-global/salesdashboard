import { useEffect, useRef, useState } from 'react';
import { ChevronDown, UserPlus } from 'lucide-react';
import { initials } from '../lib/utils';

/**
 * Client picker: click to browse saved clients, type to filter, select to
 * auto-fill; free text is kept as a new client name.
 *
 * Props:
 *   value     — current text (client name)
 *   onChange  — (text) => void          typing / manual entry
 *   onSelect  — (client) => void        a saved client was chosen
 *   clients   — array of client records
 */
export default function ClientCombobox({ value, onChange, onSelect, clients = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = (value || '').toLowerCase().trim();
  const matches = clients
    .filter((c) => !q || [c.name, c.company, c.phone, c.city].some((f) => (f || '').toLowerCase().includes(q)))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const exact = clients.some((c) => (c.name || '').toLowerCase() === q);

  return (
    <div className="relative" ref={wrapRef}>
      <input
        className="input pr-9"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
        aria-label="Show clients"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto rounded-xl bg-white border border-slate-200 shadow-card py-1">
          {matches.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-slate-400">
              {clients.length === 0 ? 'No saved clients yet — just type a name.' : 'No match — type to use a new name.'}
            </div>
          ) : (
            matches.slice(0, 50).map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 cursor-pointer"
              >
                <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-[10px] font-bold text-white shrink-0">
                  {initials(c.name)}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 truncate">{c.name}</span>
                  <span className="block text-xs text-slate-500 truncate">{[c.company, c.phone].filter(Boolean).join(' · ') || '—'}</span>
                </span>
              </button>
            ))
          )}
          {q && !exact && (
            <div className="border-t border-slate-100 mt-1 px-3 py-2 text-xs text-slate-500 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-brand-500" /> Using “{value}” as a new client
            </div>
          )}
        </div>
      )}
    </div>
  );
}
