import { useState } from 'react';
import { PenLine, ArrowRight, TrendingUp, Users, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AUTH_ERRORS = {
  'Invalid login credentials': 'Invalid email or password.',
  'Email not confirmed': 'Please confirm your email first.',
};

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setNotice('');
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { data, error } = await signUp(email, password, fullName);
        if (error) throw error;
        if (!data.session) setNotice('Account created. Check your email to confirm, then sign in.');
      }
    } catch (err) {
      setError(AUTH_ERRORS[err.message] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700">
        <div className="absolute inset-0 opacity-70" style={{
          backgroundImage:
            'radial-gradient(ellipse 50% 40% at 15% 15%, rgba(255,255,255,0.14), transparent 60%),' +
            'radial-gradient(ellipse 55% 45% at 85% 85%, rgba(245,158,11,0.20), transparent 60%)',
        }} />
        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/15 ring-1 ring-white/25 grid place-items-center">
            <PenLine className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-white tracking-tight">MDM INKS</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-brand-100">Sales CRM</div>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Every visit,<br />every order,<br /><span className="text-accent-300">one dashboard.</span>
          </h2>
          <p className="mt-4 text-brand-100 max-w-sm leading-relaxed">
            Track field visits, follow-ups and orders for your entire sales team — in real time.
          </p>
          <div className="mt-8 flex gap-6">
            {[
              { icon: TrendingUp, label: 'Live analytics' },
              { icon: Users, label: 'Multi-rep teams' },
              { icon: Target, label: 'Follow-up alerts' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/90">
                <Icon className="h-4 w-4 text-accent-300" /> {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs font-mono text-brand-200">MDM INKS · SALES CRM v1.0</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 grid place-items-center">
              <PenLine className="h-5 w-5 text-white" />
            </div>
            <div className="text-lg font-extrabold text-slate-900">MDM INKS</div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-7">
            {mode === 'signin' ? 'Sign in to your sales dashboard' : 'Start tracking visits in minutes'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <input id="name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} />
            </div>

            {error && <div className="text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">{error}</div>}
            {notice && <div className="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-3 py-2">{notice}</div>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}
              className="text-brand-600 font-semibold hover:text-brand-700 transition-colors cursor-pointer"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
