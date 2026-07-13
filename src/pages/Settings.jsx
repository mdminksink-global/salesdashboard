import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Target, User, LogOut, Save, CheckCircle2, Bell, BellOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { initials } from '../lib/utils';
import { pushSupported, isPushEnabled, enablePush, disablePush } from '../lib/push';

export default function Settings() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const period = format(new Date(), 'yyyy-MM');
  const [visitGoal, setVisitGoal] = useState('');
  const [revenueGoal, setRevenueGoal] = useState('');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => { if (pushSupported()) isPushEnabled().then(setPushOn); }, []);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    supabase.from('targets').select('*').eq('owner_id', user.id).eq('period', period).maybeSingle()
      .then(({ data }) => {
        if (data) { setVisitGoal(data.visit_goal ?? ''); setRevenueGoal(data.revenue_goal ?? ''); }
      });
  }, [user.id, period, profile]);

  const flash = (msg) => { setSaved(msg); setTimeout(() => setSaved(''), 2500); };

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) { await disablePush(); setPushOn(false); flash('Notifications turned off'); }
      else { await enablePush(user.id); setPushOn(true); flash('Notifications enabled'); }
    } catch (err) { flash(err.message); }
    setPushBusy(false);
  };

  const saveProfile = async () => {
    setBusy(true);
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    setBusy(false);
    flash('Profile saved');
  };

  const saveTarget = async () => {
    setBusy(true);
    await supabase.from('targets').upsert(
      { owner_id: user.id, period, visit_goal: Number(visitGoal) || 0, revenue_goal: Number(revenueGoal) || 0 },
      { onConflict: 'owner_id,period' }
    );
    setBusy(false);
    flash('Target saved');
  };

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4" /> {saved}
        </div>
      )}

      {/* Profile */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-brand-600" /> <h3 className="text-sm font-bold text-slate-900">Profile</h3>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-lg font-bold text-white">{initials(fullName || user.email)}</div>
          <div>
            <div className="text-sm text-slate-500">{user.email}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-700 mt-0.5">{isAdmin ? 'Administrator' : 'Sales Rep'}</div>
          </div>
        </div>
        <label className="label">Full name</label>
        <div className="flex gap-2">
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <button className="btn-primary shrink-0" onClick={saveProfile} disabled={busy}><Save className="h-4 w-4" /> Save</button>
        </div>
      </div>

      {/* Monthly target */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-accent-600" /> <h3 className="text-sm font-bold text-slate-900">This Month's Target</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Set your goals for {format(new Date(), 'MMMM yyyy')}. Progress shows on your dashboard.</p>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Visits goal</label><input type="number" min="0" className="input num" value={visitGoal} onChange={(e) => setVisitGoal(e.target.value)} placeholder="e.g. 60" /></div>
          <div><label className="label">Revenue goal (₹)</label><input type="number" min="0" className="input num" value={revenueGoal} onChange={(e) => setRevenueGoal(e.target.value)} placeholder="e.g. 500000" /></div>
        </div>
        <button className="btn-primary mt-4" onClick={saveTarget} disabled={busy}><Save className="h-4 w-4" /> Save target</button>
      </div>

      {/* Notifications */}
      {pushSupported() && (
        <div className="card p-5 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0">
              {pushOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Push Notifications</h3>
              <p className="text-xs text-slate-500">Get alerts for follow-ups due today, on this device.</p>
            </div>
          </div>
          <button className={pushOn ? 'btn-ghost btn-sm shrink-0' : 'btn-primary btn-sm shrink-0'} onClick={togglePush} disabled={pushBusy}>
            {pushBusy ? '…' : pushOn ? 'Turn off' : 'Enable'}
          </button>
        </div>
      )}

      {/* Account */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Sign out</h3>
          <p className="text-xs text-slate-500">End your session on this device.</p>
        </div>
        <button className="btn-danger btn-sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </div>
  );
}
