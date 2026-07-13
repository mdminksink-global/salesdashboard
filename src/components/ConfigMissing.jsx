import { Database } from 'lucide-react';

export default function ConfigMissing() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card max-w-lg w-full p-8 animate-fade-in">
        <div className="h-12 w-12 rounded-xl bg-amber-100 grid place-items-center mb-4">
          <Database className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Connect Supabase to continue</h1>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          Environment variables are missing. Create a <code className="text-brand-600 font-mono">.env</code> file in the
          project root (copy <code className="text-brand-600 font-mono">.env.example</code>) and add your Supabase
          credentials:
        </p>
        <pre className="text-[12px] bg-slate-50 border border-slate-200 rounded-xl p-4 num text-slate-700 overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}
        </pre>
        <p className="text-xs text-slate-500 mt-4">
          Find both under <span className="text-slate-700 font-medium">Supabase → Project Settings → API</span>, then
          restart the dev server.
        </p>
      </div>
    </div>
  );
}
