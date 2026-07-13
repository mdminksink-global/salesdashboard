import { useState } from 'react';
import { Sparkles, MessageCircle, Copy, Check, Loader2, Info } from 'lucide-react';
import { runAI, clientContext } from '../lib/ai';

function waDigits(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10) return '91' + d;
  if (d.startsWith('0') && d.length === 11) return '91' + d.slice(1);
  return d;
}

export default function AIAssist({ client, visits }) {
  const [busy, setBusy] = useState('');           // '' | 'summary' | 'draft'
  const [result, setResult] = useState(null);     // { kind, text }
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = async (kind, task) => {
    setBusy(kind); setError(null); setResult(null); setCopied(false);
    try {
      const text = await runAI(task, clientContext(client, visits));
      setResult({ kind, text });
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  };

  const copy = () => { navigator.clipboard?.writeText(result.text); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const wa = waDigits(client.phone);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 grid place-items-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">AI Assist</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Groq</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost btn-sm" onClick={() => run('summary', 'client_summary')} disabled={!!busy}>
          {busy === 'summary' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Summarize relationship
        </button>
        <button className="btn-ghost btn-sm" onClick={() => run('draft', 'draft_message')} disabled={!!busy}>
          {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} Draft follow-up
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-lg px-3 py-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          {error.notConfigured
            ? <span>AI isn’t set up yet. Deploy the <code className="font-mono">ai</code> function and set the free <code className="font-mono">GROQ_API_KEY</code> secret (see README).</span>
            : <span>{error.message}</span>}
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3.5">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.text}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn-ghost btn-sm" onClick={copy}>
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
            {result.kind === 'draft' && wa && (
              <a className="btn-sm btn bg-emerald-600 text-white hover:bg-emerald-700" target="_blank" rel="noopener noreferrer"
                href={`https://wa.me/${wa}?text=${encodeURIComponent(result.text)}`}>
                <MessageCircle className="h-4 w-4" /> Send on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
